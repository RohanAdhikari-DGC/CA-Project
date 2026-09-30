from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float
    polygon: Optional[List[List[float]]] = None

    model_config = ConfigDict(from_attributes=True)

class OCRWord(BaseModel):
    text: str
    confidence: float = 1.0
    bbox: BoundingBox

    model_config = ConfigDict(from_attributes=True)

class OCRLine(BaseModel):
    text: str
    confidence: float = 1.0
    bbox: BoundingBox
    words: List[OCRWord] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class LayoutBlock(BaseModel):
    id: str
    type: str  # "header", "paragraph", "table", "key_value", "footer", "meta"
    text: str
    bbox: BoundingBox
    confidence: float = 1.0
    lines: List[OCRLine] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class TableCell(BaseModel):
    row: int
    col: int
    text: str
    bbox: Optional[BoundingBox] = None

    model_config = ConfigDict(from_attributes=True)

class TableLayout(BaseModel):
    table_id: str
    bbox: Optional[BoundingBox] = None
    rows_count: int = 0
    cols_count: int = 0
    headers: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class KeyValuePair(BaseModel):
    key: str
    value: str
    confidence: float = 1.0
    key_bbox: Optional[BoundingBox] = None
    value_bbox: Optional[BoundingBox] = None

    model_config = ConfigDict(from_attributes=True)

class PageLayout(BaseModel):
    page_number: int
    width: float
    height: float
    has_digital_text: bool = True
    ocr_applied: bool = False
    text: str = ""
    blocks: List[LayoutBlock] = Field(default_factory=list)
    tables: List[TableLayout] = Field(default_factory=list)
    words: List[OCRWord] = Field(default_factory=list)
    key_values: List[KeyValuePair] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class ExtractedInvoiceFields(BaseModel):
    document_type: Optional[str] = "Tax Invoice"
    
    # --- NEW GST CLASSIFICATION FIELDS ---
    transaction_direction: Optional[str] = None
    is_valid_gst_document: Optional[bool] = False
    extracted_gstins: List[str] = Field(default_factory=list)
    # -------------------------------------
    
    confidence_score: Optional[float] = 0.0
    document_type_confidence: Optional[float] = 0.0
    document_type_reason: Optional[str] = None
    invoice_number: Optional[str] = None
    original_invoice_number: Optional[str] = None
    po_number: Optional[str] = None
    place_of_supply: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    bank_details: Optional[Dict[str, Any]] = None
    field_confidences: Dict[str, float] = Field(default_factory=dict)
    line_items: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class OCRLayoutResponse(BaseModel):
    id: Optional[str] = None
    invoice_id: Optional[str] = None
    file_name: str
    file_type: str
    page_count: int
    status: str = "completed"
    raw_text: str = ""
    
    document_type: Optional[str] = "Tax Invoice"
    
    # --- NEW GST CLASSIFICATION FIELDS ---
    transaction_direction: Optional[str] = None
    is_valid_gst_document: Optional[bool] = False
    extracted_gstins: List[str] = Field(default_factory=list)
    classification_reasoning: Optional[str] = None
    # -------------------------------------
    
    confidence_score: Optional[float] = 0.0
    pages: List[PageLayout] = Field(default_factory=list)
    extracted_fields: ExtractedInvoiceFields = Field(default_factory=ExtractedInvoiceFields)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class OCRLayoutListItem(BaseModel):
    id: str
    invoice_id: Optional[str] = None
    file_name: str
    file_type: str
    page_count: int
    status: str
    document_type: Optional[str] = "Tax Invoice"
    
    # --- NEW GST CLASSIFICATION FIELDS ---
    transaction_direction: Optional[str] = None
    is_valid_gst_document: Optional[bool] = False
    # -------------------------------------
    
    confidence_score: Optional[float] = 100.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentClassificationRequest(BaseModel):
    text: Optional[str] = ""
    file_name: Optional[str] = ""

class DocumentClassificationResponse(BaseModel):
    document_type: str
    
    # --- NEW GST CLASSIFICATION FIELDS ---
    transaction_direction: str
    is_valid_gst_document: bool = False
    extracted_gstins: List[str] = Field(default_factory=list)
    # -------------------------------------
    
    confidence_score: float = 100.0
    confidence: float = 100.0
    reason: str
    available_types: List[str]