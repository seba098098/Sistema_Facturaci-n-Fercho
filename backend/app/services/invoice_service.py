import os
from datetime import datetime
from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.invoice_repo import InvoiceRepository
from app.repositories.settings_repo import SettingsRepository
from app.repositories.client_repo import ClientRepository
from app.models.invoice import Invoice, InvoiceItem
from app.services.pdf_service import PdfService


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.invoice_repo = InvoiceRepository(db)
        self.settings_repo = SettingsRepository(db)
        self.client_repo = ClientRepository(db)
        self.pdf_service = PdfService()

    def get_by_id(self, invoice_id: int) -> Invoice | None:
        return self.invoice_repo.get_by_id(invoice_id)

    def search(
        self,
        search: str | None = None,
        client_id: int | None = None,
        document: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Invoice], int]:
        return self.invoice_repo.search(
            search=search,
            client_id=client_id,
            document=document,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size,
        )

    def create(
        self,
        client_id: int | None,
        client_document: str | None,
        client_name: str | None,
        client_document_type: str,
        client_address: str,
        client_phone: str | None,
        client_email: str | None,
        discount: float,
        payment_method: str,
        cash_amount: float | None,
        items_data: list[dict],
    ) -> Invoice:
        if client_id:
            client = self.client_repo.get_by_id(client_id)
            if not client:
                raise ValueError("Cliente no encontrado")
        elif client_document:
            client = self.client_repo.get_by_document(client_document)
            if not client:
                client = self.client_repo.create(
                    name=client_name or "Sin nombre",
                    document_type=client_document_type,
                    document_number=client_document,
                    address=client_address,
                    phone=client_phone,
                    email=client_email,
                )
        else:
            raise ValueError("Se requiere un cliente")

        invoice_number = self.settings_repo.increment_consecutive()

        invoice_items = []
        subtotal = 0
        for item_data in items_data:
            total = item_data["quantity"] * item_data["unit_price"]
            subtotal += total
            invoice_items.append(
                InvoiceItem(
                    quantity=item_data["quantity"],
                    description=item_data["description"],
                    unit_price=item_data["unit_price"],
                    total=total,
                )
            )

        total = subtotal - discount
        change = None
        if cash_amount and cash_amount > total:
            change = cash_amount - total

        now = datetime.now()
        invoice = Invoice(
            invoice_number=invoice_number,
            client_id=client.id,
            subtotal=subtotal,
            discount=discount,
            total=total,
            payment_method=payment_method,
            cash_amount=cash_amount,
            change_amount=change,
        )

        invoice = self.invoice_repo.create(invoice, invoice_items)

        self._generate_files(invoice, client)

        if client.email:
            try:
                from app.services.email_service import EmailService
                email_service = EmailService(self.db)
                email_service.send_invoice(invoice, client)
            except Exception as e:
                self.invoice_repo.update(invoice.id, email_error=str(e))

        return self.invoice_repo.get_by_id(invoice.id)

    def _generate_files(self, invoice: Invoice, client):
        company_name = self.settings_repo.get("company_name") or ""
        slogan = self.settings_repo.get("slogan") or ""
        nit = self.settings_repo.get("nit") or ""
        regime = self.settings_repo.get("regime") or ""
        address = self.settings_repo.get("address") or ""
        phone = self.settings_repo.get("phone") or ""
        footer = self.settings_repo.get("footer") or ""
        logo_path = self.settings_repo.get("logo_path") or ""

        now = datetime.now()
        data = {
            "business_name": company_name,
            "slogan": slogan,
            "nit": f"NIT: {nit}" if nit else "",
            "regimen": regime,
            "address": address,
            "phone": f"Tel: {phone}" if phone else "",
            "logo": logo_path if logo_path and os.path.exists(logo_path) else "",
            "invoice_number": f"Factura No. {invoice.invoice_number}",
            "date": now.strftime("%d/%m/%Y"),
            "time": now.strftime("%H:%M:%S"),
            "client_name": f"Cliente: {client.name}",
            "client_doc": f"{client.document_type}: {client.document_number}",
            "client_address": f"Dir: {client.address}" if client.address else "",
            "products": [
                {
                    "cant": item.quantity,
                    "desc": item.description,
                    "unit_price": item.unit_price,
                    "total": item.total,
                }
                for item in invoice.items
            ],
            "subtotal": invoice.subtotal,
            "discount": invoice.discount,
            "total": invoice.total,
            "payment_method": invoice.payment_method,
            "cash_amount": invoice.cash_amount or 0,
            "change": invoice.change_amount or 0,
            "footer": footer,
        }

        pdf_path = os.path.join(settings.PDF_DIR, f"{invoice.invoice_number}.pdf")
        png_path = os.path.join(settings.PNG_DIR, f"{invoice.invoice_number}.png")

        try:
            self.pdf_service.generate(data, pdf_path, png_path)
            self.invoice_repo.update(
                invoice.id,
                pdf_path=pdf_path,
                png_path=png_path,
            )
        except Exception:
            pass

    def regenerate_files(self, invoice_id: int) -> Invoice:
        invoice = self.invoice_repo.get_by_id(invoice_id)
        if not invoice:
            raise ValueError("Factura no encontrada")
        client = self.client_repo.get_by_id(invoice.client_id)
        self._generate_files(invoice, client)
        return self.invoice_repo.get_by_id(invoice_id)

    def resend_email(self, invoice_id: int) -> Invoice:
        invoice = self.invoice_repo.get_by_id(invoice_id)
        if not invoice:
            raise ValueError("Factura no encontrada")
        client = self.client_repo.get_by_id(invoice.client_id)
        if not client or not client.email:
            raise ValueError("El cliente no tiene correo electrónico")
        from app.services.email_service import EmailService
        email_service = EmailService(self.db)
        email_service.send_invoice(invoice, client)
        return self.invoice_repo.get_by_id(invoice_id)

    def duplicate(self, invoice_id: int) -> Invoice:
        original = self.invoice_repo.get_by_id(invoice_id)
        if not original:
            raise ValueError("Factura no encontrada")

        items_data = [
            {
                "quantity": item.quantity,
                "description": item.description,
                "unit_price": item.unit_price,
            }
            for item in original.items
        ]

        return self.create(
            client_id=original.client_id,
            client_document=None,
            client_name=None,
            client_document_type="",
            client_address="",
            client_phone=None,
            client_email=None,
            discount=original.discount,
            payment_method=original.payment_method,
            cash_amount=original.cash_amount,
            items_data=items_data,
        )

    def get_client_invoices(self, client_id: int) -> list[Invoice]:
        return self.invoice_repo.get_invoices_for_client(client_id)
