from datetime import datetime
from pydantic import BaseModel


class SettingResponse(BaseModel):
    key: str
    value: str | None
    setting_type: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str | None


class BulkSettingsUpdate(BaseModel):
    settings: dict[str, str | None]


class SettingsResponse(BaseModel):
    company_name: str = ""
    slogan: str = ""
    nit: str = ""
    regime: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    footer: str = ""
    invoice_prefix: str = "001"
    invoice_consecutive: int = 1
    logo_path: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_tls: bool = True
