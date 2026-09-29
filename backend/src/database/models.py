from sqlalchemy import Integer, String, Text, Float, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from backend.src.database.db import Base


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Source
    source_type: Mapped[str] = mapped_column(String(30), default="upload")

    # Image paths
    original_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    prediction_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    roi_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_roi_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Hash
    file_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    roi_phash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    phash_distance: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Reuse / suggestion
    reuse_type: Mapped[str] = mapped_column(String(50), default="none")
    reuse_from_scan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    suggested_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    suggested_status: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Detection
    bbox: Mapped[str | None] = mapped_column(Text, nullable=True)
    expanded_bbox: Mapped[str | None] = mapped_column(Text, nullable=True)
    detection_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # OCR / Parser
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    parsed_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    detected_format: Mapped[str | None] = mapped_column(String(50), nullable=True)
    parser_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Final result
    status: Mapped[str] = mapped_column(String(30), default="needs_review")
    days_remaining: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=True)

    # Debug
    warnings: Mapped[str | None] = mapped_column(Text, nullable=True)
    candidate_results: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Admin correction
    is_corrected: Mapped[bool] = mapped_column(Boolean, default=False)
    corrected_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Time
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())