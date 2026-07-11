import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
import os
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.models.client import Client
from app.repositories.settings_repo import SettingsRepository
from app.repositories.invoice_repo import InvoiceRepository


class EmailService:
    def __init__(self, db: Session):
        self.db = db
        self.settings_repo = SettingsRepository(db)
        self.invoice_repo = InvoiceRepository(db)

    def send_invoice(self, invoice: Invoice, client: Client) -> None:
        if not client.email:
            raise ValueError("El cliente no tiene correo electrónico")

        smtp_host = self.settings_repo.get("smtp_host")
        if not smtp_host:
            self.invoice_repo.update(invoice.id, email_error="SMTP no configurado")
            raise ValueError("SMTP no configurado")

        smtp_port = int(self.settings_repo.get("smtp_port") or "587")
        smtp_user = self.settings_repo.get("smtp_user") or ""
        smtp_password = self.settings_repo.get("smtp_password") or ""
        smtp_from = self.settings_repo.get("smtp_from") or smtp_user
        use_tls = self.settings_repo.get("smtp_use_tls") != "false"

        msg = MIMEMultipart()
        msg["From"] = smtp_from
        msg["To"] = client.email
        msg["Subject"] = f"Factura {invoice.invoice_number}"

        company_name = self.settings_repo.get("company_name") or ""
        body = f"""Estimado(a) {client.name},

Adjunto encontrará su factura No. {invoice.invoice_number} por un valor de ${invoice.total:,.0f}.

Fecha: {invoice.created_at.strftime('%d/%m/%Y %H:%M:%S')}
Método de pago: {invoice.payment_method}

Gracias por su compra.

{company_name}
"""
        msg.attach(MIMEText(body, "plain", "utf-8"))

        if invoice.pdf_path and os.path.exists(invoice.pdf_path):
            with open(invoice.pdf_path, "rb") as f:
                part = MIMEBase("application", "pdf")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f'attachment; filename="factura_{invoice.invoice_number}.pdf"',
                )
                msg.attach(part)

        try:
            server = smtplib.SMTP(smtp_host, smtp_port)
            if use_tls:
                server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, client.email, msg.as_string())
            server.quit()

            self.invoice_repo.update(
                invoice.id,
                email_sent=True,
                email_sent_at=datetime.now(),
                email_error=None,
            )
        except Exception as e:
            self.invoice_repo.update(invoice.id, email_error=str(e))
            raise
