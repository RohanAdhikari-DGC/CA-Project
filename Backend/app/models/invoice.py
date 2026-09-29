from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Invoice(Base):
    __tablename__ = "invoices"

    # Fixed: changed 'primary key' to 'primary_key'
    id = Column(String, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    received = Column(DateTime, nullable=False)
    user = Column(String, nullable=False)
    source = Column(String, nullable=False)
    status = Column(String, nullable=False)
    preview_url = Column(String, nullable=True)
    file_type = Column(String, nullable=False)