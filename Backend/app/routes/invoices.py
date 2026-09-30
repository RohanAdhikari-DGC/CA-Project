from datetime import datetime, timezone
import io
import mimetypes
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.services import invoice_service as service
from app.services import ocr_service
from app.services import blob_service
from app.schemas.invoice import InvoiceSchema
from app.db.database import get_db

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"]
)

SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".webp"}

CLIENT_CODE_TO_NAME = {
    "APEX": "Apex Industrial Supply",
    "NWPC": "Northwind Paper Co.",
    "NMPC": "Northwind Paper Co.",
    "MRDN": "Meridian Logistics",
}


def _validate_file(file: UploadFile):
    filename = file.filename or "unknown"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}"
        )


@router.get("/blob/status")
def check_blob_storage_status():
    """Check Azure Blob Storage configuration and connection status for storage account 'castorage'."""
    return blob_service.get_blob_storage_status()


@router.get("/", response_model=List[InvoiceSchema])
def read_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    client_code: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dt_from = None
    dt_to = None
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to:
        try:
            if len(date_to) == 10:
                dt_to = datetime.fromisoformat(f"{date_to}T23:59:59")
            else:
                dt_to = datetime.fromisoformat(date_to)
        except ValueError:
            pass

    invoices = service.get_invoices(
        db,
        skip=skip,
        limit=limit,
        status=status,
        source=source,
        user=user,
        search=search,
        date_from=dt_from,
        date_to=dt_to,
        client_code=client_code,
        client_name=client_name,
    )
    return invoices


@router.get("/count")
def get_invoices_count(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    user: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    client_code: Optional[str] = Query(None),
    client_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dt_from = None
    dt_to = None
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
        except ValueError:
            pass
    if date_to:
        try:
            if len(date_to) == 10:
                dt_to = datetime.fromisoformat(f"{date_to}T23:59:59")
            else:
                dt_to = datetime.fromisoformat(date_to)
        except ValueError:
            pass

    total = service.count_invoices(
        db,
        status=status,
        source=source,
        user=user,
        search=search,
        date_from=dt_from,
        date_to=dt_to,
        client_code=client_code,
        client_name=client_name,
    )
    return {"total": total}


@router.get("/{invoice_id}", response_model=InvoiceSchema)
def read_invoice(invoice_id: str, db: Session = Depends(get_db)):
    db_invoice = service.get_invoice_by_id(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return db_invoice


@router.get("/{invoice_id}/file")
def get_invoice_file(invoice_id: str, db: Session = Depends(get_db)):
    """
    Stream the uploaded invoice image or PDF from Azure Blob Storage (or local fallback).
    """
    db_invoice = service.get_invoice_by_id(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    blob_path = db_invoice.blob_path
    if not blob_path:
        # Reconstruct expected blob path if not explicitly saved on legacy row
        c_name = db_invoice.client_name or CLIENT_CODE_TO_NAME.get(db_invoice.client_code or "", "Default_Client")
        d_type = db_invoice.document_type or "Tax Invoice"
        blob_path = blob_service.build_blob_path(c_name, d_type, db_invoice.file_name)

    file_bytes = blob_service.download_document_bytes(blob_path)
    if not file_bytes:
        raise HTTPException(
            status_code=404,
            detail="Document file binary not found in Azure Blob Storage or local storage."
        )

    guessed_type, _ = mimetypes.guess_type(db_invoice.file_name)
    media_type = guessed_type or ("application/pdf" if db_invoice.file_type == "pdf" else "image/png")

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'inline; filename="{db_invoice.file_name}"',
            "Cache-Control": "max-age=3600",
        },
    )


@router.get("/{invoice_id}/page-image")
def get_invoice_page_image(
    invoice_id: str,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    """
    Render a specific page of an uploaded PDF (or return the image directly if it's an image) as PNG
    for the Scanned Document viewer pane.
    """
    db_invoice = service.get_invoice_by_id(db, invoice_id=invoice_id)
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    blob_path = db_invoice.blob_path
    if not blob_path:
        c_name = db_invoice.client_name or CLIENT_CODE_TO_NAME.get(db_invoice.client_code or "", "Default_Client")
        d_type = db_invoice.document_type or "Tax Invoice"
        blob_path = blob_service.build_blob_path(c_name, d_type, db_invoice.file_name)

    file_bytes = blob_service.download_document_bytes(blob_path)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Document file not found in storage.")

    is_pdf = db_invoice.file_type == "pdf" or db_invoice.file_name.lower().endswith(".pdf")
    if not is_pdf:
        guessed_type, _ = mimetypes.guess_type(db_invoice.file_name)
        return Response(content=file_bytes, media_type=guessed_type or "image/png")

    try:
        import pypdfium2
        pdf_doc = pypdfium2.PdfDocument(file_bytes)
        total_pages = len(pdf_doc)
        page_idx = min(max(0, page - 1), total_pages - 1)
        pdf_page = pdf_doc.get_page(page_idx)
        pil_img = pdf_page.render(scale=2.0).to_pil()
        buf = io.BytesIO()
        pil_img.save(buf, format="PNG")
        return Response(
            content=buf.getvalue(),
            media_type="image/png",
            headers={"X-Total-Pages": str(total_pages)},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render PDF page: {e}")


@router.post("/", response_model=InvoiceSchema)
def create_invoice(invoice: InvoiceSchema, db: Session = Depends(get_db)):
    db_invoice = service.get_invoice_by_id(db, invoice_id=invoice.id)
    if db_invoice:
        raise HTTPException(status_code=400, detail="Invoice ID already exists")
    
    return service.create_invoice(db=db, invoice_data=invoice)


@router.post("/upload", response_model=InvoiceSchema)
async def upload_invoice(
    request: Request,
    file: UploadFile = File(...),
    user: Optional[str] = Form("m.chen"),
    source: Optional[str] = Form("Manual upload"),
    status_field: Optional[str] = Form("pending_review"),
    invoice_id: Optional[str] = Form(None),
    client_code: Optional[str] = Form("APEX"),
    client_name: Optional[str] = Form(None),
    force_ocr: bool = Form(False),
    my_company_gstin: Optional[str] = Form(None),
    my_company_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Complete backend process flow for invoice upload:
    1. Validates document format
    2. Runs OCR & Layout analysis to extract text, tables, key-values, and fields
    3. Runs document classification (Tax Invoice, Debit Note, etc.) and GST compliance
    4. Uploads image/PDF to Azure Blob Storage (castorage) under <client_name>/finance/<doctype>/<filename>
    5. Persists layout and OCR extraction in database
    6. Creates linked Invoice entry in database with previewUrl & blobPath
    7. Returns saved Invoice object
    """
    _validate_file(file)
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    resolved_client_code = (client_code or "APEX").strip()
    resolved_client_name = (
        (client_name or "").strip()
        or CLIENT_CODE_TO_NAME.get(resolved_client_code.upper(), resolved_client_code)
    )

    # 1. Generate or use specified invoice ID
    if not invoice_id:
        import random
        random_num = random.randint(1000, 9999)
        invoice_id = f"{resolved_client_code}-2026-{random_num}"

    # Check if ID already exists
    existing = service.get_invoice_by_id(db, invoice_id)
    if existing:
        import random
        invoice_id = f"{resolved_client_code}-2026-{random.randint(10000, 99999)}"

    filename = file.filename or "invoice.pdf"
    content_type = file.content_type or "application/pdf"
    is_image = content_type.startswith("image/") or any(
        filename.lower().endswith(x) for x in [".png", ".jpg", ".jpeg", ".webp", ".tiff"]
    )
    file_type = "image" if is_image else "pdf"

    # 2. Extract OCR and Layout + Classify Document Type
    try:
        extraction = ocr_service.extract_document_layout(
            file_bytes=content,
            file_name=filename,
            file_type=content_type,
            force_ocr=force_ocr,
            my_company_gstin=my_company_gstin,
            my_company_name=my_company_name or resolved_client_name,
        )
        extraction.invoice_id = invoice_id

        # 3. Save extraction to database
        ocr_service.save_extraction_to_db(
            db=db,
            extraction=extraction,
            invoice_id=invoice_id,
            file_size=len(content),
        )
        doc_type = extraction.document_type or "Tax Invoice"
        raw_c = extraction.confidence_score if extraction.confidence_score is not None else 0.0
        conf = 100.0 if float(raw_c) >= 100.0 else 0.0
    except Exception as e:
        print(f"Warning: OCR extraction encountered an issue: {e}")
        doc_type = "Tax Invoice"
        conf = 0.0

    # 4. Upload image/PDF to Azure Blob Storage under <client_name>/finance/<doctype>/<filename>
    stored_filename = f"{invoice_id}_{filename}"
    blob_result = blob_service.upload_document_to_blob(
        file_bytes=content,
        client_name=resolved_client_name,
        doc_type=doc_type,
        file_name=stored_filename,
        content_type=content_type,
    )
    blob_path = blob_result.get("blob_path")
    blob_url = blob_result.get("blob_url")

    # Build backend streaming URL so preview always works in browser even for private Azure containers
    base_url = str(request.base_url).rstrip("/")
    stream_preview_url = f"{base_url}/invoices/{invoice_id}/file"
    preview_url = blob_url or stream_preview_url

    # 5. Determine initial status
    initial_status = status_field or "pending_review"

    # 6. Create invoice record
    invoice_data = InvoiceSchema(
        id=invoice_id,
        fileName=filename,
        received=datetime.now(timezone.utc),
        user=user or "Current User",
        source=source or "Manual upload",
        status=initial_status,
        previewUrl=preview_url,
        fileType=file_type,
        documentType=doc_type,
        confidenceScore=conf,
        clientName=resolved_client_name,
        clientCode=resolved_client_code,
        blobPath=blob_path,
        blobUrl=blob_url,
    )

    created_inv = service.create_invoice(db=db, invoice_data=invoice_data)
    return created_inv


@router.patch("/{invoice_id}/status", response_model=InvoiceSchema)
def update_status(
    invoice_id: str,
    status: str = Query(..., description="New invoice status"),
    db: Session = Depends(get_db)
):
    inv = service.update_invoice_status(db, invoice_id=invoice_id, new_status=status)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(invoice_id: str, db: Session = Depends(get_db)):
    deleted = service.delete_invoice(db, invoice_id=invoice_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return None