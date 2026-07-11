from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.invoice import Invoice, InvoiceItem
from app.models.client import Client


class InvoiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, invoice_id: int) -> Invoice | None:
        return self.db.query(Invoice).filter(Invoice.id == invoice_id).first()

    def get_by_number(self, invoice_number: str) -> Invoice | None:
        return self.db.query(Invoice).filter(Invoice.invoice_number == invoice_number).first()

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
        q = self.db.query(Invoice).join(Client, Invoice.client_id == Client.id, isouter=True)

        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    Invoice.invoice_number.ilike(term),
                    Client.name.ilike(term),
                    Client.document_number.ilike(term),
                )
            )

        if client_id:
            q = q.filter(Invoice.client_id == client_id)

        if document:
            q = q.filter(Client.document_number.ilike(f"%{document}%"))

        if date_from:
            try:
                d = datetime.strptime(date_from, "%Y-%m-%d").date()
                q = q.filter(func.date(Invoice.created_at) >= d)
            except ValueError:
                pass

        if date_to:
            try:
                d = datetime.strptime(date_to, "%Y-%m-%d").date()
                q = q.filter(func.date(Invoice.created_at) <= d)
            except ValueError:
                pass

        total = q.count()
        invoices = (
            q.order_by(Invoice.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return invoices, total

    def get_next_consecutive(self, prefix: str = "001") -> str:
        last = (
            self.db.query(Invoice)
            .order_by(Invoice.id.desc())
            .first()
        )
        if last:
            try:
                num = int(last.invoice_number.split("-")[-1]) + 1
            except (IndexError, ValueError):
                num = 1
        else:
            num = 1
        return f"{prefix}-{num:06d}"

    def create(self, invoice: Invoice, items: list[InvoiceItem]) -> Invoice:
        self.db.add(invoice)
        self.db.flush()
        for item in items:
            item.invoice_id = invoice.id
            self.db.add(item)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def update(self, invoice_id: int, **kwargs) -> Invoice | None:
        invoice = self.get_by_id(invoice_id)
        if not invoice:
            return None
        for key, value in kwargs.items():
            setattr(invoice, key, value)
        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def get_invoices_for_client(self, client_id: int) -> list[Invoice]:
        return (
            self.db.query(Invoice)
            .filter(Invoice.client_id == client_id)
            .order_by(Invoice.created_at.desc())
            .all()
        )
