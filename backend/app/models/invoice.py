from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    discount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    cash_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    change_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    pdf_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    png_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    email_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    client: Mapped["Client"] = relationship("Client", back_populates="invoices")
    items: Mapped[list["InvoiceItem"]] = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    total: Mapped[float] = mapped_column(Float, nullable=False)

    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="items")
