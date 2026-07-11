import os
from typing import List, Optional, Tuple
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from template import *


# ============================================================
# HELPERS
# ============================================================

def format_currency(amount: float) -> str:
    if amount == int(amount):
        amount = int(amount)
    s = f"${amount:,.0f}".replace(",", ".")
    return s


def wrap_text(text: str, max_chars: int) -> List[str]:
    if not text:
        return [""]
    words = text.split()
    lines = []
    current = ""
    for word in words:
        if current and len(current) + 1 + len(word) <= max_chars:
            current += " " + word
        else:
            if current:
                lines.append(current)
            if len(word) > max_chars:
                for i in range(0, len(word), max_chars):
                    lines.append(word[i:i+max_chars])
                current = ""
            else:
                current = word
    if current:
        lines.append(current)
    return lines if lines else [""]


# ============================================================
# FONT MANAGEMENT
# ============================================================

_font_cache: dict = {}

def _find_font_path() -> Optional[str]:
    import platform
    system = platform.system()
    candidates = []
    if system == "Windows":
        candidates = [
            "C:/Windows/Fonts/cour.ttf",
            "C:/Windows/Fonts/DejaVuSansMono.ttf",
            "C:/Windows/Fonts/DejaVuSansMono-Bold.ttf",
            "C:/Windows/Fonts/consola.ttf",
            "C:/Windows/Fonts/lucon.ttf",
        ]
    elif system == "Darwin":
        candidates = [
            "/System/Library/Fonts/Menlo.ttc",
            "/System/Library/Fonts/Courier.ttc",
            "/System/Library/Fonts/Monaco.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
            "/usr/share/fonts/truetype/freefont/FreeMono.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def _get_font(size: int) -> ImageFont:
    if size not in _font_cache:
        path = _find_font_path()
        if path:
            _font_cache[size] = ImageFont.truetype(path, size)
        else:
            _font_cache[size] = ImageFont.load_default()
    return _font_cache[size]


# ============================================================
# QR CODE GENERATION
# ============================================================

def _generate_qr(data: str, box_size: int = 3, border: int = 1) -> Optional[Image.Image]:
    try:
        import qrcode
        qr = qrcode.QRCode(box_size=box_size, border=border)
        qr.add_data(data)
        qr.make(fit=True)
        return qr.make_image(fill_color="black", back_color="white")
    except ImportError:
        return None


# ============================================================
# MAIN GENERATOR
# ============================================================

class InvoiceGenerator:
    """Generate POS thermal ticket invoices (PNG + PDF)."""

    def __init__(self, data: dict):
        self.data = data
        self.products = data.get("products", [])

        calc_subtotal = sum(p.get("total", 0) for p in self.products)
        self.subtotal = data.get("subtotal", calc_subtotal)
        self.discount = data.get("discount", 0)
        self.total = data.get("total", self.subtotal - self.discount)

        self._lh_cache: dict = {}
        self._cw_cache: dict = {}
        for sz in [FONT_SIZE_SMALL, FONT_SIZE_NORMAL, FONT_SIZE_MEDIUM,
                    FONT_SIZE_LARGE, FONT_SIZE_XLARGE]:
            f = _get_font(sz)
            bb = f.getbbox("Ay")
            self._lh_cache[sz] = bb[3] - bb[1] + LINE_PADDING
            bb_a = f.getbbox("A")
            self._cw_cache[sz] = bb_a[2] - bb_a[0]

        self._qr_cache: Optional[Image.Image] = None
        qr_data = data.get("qr_data", "")
        if qr_data:
            self._qr_cache = _generate_qr(str(qr_data))

        self._logo_cache: Optional[Image.Image] = None
        logo_path = data.get("logo", "")
        if logo_path and os.path.exists(logo_path):
            try:
                logo_img = Image.open(logo_path)
                max_w = TICKET_WIDTH_PX - 2 * MARGIN_PX
                logo_w, logo_h = logo_img.size
                if logo_w > max_w:
                    ratio = max_w / logo_w
                    logo_w = int(max_w)
                    logo_h = int(logo_h * ratio)
                if logo_h > 80:
                    ratio = 80 / logo_h
                    logo_h = 80
                    logo_w = int(logo_w * ratio)
                self._logo_cache = logo_img.resize((logo_w, logo_h), Image.LANCZOS)
            except Exception:
                self._logo_cache = None

    def _lh(self, size: int) -> int:
        return self._lh_cache.get(size, 14)

    def _cw(self, size: int) -> int:
        return self._cw_cache.get(size, 6)

    # ----------------------------------------------------------
    # BUILD RENDER PLAN
    # ----------------------------------------------------------

    def _build_plan(self) -> list:
        plan = []
        plan.append(("margin", MARGIN_PX, None))

        if self._logo_cache:
            plan.append(("logo", None, None))
            plan.append(("margin", 4, None))

        plan.append(("centered", self.data.get("business_name", ""), FONT_SIZE_XLARGE))
        slogan = self.data.get("slogan", "")
        if slogan:
            plan.append(("centered", slogan, FONT_SIZE_SMALL))
        plan.append(("centered", self.data.get("nit", ""), FONT_SIZE_NORMAL))
        plan.append(("centered", self.data.get("regimen", ""), FONT_SIZE_NORMAL))
        plan.append(("centered", self.data.get("address", ""), FONT_SIZE_NORMAL))
        plan.append(("centered", self.data.get("phone", ""), FONT_SIZE_NORMAL))

        plan.append(("margin", SECTION_GAP, None))
        plan.append(("separator", "-", FONT_SIZE_SMALL))
        plan.append(("margin", SECTION_GAP, None))

        plan.append(("centered", self.data.get("invoice_number", ""), FONT_SIZE_NORMAL))
        date_text = self.data.get("date", "")
        time_text = self.data.get("time", "")
        plan.append(("centered", f"Fecha: {date_text}    Hora: {time_text}", FONT_SIZE_NORMAL))

        plan.append(("left", self.data.get("client_name", ""), FONT_SIZE_NORMAL))
        plan.append(("left", self.data.get("client_doc", ""), FONT_SIZE_NORMAL))
        plan.append(("left", self.data.get("client_address", ""), FONT_SIZE_NORMAL))

        plan.append(("margin", SECTION_GAP, None))
        plan.append(("separator", "-", FONT_SIZE_SMALL))
        plan.append(("margin", SECTION_GAP, None))
        plan.append(("table_header", None, FONT_SIZE_NORMAL))

        for p in self.products:
            desc_lines = wrap_text(p.get("desc", ""), COL_DESC)
            for i, line in enumerate(desc_lines):
                if i == 0:
                    plan.append(("product_first", (
                        p.get("cant", 1), line, p.get("total", 0)
                    ), FONT_SIZE_NORMAL))
                else:
                    plan.append(("product_cont", line, FONT_SIZE_NORMAL))

        plan.append(("margin", SECTION_GAP, None))
        plan.append(("separator", "-", FONT_SIZE_SMALL))
        plan.append(("margin", SECTION_GAP, None))
        plan.append(("total_line", ("Subtotal:", format_currency(self.subtotal)), FONT_SIZE_NORMAL))
        if self.discount:
            plan.append(("total_line", ("Descuento:", format_currency(self.discount)), FONT_SIZE_NORMAL))
        plan.append(("total_line", ("TOTAL:", format_currency(self.total)), FONT_SIZE_NORMAL))

        plan.append(("margin", SECTION_GAP, None))
        plan.append(("separator", "=", FONT_SIZE_SMALL))
        plan.append(("margin", SECTION_GAP, None))
        plan.append(("left", f"Forma de pago: {self.data.get('payment_method', '')}", FONT_SIZE_NORMAL))

        cash = self.data.get("cash_amount", 0)
        if cash:
            plan.append(("left", f"Efectivo: {format_currency(cash)}", FONT_SIZE_NORMAL))
            change = self.data.get("change", cash - self.total)
            plan.append(("left", f"Cambio: {format_currency(change)}", FONT_SIZE_NORMAL))

        plan.append(("margin", SECTION_GAP, None))
        plan.append(("separator", "=", FONT_SIZE_SMALL))
        plan.append(("margin", SECTION_GAP, None))

        footer = self.data.get("footer", "")
        for line in footer.split("\n"):
            for wrapped in wrap_text(line, CHARS_PER_LINE):
                plan.append(("centered", wrapped, FONT_SIZE_NORMAL))

        if self._qr_cache:
            plan.append(("margin", SECTION_GAP, None))
            plan.append(("qr", None, None))

        plan.append(("margin", MARGIN_PX, None))
        return plan

    # ----------------------------------------------------------
    # CALCULATE HEIGHT
    # ----------------------------------------------------------

    def _calc_height(self, plan: list) -> int:
        total = 0
        for op, data, fs in plan:
            if op == "margin":
                total += data
            elif op == "qr":
                total += (self._qr_cache.height + self._lh(FONT_SIZE_SMALL) if self._qr_cache else 0)
            elif op == "logo":
                total += (self._logo_cache.height if self._logo_cache else 0)
            else:
                total += self._lh(fs)
        return int(total)

    # ----------------------------------------------------------
    # PUBLIC GENERATE METHODS
    # ----------------------------------------------------------

    def generate_png(self, path: str):
        plan = self._build_plan()
        height = self._calc_height(plan)
        img = Image.new("RGB", (TICKET_WIDTH_PX, height), WHITE)
        draw = ImageDraw.Draw(img)
        self._execute_plan_pil(draw, plan, img)
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        img.save(path, "PNG")

    def generate_pdf(self, path: str):
        plan = self._build_plan()
        height = self._calc_height(plan)
        w_pt = TICKET_WIDTH_MM * 2.83465
        h_pt = height * (w_pt / TICKET_WIDTH_PX)

        img = Image.new("RGB", (TICKET_WIDTH_PX, height), WHITE)
        draw = ImageDraw.Draw(img)
        self._execute_plan_pil(draw, plan, img)

        buf = BytesIO()
        img.save(buf, "PNG")
        buf.seek(0)

        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        c = canvas.Canvas(path, pagesize=(w_pt, h_pt))
        c.setTitle("Factura POS")
        c.drawImage(ImageReader(buf), 0, 0, width=w_pt, height=h_pt)
        c.save()

    # ----------------------------------------------------------
    # PIL EXECUTOR
    # ----------------------------------------------------------

    def _execute_plan_pil(self, draw: ImageDraw.ImageDraw, plan: list, img: Image.Image = None):
        y = 0
        for op, data, fs in plan:
            if op == "margin":
                y += data
                continue

            if op == "logo":
                if self._logo_cache:
                    lw, lh = self._logo_cache.size
                    x_logo = (TICKET_WIDTH_PX - lw) // 2
                    logo_rgb = self._logo_cache.convert("RGB")
                    img.paste(logo_rgb, (x_logo, y))
                    y += lh
                continue

            if op == "qr":
                if self._qr_cache:
                    qr_w, qr_h = self._qr_cache.size
                    x_qr = (TICKET_WIDTH_PX - qr_w) // 2
                    y += self._lh(FONT_SIZE_SMALL)
                    qr_rgb = self._qr_cache.convert("RGB")
                    img.paste(qr_rgb, (x_qr, y))
                    y += qr_h
                continue

            font = _get_font(fs)
            lh = self._lh(fs)
            cw = self._cw(fs)

            if op == "centered":
                if data:
                    self._pil_centered(draw, y, str(data), font)
                y += lh

            elif op == "left":
                if data:
                    self._pil_left(draw, y, str(data), font)
                y += lh

            elif op == "separator":
                n = (TICKET_WIDTH_PX - 2 * MARGIN_PX) // max(cw, 1)
                sep = str(data) * max(n, 1)
                self._pil_centered(draw, y, sep, font)
                y += lh

            elif op == "table_header":
                self._pil_table_header(draw, y, font)
                y += lh

            elif op == "product_first":
                cant, desc, total = data
                self._pil_product_row(draw, y, cant, str(desc), total, font, first=True)
                y += lh

            elif op == "product_cont":
                self._pil_product_row(draw, y, "", str(data), "", font, first=False)
                y += lh

            elif op == "total_line":
                label, value = data
                self._pil_total_line(draw, y, str(label), str(value), font)
                y += lh

    # ----------------------------------------------------------
    # PIL DRAWING PRIMITIVES
    # ----------------------------------------------------------

    def _pil_centered(self, draw, y: int, text: str, font):
        bb = draw.textbbox((0, 0), text, font=font)
        tw = bb[2] - bb[0]
        x = (TICKET_WIDTH_PX - tw) // 2
        draw.text((x, y), text, font=font, fill=BLACK)

    def _pil_left(self, draw, y: int, text: str, font, x: int = None):
        if x is None:
            x = MARGIN_PX
        draw.text((x, y), text, font=font, fill=BLACK)

    def _pil_right(self, draw, y: int, text: str, font):
        bb = draw.textbbox((0, 0), text, font=font)
        tw = bb[2] - bb[0]
        x = TICKET_WIDTH_PX - MARGIN_PX - tw
        draw.text((x, y), text, font=font, fill=BLACK)

    def _pil_table_header(self, draw, y: int, font):
        cw = self._cw(FONT_SIZE_NORMAL)
        x_cant = MARGIN_PX
        x_desc = x_cant + (COL_CANT + COL_GAP) * cw
        x_total_start = x_desc + (COL_DESC + COL_GAP) * cw

        draw.text((x_cant, y), "CANT", font=font, fill=BLACK)
        draw.text((x_desc, y), "DESCRIPCION", font=font, fill=BLACK)

        total_label = "TOTAL"
        bb = draw.textbbox((0, 0), total_label, font=font)
        tw = bb[2] - bb[0]
        x_total = x_total_start + COL_TOTAL * cw - tw
        draw.text((x_total, y), total_label, font=font, fill=BLACK)

    def _pil_product_row(self, draw, y: int, cant, desc: str, total, font, first: bool):
        cw = self._cw(FONT_SIZE_NORMAL)
        x_cant = MARGIN_PX
        x_desc = x_cant + (COL_CANT + COL_GAP) * cw
        x_total_start = x_desc + (COL_DESC + COL_GAP) * cw

        if first:
            cant_str = str(cant)
            bb = draw.textbbox((0, 0), cant_str, font=font)
            tw = bb[2] - bb[0]
            x_cant_right = x_cant + COL_CANT * cw - tw
            draw.text((x_cant_right, y), cant_str, font=font, fill=BLACK)
            draw.text((x_desc, y), desc, font=font, fill=BLACK)
            total_str = format_currency(total)
            bb = draw.textbbox((0, 0), total_str, font=font)
            tw = bb[2] - bb[0]
            x_total = x_total_start + COL_TOTAL * cw - tw
            draw.text((x_total, y), total_str, font=font, fill=BLACK)
        else:
            draw.text((x_desc, y), desc, font=font, fill=BLACK)

    def _pil_total_line(self, draw, y: int, label: str, value: str, font):
        self._pil_left(draw, y, label, font)
        self._pil_right(draw, y, value, font)


# ============================================================
# CONVENIENCE FUNCTION
# ============================================================

def generar_factura(data: dict, output_png: str = None, output_pdf: str = None):
    """Generate invoice in PNG and/or PDF format.

    Args:
        data: Invoice data dictionary.
        output_png: Path for PNG output (None to skip).
        output_pdf: Path for PDF output (None to skip).
    """
    gen = InvoiceGenerator(data)
    if output_png:
        gen.generate_png(output_png)
    if output_pdf:
        gen.generate_pdf(output_pdf)
