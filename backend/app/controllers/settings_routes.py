import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.settings import BulkSettingsUpdate, SettingsResponse
from app.services.settings_service import SettingsService
from app.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    service = SettingsService(db)
    data = service.get_all()
    return SettingsResponse(
        company_name=data.get("company_name", ""),
        slogan=data.get("slogan", ""),
        nit=data.get("nit", ""),
        regime=data.get("regime", ""),
        address=data.get("address", ""),
        phone=data.get("phone", ""),
        email=data.get("email", ""),
        footer=data.get("footer", ""),
        invoice_prefix=data.get("invoice_prefix", "001"),
        invoice_consecutive=int(data.get("invoice_consecutive", "1")),
        logo_path=data.get("logo_path", ""),
        smtp_host=data.get("smtp_host", ""),
        smtp_port=int(data.get("smtp_port", "587")),
        smtp_user=data.get("smtp_user", ""),
        smtp_password=data.get("smtp_password", "") if data.get("smtp_password") else "",
        smtp_from=data.get("smtp_from", ""),
        smtp_use_tls=data.get("smtp_use_tls", "true") == "true",
    )


@router.put("/")
def update_settings(data: BulkSettingsUpdate, db: Session = Depends(get_db)):
    service = SettingsService(db)
    filtered = {k: v for k, v in data.settings.items() if k != "smtp_password" or v}
    service.update_many(filtered)
    return {"message": "Configuración actualizada"}


@router.get("/logo")
def get_logo(db: Session = Depends(get_db)):
    service = SettingsService(db)
    logo_path = service.get("logo_path")
    if not logo_path or not os.path.exists(logo_path):
        default = os.path.join(settings.DATA_DIR, "logos", "logo.png")
        if os.path.exists(default):
            logo_path = default
    if not logo_path or not os.path.exists(logo_path):
        raise HTTPException(status_code=404, detail="Logo no encontrado")
    return FileResponse(logo_path, media_type="image/png")


@router.post("/logo")
async def upload_logo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    logo_dir = settings.LOGO_DIR
    os.makedirs(logo_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "logo.png")[1]
    logo_path = os.path.join(logo_dir, f"logo{ext}")

    with open(logo_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    service = SettingsService(db)
    service.update("logo_path", logo_path)

    return {"message": "Logo actualizado", "path": logo_path}
