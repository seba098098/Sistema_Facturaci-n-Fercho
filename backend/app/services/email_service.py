import logging
import os
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email.utils import formataddr
from email import encoders

import aiosmtplib
from sqlalchemy.orm import Session

from app.config import settings
from app.models.invoice import Invoice
from app.models.client import Client
from app.repositories.settings_repo import SettingsRepository
from app.repositories.invoice_repo import InvoiceRepository

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        self.settings_repo = SettingsRepository(db)
        self.invoice_repo = InvoiceRepository(db)

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
        attachments: list[dict] | None = None,
    ) -> dict:
        if not settings.SMTP_HOST or not settings.SMTP_FROM:
            logger.error(
                "SMTP not configured: host=%s from=%s",
                settings.SMTP_HOST,
                settings.SMTP_FROM,
            )
            return {"status": "error", "message": "SMTP not configured"}

        sender = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM))
        has_auth = bool(settings.SMTP_USER and settings.SMTP_PASSWORD)
        logger.info(
            "Sending email to %s via %s:%d (tls=%s, auth=%s)",
            to,
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            settings.SMTP_TLS,
            has_auth,
        )

        message = MIMEMultipart("alternative")
        message["From"] = sender
        message["To"] = to
        message["Subject"] = subject

        if text_body:
            message.attach(MIMEText(text_body, "plain", "utf-8"))
        message.attach(MIMEText(html_body, "html", "utf-8"))

        if attachments:
            mixed = MIMEMultipart("mixed")
            mixed["From"] = sender
            mixed["To"] = to
            mixed["Subject"] = subject
            for att in attachments:
                filepath = att.get("path")
                filename = att.get("filename", "archivo")
                if filepath and os.path.exists(filepath):
                    with open(filepath, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{filename}"',
                    )
                    mixed.attach(part)
            mixed.attach(message)
            message = mixed

        try:
            client_kwargs = {
                "hostname": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "start_tls": settings.SMTP_TLS,
                "timeout": 30,
            }
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                client_kwargs["username"] = settings.SMTP_USER
                client_kwargs["password"] = settings.SMTP_PASSWORD

            await aiosmtplib.send(message, **client_kwargs)
            logger.info("Email sent successfully to %s", to)
            return {"status": "sent"}
        except Exception as e:
            logger.error("Failed to send email to %s: %s", to, e, exc_info=True)
            return {"status": "error", "message": str(e)}

    def send_invoice(self, invoice: Invoice, client: Client) -> None:
        import asyncio

        if not client.email:
            raise ValueError("El cliente no tiene correo electrónico")

        company_name = self.settings_repo.get("company_name") or ""
        company_phone = self.settings_repo.get("phone") or ""
        company_address = self.settings_repo.get("address") or ""

        text_body = (
            f"Estimado(a) {client.name},\n\n"
            f"Adjunto encontrará su factura No. {invoice.invoice_number} "
            f"por un valor de ${invoice.total:,.0f}.\n\n"
            f"Fecha: {invoice.created_at.strftime('%d/%m/%Y %H:%M')}\n"
            f"Método de pago: {invoice.payment_method}\n\n"
            f"¡Gracias por su compra!\n\n"
            f"{company_name}"
        )

        html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">{company_name}</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px;">Factura de venta</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="color:#374151;font-size:15px;margin:0 0 8px;">
        Estimado(a) <strong>{client.name}</strong>,
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">
        Adjunto a este correo encontrará su factura electrónica en formato PDF.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 12px;background:#f9fafb;border-radius:6px 0 0 6px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Factura N°</td>
          <td style="padding:10px 12px;background:#f9fafb;border-radius:0 6px 6px 0;color:#111827;font-weight:bold;font-size:13px;border-bottom:1px solid #e5e7eb;">{invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Fecha</td>
          <td style="padding:10px 12px;color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">{invoice.created_at.strftime('%d/%m/%Y %H:%M')}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;">Método de pago</td>
          <td style="padding:10px 12px;color:#111827;font-size:13px;border-bottom:1px solid #e5e7eb;">{invoice.payment_method}</td>
        </tr>
        <tr>
          <td style="padding:12px 12px;color:#6b7280;font-size:14px;font-weight:bold;">Total</td>
          <td style="padding:12px 12px;color:#2563eb;font-size:18px;font-weight:bold;">${invoice.total:,.0f}</td>
        </tr>
      </table>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
        <p style="margin:0;color:#166534;font-size:15px;font-weight:bold;">¡Gracias por su compra!</p>
        <p style="margin:6px 0 0;color:#15803d;font-size:13px;">Esperamos volver a atenderle pronto.</p>
      </div>

      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
        Este es un correo automático. Por favor no responda a este mensaje.
      </p>
    </div>

    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">
        {company_name} &bull; {company_address} &bull; Tel: {company_phone}
      </p>
    </div>
  </div>
</body>
</html>
"""

        attachments = []
        if invoice.pdf_path and os.path.exists(invoice.pdf_path):
            attachments.append({
                "path": invoice.pdf_path,
                "filename": f"factura_{invoice.invoice_number}.pdf",
            })

        try:
            result = asyncio.run(
                self.send_email(
                    to=client.email,
                    subject=f"Factura {invoice.invoice_number} - {company_name}",
                    html_body=html_body,
                    text_body=text_body,
                    attachments=attachments,
                )
            )

            if result["status"] == "sent":
                self.invoice_repo.update(
                    invoice.id,
                    email_sent=True,
                    email_sent_at=datetime.now(),
                    email_error=None,
                )
            else:
                self.invoice_repo.update(invoice.id, email_error=result.get("message"))
                raise ValueError(result.get("message", "Error al enviar correo"))

        except ValueError:
            raise
        except Exception as e:
            self.invoice_repo.update(invoice.id, email_error=str(e))
            raise ValueError(str(e))
