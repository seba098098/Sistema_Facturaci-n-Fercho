from datetime import datetime
from pydantic import BaseModel, Field


class InvoiceItemCreate(BaseModel):
    quantity: int = Field(..., ge=1)
    description: str = Field(..., min_length=1, max_length=500)
    unit_price: float = Field(..., gt=0)


class InvoiceItemResponse(BaseModel):
    id: int
    quantity: int
    description: str
    unit_price: float
    total: float

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    client_id: int | None = None
    client_document: str | None = None
    client_name: str | None = None
    client_document_type: str = "CC"
    client_address: str = ""
    client_phone: str | None = None
    client_email: str | None = None
    discount: float = Field(default=0, ge=0)
    payment_method: str = Field(..., min_length=1)
    cash_amount: float | None = None
    items: list[InvoiceItemCreate] = Field(..., min_length=1)


class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str = ""
    client_document: str = ""
    subtotal: float
    discount: float
    total: float
    payment_method: str
    cash_amount: float | None
    change_amount: float | None
    pdf_path: str | None
    png_path: str | None
    email_sent: bool
    email_sent_at: datetime | None
    email_error: str | None
    created_at: datetime
    items: list[InvoiceItemResponse] = []

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    id: int
    invoice_number: str
    client_name: str = ""
    client_document: str = ""
    total: float
    payment_method: str
    email_sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceQuery(BaseModel):
    search: str | None = None
    client_id: int | None = None
    document: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
