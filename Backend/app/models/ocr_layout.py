import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, JSON, Float, Boolean
from app.db.database import Base

class OCRDocument(Base):
    __tablename__ = "ocr_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    invoice_id = Column(String, nullable=True, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False, default="application/pdf")
    file_size = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=False, default=1)
    status = Column(String, nullable=False, default="completed")  # "processing", "completed", "failed"
    error_message = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)
    
    # --- Updated Classification Fields ---
    document_type = Column(String, nullable=True, default="Tax Invoice")
    transaction_direction = Column(String, nullable=True, index=True) 
    confidence_score = Column(Float, nullable=True, default=100.0)
    classification_reasoning = Column(Text, nullable=True)
    
    # --- New GST Specific Fields ---
    is_valid_gst_document = Column(Boolean, nullable=False, default=False)
    extracted_gstins = Column(JSON, nullable=True) 
    
    # --- Data Payloads ---
    layout_data = Column(JSON, nullable=True)
    extracted_fields = Column(JSON, nullable=True)
    
    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)