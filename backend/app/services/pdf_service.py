import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.invoice_generator import InvoiceGenerator


class PdfService:
    def generate(self, data: dict, pdf_path: str, png_path: str) -> None:
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
        os.makedirs(os.path.dirname(png_path), exist_ok=True)

        gen = InvoiceGenerator(data)
        gen.generate_png(png_path)
        gen.generate_pdf(pdf_path)
