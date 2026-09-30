from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceSchema
from app.services.classifier_service import normalize_document_type


def get_invoice_by_id(db: Session, invoice_id: str) -> Optional[Invoice]:
    return db.query(Invoice).filter(Invoice.id == invoice_id).first()


def get_invoices(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    source: Optional[str] = None,
    user: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    client_code: Optional[str] = None,
    client_name: Optional[str] = None,
) -> List[Invoice]:
    query = db.query(Invoice)

    if status and status != "All statuses" and status.lower() != "all":
        query = query.filter(Invoice.status == status)

    if source and source != "All sources" and source.lower() != "all":
        query = query.filter(Invoice.source == source)

    if user and user != "All users" and user.lower() != "all":
        query = query.filter(Invoice.user == user)

    if date_from:
        query = query.filter(Invoice.received >= date_from)

    if date_to:
        query = query.filter(Invoice.received <= date_to)

    if client_code:
        query = query.filter(
            or_(
                Invoice.client_code == client_code,
                Invoice.id.ilike(f"{client_code}-%"),
                Invoice.client_code.is_(None),
            )
        )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.id.ilike(search_pattern),
                Invoice.file_name.ilike(search_pattern),
                Invoice.document_type.ilike(search_pattern),
            )
        )

    return query.order_by(desc(Invoice.received)).offset(skip).limit(limit).all()


def count_invoices(
    db: Session,
    status: Optional[str] = None,
    source: Optional[str] = None,
    user: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    client_code: Optional[str] = None,
    client_name: Optional[str] = None,
) -> int:
    query = db.query(Invoice)

    if status and status != "All statuses" and status.lower() != "all":
        query = query.filter(Invoice.status == status)

    if source and source != "All sources" and source.lower() != "all":
        query = query.filter(Invoice.source == source)

    if user and user != "All users" and user.lower() != "all":
        query = query.filter(Invoice.user == user)

    if date_from:
        query = query.filter(Invoice.received >= date_from)

    if date_to:
        query = query.filter(Invoice.received <= date_to)

    if client_code:
        query = query.filter(
            or_(
                Invoice.client_code == client_code,
                Invoice.id.ilike(f"{client_code}-%"),
                Invoice.client_code.is_(None),
            )
        )

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.id.ilike(search_pattern),
                Invoice.file_name.ilike(search_pattern),
                Invoice.document_type.ilike(search_pattern),
            )
        )

    return query.count()


def create_invoice(db: Session, invoice_data: InvoiceSchema) -> Invoice:
    doc_type = normalize_document_type(invoice_data.document_type) if invoice_data.document_type else "Tax Invoice"
    conf_val = float(invoice_data.confidence_score) if invoice_data.confidence_score is not None else 0.0
    db_invoice = Invoice(
        id=invoice_data.id,
        file_name=invoice_data.file_name,
        received=invoice_data.received,
        user=invoice_data.user,
        source=invoice_data.source,
        status=invoice_data.status,
        preview_url=invoice_data.preview_url,
        file_type=invoice_data.file_type,
        document_type=doc_type,
        confidence_score=100.0 if conf_val >= 100.0 else 0.0,
        client_name=invoice_data.client_name,
        client_code=invoice_data.client_code,
        blob_path=invoice_data.blob_path,
        blob_url=invoice_data.blob_url,
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice


def update_invoice_status(db: Session, invoice_id: str, new_status: str) -> Optional[Invoice]:
    invoice = get_invoice_by_id(db, invoice_id)
    if not invoice:
        return None
    invoice.status = new_status
    db.commit()
    db.refresh(invoice)
    return invoice


def delete_invoice(db: Session, invoice_id: str) -> bool:
    invoice = get_invoice_by_id(db, invoice_id)
    if not invoice:
        return False
    db.delete(invoice)
    db.commit()
    return True