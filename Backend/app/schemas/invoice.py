from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class InvoiceSchema(BaseModel):
    id: str
    file_name: str = Field(alias="fileName")
    received: datetime
    user: str
    source: str
    status: str
    preview_url: Optional[str] = Field(default=None, alias="previewUrl")
    file_type: str = Field(alias="fileType")
    document_type: Optional[str] = Field(default="Tax Invoice", alias="documentType")
    confidence_score: Optional[float] = Field(default=100.0, alias="confidenceScore")
    client_name: Optional[str] = Field(default=None, alias="clientName")
    client_code: Optional[str] = Field(default=None, alias="clientCode")
    blob_path: Optional[str] = Field(default=None, alias="blobPath")
    blob_url: Optional[str] = Field(default=None, alias="blobUrl")

    # from_attributes=True allows Pydantic to read directly from your SQLAlchemy model
    # populate_by_name=True allows you to use either snake_case or camelCase
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)