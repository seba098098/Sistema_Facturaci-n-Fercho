import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db, SessionLocal
from app.repositories.settings_repo import SettingsRepository
from app.controllers.client_routes import router as client_router
from app.controllers.invoice_routes import router as invoice_router
from app.controllers.settings_routes import router as settings_router


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(client_router)
    app.include_router(invoice_router)
    app.include_router(settings_router)

    @app.on_event("startup")
    def startup():
        init_db()
        db = SessionLocal()
        try:
            settings_repo = SettingsRepository(db)
            settings_repo.initialize_defaults()

            logo_in_data = os.path.join(settings.DATA_DIR, "logos", "logo.png")
            if os.path.exists(logo_in_data):
                current_logo = settings_repo.get("logo_path")
                if not current_logo:
                    settings_repo.set("logo_path", logo_in_data)

            env_smtp = {
                "smtp_host": settings.SMTP_HOST,
                "smtp_port": str(settings.SMTP_PORT),
                "smtp_user": settings.SMTP_USER,
                "smtp_password": settings.SMTP_PASSWORD,
                "smtp_from": settings.SMTP_FROM,
                "smtp_use_tls": str(settings.SMTP_TLS).lower(),
            }
            for key, value in env_smtp.items():
                if value:
                    settings_repo.set(key, value)
        finally:
            db.close()

    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    if os.path.exists(static_dir):
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.exists(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="static")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = os.path.join(static_dir, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(os.path.join(static_dir, "index.html"))

    return app


app = create_app()
