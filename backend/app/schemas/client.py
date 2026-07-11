from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    document_type: str = Field(default="CC", max_length=10)
    document_number: str = Field(..., min_length=1, max_length=20)
    address: str = Field(default="", max_length=300)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=200)


class ClientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    document_type: str | None = Field(default=None, max_length=10)
    document_number: str | None = Field(default=None, min_length=1, max_length=20)
    address: str | None = Field(default=None, max_length=300)
    phone: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class ClientResponse(BaseModel):
    id: int
    name: str
    document_type: str
    document_number: str
    address: str
    phone: str | None
    email: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ClientBrief(BaseModel):
    id: int
    name: str
    document_type: str
    document_number: str

    model_config = {"from_attributes": True}
