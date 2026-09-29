from sqlalchemy.orm import Session
from ..models import Invoice
from ..schemas import InvoiceSchema

def get_invoice_by_id(db: Session, invoice_id: str):
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()

def get_invoices(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Invoice).offset(skip).limit(limit).all()

def create_invoice(db: Session, invoice_data: InvoiceSchema):
    db_invoice = Invoice(
        id=invoice_data.id,
        file_name=invoice_data.file_name,
        received=invoice_data.received,
        user=invoice_data.user,
        source=invoice_data.source,
        status=invoice_data.status,
        preview_url=invoice_data.preview_url,
        file_type=invoice_data.file_type
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice