from sqlalchemy import Column, String, DateTime, Float
from app.db.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    received = Column(DateTime, nullable=False)
    user = Column(String, nullable=False)
    source = Column(String, nullable=False)
    status = Column(String, nullable=False)
    preview_url = Column(String, nullable=True)
    file_type = Column(String, nullable=False)
    document_type = Column(String, nullable=True, default="Tax Invoice")
    confidence_score = Column(Float, nullable=True, default=100.0)
    client_name = Column(String, nullable=True)
    client_code = Column(String, nullable=True)
    blob_path = Column(String, nullable=True)
    blob_url = Column(String, nullable=True)