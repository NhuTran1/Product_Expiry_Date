from pathlib import Path
from typing import Any
from uuid import uuid4
import json
import hashlib
from datetime import date

from fastapi import UploadFile
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from ai_engine.pipeline.pipeline import run_pipeline
from backend.src.database.models import ScanResult
from backend.src.core.config import settings

import cv2
import numpy as np


def calculate_image_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def calculate_image_file_hash(image_path: str | None) -> str | None:
    if not image_path:
        return None
    path = Path(image_path)
    if not path.is_file():
        return None
    return calculate_image_hash(path.read_bytes())

UPLOAD_DIR = Path("uploads")
PHASH_SIZE = 32
PHASH_LOW_FREQ_SIZE = 8


def _to_json_text(value: Any) -> str | None:
    if value is None:
        return None
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return str(value)


def _safe_get(result: dict[str, Any], key: str, default=None):
    return result.get(key, default)


def calculate_roi_phash(image_path: str | None) -> str | None:
    if not image_path:
        return None

    image = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        return None

    image = cv2.resize(image, (PHASH_SIZE, PHASH_SIZE), interpolation=cv2.INTER_AREA)
    image = cv2.equalizeHist(image)
    dct = cv2.dct(np.float32(image))
    low_freq = dct[:PHASH_LOW_FREQ_SIZE, :PHASH_LOW_FREQ_SIZE]
    median = np.median(low_freq[1:, 1:])

    bits = (low_freq > median).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return f"{value:016x}"


def phash_distance(left: str | None, right: str | None) -> int | None:
    if not left or not right:
        return None
    try:
        return (int(left, 16) ^ int(right, 16)).bit_count()
    except ValueError:
        return None


def find_exact_admin_match(db: Session, file_hash: str) -> ScanResult | None:
    return (
        db.query(ScanResult)
        .filter(
            ScanResult.file_hash == file_hash,
            ScanResult.is_corrected == True,
            ScanResult.corrected_date.isnot(None),
        )
        .order_by(ScanResult.id.desc())
        .first()
    )


def find_roi_phash_admin_match(
    db: Session,
    roi_phash: str | None,
) -> tuple[ScanResult | None, int | None, str]:
    if not roi_phash:
        return None, None, "none"

    corrected_records = (
        db.query(ScanResult)
        .filter(
            ScanResult.is_corrected == True,
            ScanResult.corrected_date.isnot(None),
            ScanResult.roi_phash.isnot(None),
        )
        .all()
    )

    best_record = None
    best_distance = None
    for record in corrected_records:
        distance = phash_distance(roi_phash, record.roi_phash)
        if distance is None:
            continue
        if best_distance is None or distance < best_distance:
            best_record = record
            best_distance = distance

    if best_record is None or best_distance is None:
        return None, None, "none"
    if best_distance <= settings.phash_auto_threshold:
        return best_record, best_distance, "roi_phash_auto"
    if best_distance <= settings.phash_suggest_threshold:
        return best_record, best_distance, "roi_phash_suggest"
    return None, best_distance, "none"


def _apply_admin_date(result: dict[str, Any], matched_record: ScanResult, reuse_type: str) -> None:
    corrected_date = matched_record.corrected_date or matched_record.parsed_date
    status, days_remaining = determine_status_from_date(
        corrected_date,
        settings.near_expiry_days,
    )

    result["parsed_date"] = corrected_date
    result["status"] = status
    result["days_remaining"] = days_remaining
    result["needs_review"] = False
    result["success"] = status != "needs_review"
    result["reuse_type"] = reuse_type
    result["reuse_from_scan_id"] = matched_record.id
    result["suggested_date"] = None
    result["suggested_status"] = None
    result["final_confidence"] = 1.0
    result.setdefault("warnings", []).append(
        f"Used admin-corrected expiration date from scan #{matched_record.id}."
    )


def _apply_admin_suggestion(
    result: dict[str, Any],
    matched_record: ScanResult,
    distance: int | None,
) -> None:
    corrected_date = matched_record.corrected_date or matched_record.parsed_date
    suggested_status, _ = determine_status_from_date(
        corrected_date,
        settings.near_expiry_days,
    )

    result["reuse_type"] = "roi_phash_suggest"
    result["reuse_from_scan_id"] = matched_record.id
    result["suggested_date"] = corrected_date
    result["suggested_status"] = suggested_status
    result["phash_distance"] = distance
    result["needs_review"] = True
    result["status"] = "needs_review"
    result["success"] = False
    result.setdefault("warnings", []).append(
        f"Similar admin-corrected ROI found in scan #{matched_record.id}; review suggested date."
    )


async def process_uploaded_image(
    file: UploadFile,
    db: Session,
    source_type: str = "upload",
) -> dict[str, Any]:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix.lower()
    if extension not in [".jpg", ".jpeg", ".png"]:
        result = _error_result(Path(""), "Invalid image format.")
        record = save_scan_result(db, result, source_type)
        return build_response(record)

    file_path = UPLOAD_DIR / f"{uuid4().hex}{extension}"

    content = await file.read()
    if not content:
        result = _error_result(file_path, "Uploaded image is empty.")
        record = save_scan_result(db, result, source_type)
        return build_response(record)

    file_hash = calculate_image_hash(content)

    try:
        file_path.write_bytes(content)
    except OSError as error:
        result = _error_result(file_path, f"Could not save uploaded image: {error}")
        record = save_scan_result(db, result, source_type)
        return build_response(record)

    exact_match = find_exact_admin_match(db, file_hash)
    if exact_match:
        result = {
            "success": True,
            "image_path": str(file_path),
            "file_hash": file_hash,
            "status": "needs_review",
            "days_remaining": None,
            "parsed_date": None,
            "ocr_text": "",
            "ocr_confidence": 0.0,
            "detection_success": False,
            "detection_confidence": None,
            "bbox": None,
            "expanded_bbox": None,
            "roi_path": exact_match.roi_path,
            "processed_roi_path": exact_match.processed_roi_path,
            "roi_phash": exact_match.roi_phash,
            "phash_distance": 0,
            "candidate_results": [],
            "warnings": [],
        }
        _apply_admin_date(result, exact_match, "file_hash_exact")
        record = save_scan_result(db, result, source_type)
        return build_response(record)

    try:
        result = await run_in_threadpool(run_pipeline, str(file_path))
    except Exception as error:
        result = _error_result(file_path, f"AI pipeline failed: {error}")

    if not isinstance(result, dict):
        result = _error_result(file_path, "AI pipeline returned an invalid result.")

    result["image_path"] = result.get("image_path") or str(file_path)
    result["file_hash"] = file_hash
    result["reuse_type"] = result.get("reuse_type") or "none"

    roi_phash = calculate_roi_phash(result.get("roi_path"))
    result["roi_phash"] = roi_phash

    matched_record, distance, match_type = find_roi_phash_admin_match(db, roi_phash)
    result["phash_distance"] = distance
    if matched_record and match_type == "roi_phash_auto":
        _apply_admin_date(result, matched_record, match_type)
    elif matched_record and match_type == "roi_phash_suggest":
        _apply_admin_suggestion(result, matched_record, distance)

    record = save_scan_result(db, result, source_type)
    return build_response(record)


def save_scan_result(db: Session, result: dict[str, Any], source_type: str) -> ScanResult:
    status = _safe_get(result, "status", "needs_review")
    needs_review = bool(_safe_get(result, "needs_review", status == "needs_review"))

    record = ScanResult(
        original_image_path=_safe_get(result, "image_path"),
        prediction_image_path=_safe_get(result, "prediction_path"),
        roi_path=_safe_get(result, "roi_path"),
        processed_roi_path=_safe_get(result, "processed_roi_path"),

        source_type=source_type,
        file_hash=_safe_get(result, "file_hash"),
        roi_phash=_safe_get(result, "roi_phash"),
        phash_distance=_safe_get(result, "phash_distance"),
        reuse_type=_safe_get(result, "reuse_type", "none"),
        reuse_from_scan_id=_safe_get(result, "reuse_from_scan_id"),
        suggested_date=_safe_get(result, "suggested_date"),
        suggested_status=_safe_get(result, "suggested_status"),

        bbox=_to_json_text(_safe_get(result, "bbox")),
        expanded_bbox=_to_json_text(_safe_get(result, "expanded_bbox")),

        ocr_text=_safe_get(result, "ocr_text", ""),
        parsed_date=_safe_get(result, "parsed_date"),
        detected_format=_safe_get(result, "detected_format"),

        status=status,
        days_remaining=_safe_get(result, "days_remaining", _safe_get(result, "days_left")),

        detection_confidence=_safe_get(result, "detection_confidence"),
        ocr_confidence=_safe_get(result, "ocr_confidence"),
        parser_confidence=_safe_get(result, "parser_confidence"),
        final_confidence=_safe_get(result, "final_confidence", _safe_get(result, "confidence")),

        needs_review=needs_review,
        success=bool(_safe_get(result, "success", False)),

        warnings=_to_json_text(_safe_get(result, "warnings", [])),
        candidate_results=_to_json_text(_safe_get(result, "candidate_results", [])),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def build_response(record: ScanResult) -> dict[str, Any]:
    def parse_json(value):
        if not value:
            return None
        try:
            return json.loads(value)
        except Exception:
            return value

    return {
        "id": record.id,
        "original_image_path": record.original_image_path,
        "prediction_image_path": record.prediction_image_path,
        "roi_path": record.roi_path,
        "processed_roi_path": record.processed_roi_path,

        "source_type": record.source_type,
        "file_hash": record.file_hash,
        "roi_phash": record.roi_phash,
        "phash_distance": record.phash_distance,
        "reuse_type": record.reuse_type,
        "reuse_from_scan_id": record.reuse_from_scan_id,
        "suggested_date": record.suggested_date,
        "suggested_status": record.suggested_status,

        "bbox": parse_json(record.bbox),
        "expanded_bbox": parse_json(record.expanded_bbox),

        "ocr_text": record.ocr_text,
        "parsed_date": record.parsed_date,
        "detected_format": record.detected_format,

        "status": record.status,
        "days_remaining": record.days_remaining,

        "detection_confidence": record.detection_confidence,
        "ocr_confidence": record.ocr_confidence,
        "parser_confidence": record.parser_confidence,
        "final_confidence": record.final_confidence,

        "needs_review": record.needs_review,
        "success": record.success,

        "warnings": parse_json(record.warnings) or [],
        "candidate_results": parse_json(record.candidate_results) or [],

        "is_corrected": record.is_corrected,
        "corrected_date": record.corrected_date,
        "review_note": record.review_note,

        "created_at": str(record.created_at) if record.created_at else None,
    }


def _error_result(image_path: Path, warning: str) -> dict[str, Any]:
    return {
        "success": False,
        "image_path": str(image_path),
        "status": "needs_review",
        "days_remaining": None,
        "parsed_date": None,
        "selected_raw": None,
        "detected_format": None,
        "ocr_text": "",
        "ocr_confidence": 0.0,
        "detection_success": False,
        "detection_confidence": None,
        "bbox": None,
        "expanded_bbox": None,
        "roi_path": None,
        "processed_roi_path": None,
        "file_hash": None,
        "roi_phash": None,
        "phash_distance": None,
        "reuse_type": "none",
        "reuse_from_scan_id": None,
        "suggested_date": None,
        "suggested_status": None,
        "candidate_results": [],
        "warnings": [warning],
        "needs_review": True,
        "final_confidence": 0.0,
    }
def determine_status_from_date(date_str: str, near_days: int = 30) -> tuple[str, int | None]:
    try:
        exp_date = date.fromisoformat(date_str)
    except Exception:
        return "needs_review", None

    today = date.today()
    days_remaining = (exp_date - today).days

    if days_remaining < 0:
        return "expired", days_remaining

    if days_remaining <= near_days:
        return "near_expiry", days_remaining

    return "valid", days_remaining
