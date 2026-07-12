import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.invoice import InvoiceCreate, InvoiceResponse, InvoiceListResponse
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("/", response_model=dict)
def list_invoices(
    search: str | None = Query(default=None),
    client_id: int | None = Query(default=None),
    document: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = InvoiceService(db)
    invoices, total = service.search(
        search=search,
        client_id=client_id,
        document=document,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    result = []
    for inv in invoices:
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_name": inv.client.name if inv.client else "",
            "client_document": f"{inv.client.document_type}: {inv.client.document_number}" if inv.client else "",
            "total": inv.total,
            "payment_method": inv.payment_method,
            "email_sent": inv.email_sent,
            "created_at": inv.created_at,
        })
    return {"items": result, "total": total, "page": page, "page_size": page_size}


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    service = InvoiceService(db)
    invoice = service.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_name": invoice.client.name if invoice.client else "",
        "client_document": f"{invoice.client.document_type}: {invoice.client.document_number}" if invoice.client else "",
        "client_address": invoice.client.address if invoice.client else "",
        "client_email": invoice.client.email if invoice.client else "",
        "subtotal": invoice.subtotal,
        "discount": invoice.discount,
        "total": invoice.total,
        "payment_method": invoice.payment_method,
        "cash_amount": invoice.cash_amount,
        "change_amount": invoice.change_amount,
        "email_sent": invoice.email_sent,
        "email_sent_at": invoice.email_sent_at,
        "email_error": invoice.email_error,
        "created_at": invoice.created_at,
        "items": [
            {
                "id": item.id,
                "quantity": item.quantity,
                "description": item.description,
                "unit_price": item.unit_price,
                "total": item.total,
            }
            for item in invoice.items
        ],
    }


@router.post("/", response_model=dict, status_code=201)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    service = InvoiceService(db)
    try:
        invoice = service.create(
            client_id=data.client_id,
            client_document=data.client_document,
            client_name=data.client_name,
            client_document_type=data.client_document_type,
            client_address=data.client_address,
            client_phone=data.client_phone,
            client_email=data.client_email,
            discount=data.discount,
            payment_method=data.payment_method,
            cash_amount=data.cash_amount,
            items_data=[item.model_dump() for item in data.items],
        )
        return {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "total": invoice.total,
            "email_sent": invoice.email_sent,
            "email_error": invoice.email_error,
            "message": "Factura generada exitosamente",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{invoice_id}/pdf")
def download_pdf(invoice_id: int, db: Session = Depends(get_db)):
    service = InvoiceService(db)
    invoice = service.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        invoice = service.regenerate_files(invoice_id)
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        raise HTTPException(status_code=404, detail="PDF no disponible")
    return FileResponse(
        invoice.pdf_path,
        media_type="application/pdf",
        filename=f"factura_{invoice.invoice_number}.pdf",
    )


@router.get("/{invoice_id}/png")
def download_png(invoice_id: int, db: Session = Depends(get_db)):
    service = InvoiceService(db)
    invoice = service.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if not invoice.png_path or not os.path.exists(invoice.png_path):
        invoice = service.regenerate_files(invoice_id)
    if not invoice.png_path or not os.path.exists(invoice.png_path):
        raise HTTPException(status_code=404, detail="PNG no disponible")
    return FileResponse(
        invoice.png_path,
        media_type="image/png",
        filename=f"factura_{invoice.invoice_number}.png",
    )


@router.post("/{invoice_id}/resend-email")
def resend_email(invoice_id: int, db: Session = Depends(get_db)):
    service = InvoiceService(db)
    try:
        invoice = service.resend_email(invoice_id)
        return {"message": "Correo enviado exitosamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al enviar correo: {str(e)}")


@router.post("/{invoice_id}/duplicate", response_model=dict, status_code=201)
def duplicate_invoice(invoice_id: int, db: Session = Depends(get_db)):
    service = InvoiceService(db)
    try:
        invoice = service.duplicate(invoice_id)
        return {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "total": invoice.total,
            "message": "Factura duplicada exitosamente",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
