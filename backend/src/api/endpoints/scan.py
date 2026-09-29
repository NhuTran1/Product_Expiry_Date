from datetime import date, datetime, time

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.src.database.db import get_db
from backend.src.database.models import ScanResult
from backend.src.schemas.scan_schema import CorrectScanRequest
from backend.src.services.scan_service import (
    calculate_image_file_hash,
    calculate_roi_phash,
    process_uploaded_image,
    build_response,
)
from backend.src.core.config import settings

router = APIRouter()


def _parse_date_filter(value: str | None, field_name: str) -> date | None:
    if not value:
        return None

    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must use YYYY-MM-DD format",
        )


def _apply_created_at_filter(query, start_date: str | None, end_date: str | None):
    start = _parse_date_filter(start_date, "start_date")
    end = _parse_date_filter(end_date, "end_date")

    if start and end and start > end:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    if start:
        query = query.filter(ScanResult.created_at >= datetime.combine(start, time.min))
    if end:
        query = query.filter(ScanResult.created_at <= datetime.combine(end, time.max))

    return query


def determine_status_from_date(date_str: str, near_days: int = 30):
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


@router.post("/scan")
async def scan_image(
    file: UploadFile = File(...),
    source_type: str = Query("upload"),
    db: Session = Depends(get_db),
):
    return await process_uploaded_image(file=file, db=db, source_type=source_type)


@router.get("/scans")
def get_scans(
    status: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(ScanResult)
    query = _apply_created_at_filter(query, start_date, end_date)

    if status:
        query = query.filter(ScanResult.status == status)

    records = query.order_by(ScanResult.id.desc()).limit(limit).all()
    return [build_response(r) for r in records]


@router.get("/scans/review")
def get_review_scans(db: Session = Depends(get_db)):
    records = (
        db.query(ScanResult)
        .filter(ScanResult.needs_review == True)
        .order_by(ScanResult.id.desc())
        .all()
    )
    return [build_response(r) for r in records]


@router.get("/scans/near-expiry")
def get_near_expiry_scans(db: Session = Depends(get_db)):
    records = (
        db.query(ScanResult)
        .filter(ScanResult.status == "near_expiry")
        .order_by(ScanResult.parsed_date.asc())
        .all()
    )
    return [build_response(r) for r in records]


@router.get("/scans/{scan_id}")
def get_scan_detail(scan_id: int, db: Session = Depends(get_db)):
    record = db.query(ScanResult).filter(ScanResult.id == scan_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Scan result not found")

    return build_response(record)


@router.put("/scans/{scan_id}/correct")
def correct_scan_result(
    scan_id: int,
    payload: CorrectScanRequest,
    db: Session = Depends(get_db),
):
    record = db.query(ScanResult).filter(ScanResult.id == scan_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Scan result not found")

    new_status, days_remaining = determine_status_from_date(
        payload.corrected_date,
        settings.near_expiry_days,
    )

    record.corrected_date = payload.corrected_date
    record.parsed_date = payload.corrected_date
    record.status = new_status
    record.days_remaining = days_remaining
    record.needs_review = False
    record.is_corrected = True
    record.review_note = payload.review_note
    record.parser_confidence = 1.0
    record.final_confidence = 1.0
    if not record.file_hash and record.original_image_path:
        record.file_hash = calculate_image_file_hash(record.original_image_path)
    if not record.roi_phash and record.roi_path:
        record.roi_phash = calculate_roi_phash(record.roi_path)

    db.commit()
    db.refresh(record)

    return build_response(record)


@router.get("/stats")
def get_stats(
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
):
    base_query = _apply_created_at_filter(db.query(ScanResult), start_date, end_date)
    total = base_query.with_entities(func.count(ScanResult.id)).scalar() or 0

    def count_status(status: str):
        return (
            base_query.with_entities(func.count(ScanResult.id))
            .filter(ScanResult.status == status)
            .scalar()
            or 0
        )

    return {
        "total": total,
        "valid": count_status("valid"),
        "near_expiry": count_status("near_expiry"),
        "expired": count_status("expired"),
        "needs_review": count_status("needs_review"),
    }
