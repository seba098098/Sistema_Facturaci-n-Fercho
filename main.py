from invoice_generator import InvoiceGenerator, generar_factura
import os


# ============================================================
# DATOS DE EJEMPLO  -  EDITAR ESTE DICCIONARIO
# ============================================================

invoice_data = {

    # ---------- ENCABEZADO ----------
    "business_name": "DIGITAL FERCHO´S",
    "slogan": "Dale personalidad a tu tecnología.",
    "nit": "NIT: 100274039-4",
    "regimen": "REGIMEN SIMPLIFICADO",
    "address": "Cra 18 No. 11A-01",
    "phone": "Tel: 3043915900",

    "logo": "assets/logo.png",

    # ---------- DATOS FACTURA ----------
    "invoice_number": "Factura No. 001-000104",
    "date": "20/05/2026",
    "time": "18:30:45",

    # ---------- CLIENTE ----------
    "client_name": "Cliente: SEBASTIAN ALVAREZ LAVERDE",
    "client_doc": "CC: 1.007.826.250",
    "client_address": "Dir: Transversal 6a-3b-40",

    # ---------- PRODUCTOS ----------
    "products": [
        {"cant": 1, "desc": "SONY PLAYSTATION 5 825GB GOD OF WAR RAGNAROK BUNDLE COLOR BLANCO",                    "unit_price": 2200000.00,  "total": 2200000.00},

    ],

    # ---------- TOTALES (omitir para auto-calculo) ----------
    "subtotal": 2200000.00,
    "discount": 0000.00,
    "total": 2200000.00,

    # ---------- PAGO ----------
    "payment_method": "EFECTIVO",
    "cash_amount": 2200000.00,
    "change": 0000.00,

    # ---------- QR (opcional - incluir datos para generar codigo QR) ----------
    #"qr_data": "https://ejemplo.com/factura/001-001-0001234",

    # ---------- PIE ----------
    "footer": "!Gracias por su compra!\n"
            "Factura electronica generada el 20/05/2026 a las 18:30:45\n\n"
            "Politica de garantia:\n"
            "- Presentar esta factura\n"
            "- La garantia cubre solo arreglo, no cambio\n"
            "- Valida por 30 dias a partir de la fecha de compra",
}


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    os.makedirs("output", exist_ok=True)

    print("Generando factura PNG...")
    gen = InvoiceGenerator(invoice_data)
    gen.generate_png("output/factura.png")
    print("  -> output/factura.png")

    print("Generando factura PDF...")
    gen.generate_pdf("output/factura.pdf")
    print("  -> output/factura.pdf")

    # Convenience one-liner alternative:
    # generar_factura(invoice_data, "output/factura.png", "output/factura.pdf")

    print("\nListo! Revisa la carpeta 'output/'")
