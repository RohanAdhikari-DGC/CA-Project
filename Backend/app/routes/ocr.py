from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services import ocr_service
from app.services.classifier_service import classify_document, ALL_DOCUMENT_TYPES
from app.schemas.ocr_layout import (
    OCRLayoutResponse,
    OCRLayoutListItem,
    DocumentClassificationRequest,
    DocumentClassificationResponse,
)

router = APIRouter(
    prefix="/ocr",
    tags=["OCR & Layout Extraction"]
)

SUPPORTED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".webp"}

def _validate_file(file: UploadFile):
    filename = file.filename or "unknown"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}"
        )


@router.post("/extract", response_model=OCRLayoutResponse)
async def extract_document(
    file: UploadFile = File(...),
    force_ocr: bool = Query(False, description="Force RapidOCR on all pages even if digital text exists"),
    save_to_db: bool = Query(True, description="Persist the extraction result in the database automatically"),
    invoice_id: Optional[str] = Query(None, description="Optional invoice ID to link with"),
    # New query params for accurate GST direction classification
    my_company_gstin: Optional[str] = Query(None, description="Your company GSTIN to determine Inward/Outward direction"),
    my_company_name: Optional[str] = Query(None, description="Your company name to determine Inward/Outward direction"),
    db: Session = Depends(get_db),
):
    """
    Extract OCR bounding boxes, lines, words, layout blocks, tables, and invoice fields from a PDF or image file,
    and automatically save the result in PostgreSQL in JSON format with an auto-generated ID.
    """
    _validate_file(file)
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        # Note: You will need to ensure `ocr_service.extract_document_layout` accepts 
        # my_company_gstin and my_company_name and passes them to `classify_document` internally.
        extraction = ocr_service.extract_document_layout(
            file_bytes=content,
            file_name=file.filename or "document.pdf",
            file_type=file.content_type or "application/pdf",
            force_ocr=force_ocr,
            my_company_gstin=my_company_gstin,
            my_company_name=my_company_name
        )

        if invoice_id:
            extraction.invoice_id = invoice_id

        # Automatically save extraction in PostgreSQL database if requested
        if save_to_db:
            saved_doc = ocr_service.save_extraction_to_db(
                db=db,
                extraction=extraction,
                invoice_id=invoice_id,
                file_size=len(content),
            )
            extraction.id = saved_doc.id

        return extraction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )


@router.post("/extract-and-save", response_model=OCRLayoutResponse)
async def extract_and_save_document(
    file: UploadFile = File(...),
    invoice_id: Optional[str] = Query(None, description="Optional invoice ID to associate"),
    force_ocr: bool = Query(False, description="Force RapidOCR on all pages"),
    my_company_gstin: Optional[str] = Query(None, description="Your company GSTIN to determine Inward/Outward direction"),
    my_company_name: Optional[str] = Query(None, description="Your company name to determine Inward/Outward direction"),
    db: Session = Depends(get_db),
):
    """
    Extract OCR & layout from PDF or image and directly save to database.
    """
    _validate_file(file)
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        extraction = ocr_service.extract_document_layout(
            file_bytes=content,
            file_name=file.filename or "document.pdf",
            file_type=file.content_type or "application/pdf",
            force_ocr=force_ocr,
            my_company_gstin=my_company_gstin,
            my_company_name=my_company_name
        )
        if invoice_id:
            extraction.invoice_id = invoice_id

        saved_doc = ocr_service.save_extraction_to_db(
            db=db,
            extraction=extraction,
            invoice_id=invoice_id,
            file_size=len(content),
        )
        extraction.id = saved_doc.id
        return extraction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document processing and saving failed: {str(e)}"
        )


@router.get("/", response_model=List[OCRLayoutListItem])
def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List extracted documents with pagination."""
    docs = ocr_service.list_extractions(db, skip=skip, limit=limit)
    return docs


@router.post("/classify", response_model=DocumentClassificationResponse)
def classify_text_document(
    req: DocumentClassificationRequest,
    my_company_gstin: Optional[str] = Query(None, description="Optional GSTIN for direction logic"),
    my_company_name: Optional[str] = Query(None, description="Optional Company Name for direction logic")
):
    """
    Classify document text content or filename into standard invoice/document types,
    and determine if the document represents an Inward (Purchase) or Outward (Sales) transaction.
    """
    # The new classifier returns a dict, not a tuple
    result_dict = classify_document(
        text=req.text or "", 
        file_name=req.file_name or "",
        my_company_gstin=my_company_gstin,
        my_company_name=my_company_name
    )
    
    raw_conf = result_dict.get("confidence_score", 0.0)
    conf_val = 100.0 if (raw_conf is not None and float(raw_conf) >= 100.0) else 0.0
    return DocumentClassificationResponse(
        document_type=result_dict["document_type"],
        transaction_direction=result_dict["transaction_direction"],
        is_valid_gst_document=result_dict["is_valid_gst_document"],
        extracted_gstins=result_dict["extracted_gstins"],
        confidence_score=conf_val,
        confidence=conf_val,
        reason=result_dict["reason"],
        available_types=result_dict["available_types"],
    )


@router.get("/document-types", response_model=List[str])
def get_supported_document_types():
    """List all supported invoice and commercial document classification types."""
    return ALL_DOCUMENT_TYPES


def _doc_to_response(doc) -> OCRLayoutResponse:
    from app.schemas.ocr_layout import ExtractedInvoiceFields
    from app.services.ocr_service import _compute_field_confidences

    if doc.layout_data:
        response_data = OCRLayoutResponse(**doc.layout_data)
        response_data.id = doc.id
        response_data.invoice_id = doc.invoice_id
        response_data.document_type = doc.document_type or response_data.document_type
        raw_conf = doc.confidence_score if doc.confidence_score is not None else response_data.confidence_score
        strict_conf = 100.0 if (raw_conf is not None and float(raw_conf) >= 100.0) else 0.0
        response_data.confidence_score = strict_conf
        if doc.extracted_fields and isinstance(doc.extracted_fields, dict):
            ext_fields = ExtractedInvoiceFields(**doc.extracted_fields)
            ext_fields.confidence_score = strict_conf
            ext_fields.document_type_confidence = strict_conf
            if not ext_fields.field_confidences:
                ext_fields.field_confidences = _compute_field_confidences(ext_fields, strict_conf)
            response_data.extracted_fields = ext_fields
        response_data.transaction_direction = doc.transaction_direction
        response_data.is_valid_gst_document = doc.is_valid_gst_document
        response_data.extracted_gstins = doc.extracted_gstins or []
        response_data.classification_reasoning = doc.classification_reasoning
        response_data.created_at = doc.created_at
        response_data.updated_at = doc.updated_at
        return response_data

    raw_conf = doc.confidence_score if doc.confidence_score is not None else 0.0
    strict_conf = 100.0 if (raw_conf is not None and float(raw_conf) >= 100.0) else 0.0
    ext_fields = (
        ExtractedInvoiceFields(**doc.extracted_fields)
        if isinstance(doc.extracted_fields, dict)
        else ExtractedInvoiceFields()
    )
    ext_fields.confidence_score = strict_conf
    ext_fields.document_type_confidence = strict_conf
    if not ext_fields.field_confidences:
        ext_fields.field_confidences = _compute_field_confidences(ext_fields, strict_conf)

    return OCRLayoutResponse(
        id=doc.id,
        invoice_id=doc.invoice_id,
        file_name=doc.file_name,
        file_type=doc.file_type,
        page_count=doc.page_count,
        status=doc.status,
        raw_text=doc.raw_text or "",
        document_type=doc.document_type or "Tax Invoice",
        confidence_score=strict_conf,
        extracted_fields=ext_fields,
        transaction_direction=doc.transaction_direction,
        is_valid_gst_document=doc.is_valid_gst_document,
        extracted_gstins=doc.extracted_gstins or [],
        classification_reasoning=doc.classification_reasoning,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get("/by-invoice/{invoice_id}", response_model=OCRLayoutResponse)
def get_document_extraction_by_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve OCR extraction record associated with a specific invoice_id."""
    doc = ocr_service.get_extraction_by_invoice_id(db, invoice_id=invoice_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Extracted OCR document not found for this invoice.")
    return _doc_to_response(doc)


@router.put("/by-invoice/{invoice_id}", response_model=OCRLayoutResponse)
def update_document_extraction_by_invoice(
    invoice_id: str,
    fields_update: dict,
    db: Session = Depends(get_db),
):
    """Update extracted fields for an invoice's OCR document (from Pending Review / Correction)."""
    doc = ocr_service.update_extraction_by_invoice_id(
        db=db,
        invoice_id=invoice_id,
        extracted_fields_update=fields_update,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Extracted OCR document not found for this invoice.")
    return _doc_to_response(doc)


@router.get("/{extraction_id}", response_model=OCRLayoutResponse)
def get_document_extraction(
    extraction_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve full layout, OCR tokens, extracted fields, and GST classification for a saved document."""
    doc = ocr_service.get_extraction_by_id(db, extraction_id=extraction_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Extracted document not found.")
    return _doc_to_response(doc)


@router.delete("/{extraction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document_extraction(
    extraction_id: str,
    db: Session = Depends(get_db),
):
    """Delete an extraction record by its ID."""
    deleted = ocr_service.delete_extraction(db, extraction_id=extraction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Extracted document not found.")
    return None


@router.post("/invoice/{invoice_id}", response_model=OCRLayoutResponse)
async def extract_for_invoice(
    invoice_id: str,
    file: UploadFile = File(...),
    force_ocr: bool = Query(False),
    my_company_gstin: Optional[str] = Query(None, description="Your company GSTIN to determine Inward/Outward direction"),
    my_company_name: Optional[str] = Query(None, description="Your company name to determine Inward/Outward direction"),
    db: Session = Depends(get_db),
):
    """
    Extract OCR and layout for a specific invoice ID and save the result.
    """
    _validate_file(file)
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    extraction = ocr_service.extract_document_layout(
        file_bytes=content,
        file_name=file.filename or f"invoice_{invoice_id}.pdf",
        file_type=file.content_type or "application/pdf",
        force_ocr=force_ocr,
        my_company_gstin=my_company_gstin,
        my_company_name=my_company_name
    )
    extraction.invoice_id = invoice_id

    saved_doc = ocr_service.save_extraction_to_db(
        db=db,
        extraction=extraction,
        invoice_id=invoice_id,
        file_size=len(content),
    )
    extraction.id = saved_doc.id
    return extraction