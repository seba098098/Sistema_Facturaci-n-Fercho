from sqlalchemy.orm import Session

from app.models.settings import Setting


DEFAULT_SETTINGS = {
    "company_name": "DIGITAL FERCHO'S",
    "slogan": "Dale personalidad a tu tecnología.",
    "nit": "100274039-4",
    "regime": "REGIMEN SIMPLIFICADO",
    "address": "Cra 18 No. 11A-01",
    "phone": "3043915900",
    "email": "",
    "footer": "!Gracias por su compra!\n"
              "Factura electrónica generada automáticamente\n\n"
              "Política de garantía:\n"
              "- Presentar esta factura\n"
              "- La garantía cubre solo arreglo, no cambio\n"
              "- Válida por 30 días a partir de la fecha de compra",
    "invoice_prefix": "001",
    "invoice_consecutive": "1",
    "logo_path": "",
    "smtp_host": "",
    "smtp_port": "587",
    "smtp_user": "",
    "smtp_password": "",
    "smtp_from": "",
    "smtp_use_tls": "true",
}


class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, key: str) -> str | None:
        setting = self.db.query(Setting).filter(Setting.key == key).first()
        return setting.value if setting else None

    def get_all(self) -> dict[str, str | None]:
        settings = self.db.query(Setting).all()
        return {s.key: s.value for s in settings}

    def set(self, key: str, value: str | None, setting_type: str = "string") -> None:
        setting = self.db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = value
            setting.setting_type = setting_type
        else:
            setting = Setting(key=key, value=value, setting_type=setting_type)
            self.db.add(setting)
        self.db.commit()

    def set_many(self, data: dict[str, str | None]) -> None:
        for key, value in data.items():
            self.set(key, value)
        self.db.commit()

    def initialize_defaults(self) -> None:
        for key, value in DEFAULT_SETTINGS.items():
            existing = self.db.query(Setting).filter(Setting.key == key).first()
            if not existing:
                self.db.add(Setting(key=key, value=value))
        self.db.commit()

    def increment_consecutive(self) -> str:
        prefix = self.get("invoice_prefix") or "001"
        consecutive_str = self.get("invoice_consecutive") or "1"
        consecutive = int(consecutive_str) + 1
        self.set("invoice_consecutive", str(consecutive))
        return f"{prefix}-{consecutive:06d}"
