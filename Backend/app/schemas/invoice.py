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

    # from_attributes=True allows Pydantic to read directly from your SQLAlchemy model
    # populate_by_name=True allows you to use either snake_case or camelCase
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)