from pydantic import BaseModel
from typing import Any


class CorrectScanRequest(BaseModel):
    corrected_date: str
    review_note: str | None = None


class ScanResultResponse(BaseModel):
    id: int
    original_image_path: str | None = None
    prediction_image_path: str | None = None
    roi_path: str | None = None
    processed_roi_path: str | None = None

    source_type: str
    file_hash: str | None = None
    roi_phash: str | None = None
    phash_distance: int | None = None
    reuse_type: str | None = None
    reuse_from_scan_id: int | None = None
    suggested_date: str | None = None
    suggested_status: str | None = None

    bbox: Any | None = None
    expanded_bbox: Any | None = None

    ocr_text: str | None = None
    parsed_date: str | None = None
    detected_format: str | None = None

    status: str
    days_remaining: int | None = None

    detection_confidence: float | None = None
    ocr_confidence: float | None = None
    parser_confidence: float | None = None
    final_confidence: float | None = None

    needs_review: bool
    success: bool

    warnings: Any | None = None
    candidate_results: Any | None = None

    is_corrected: bool
    corrected_date: str | None = None
    review_note: str | None = None

    created_at: str | None = None

    class Config:
        from_attributes = True
