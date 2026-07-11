import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Sistema de Facturación POS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATA_DIR: str = os.getenv("DATA_DIR", "/app/data")
    DB_PATH: str = ""
    PDF_DIR: str = ""
    PNG_DIR: str = ""
    LOGO_DIR: str = ""

    CORS_ORIGINS: list[str] = ["*"]

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = True

    def model_post_init(self, __context) -> None:
        self.DB_PATH = os.path.join(self.DATA_DIR, "facturacion.db")
        self.PDF_DIR = os.path.join(self.DATA_DIR, "pdfs")
        self.PNG_DIR = os.path.join(self.DATA_DIR, "pngs")
        self.LOGO_DIR = os.path.join(self.DATA_DIR, "logos")


settings = Settings()
