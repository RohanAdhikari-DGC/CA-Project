import io
import re
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from PIL import Image
import pdfplumber
import pypdfium2
from rapidocr_onnxruntime import RapidOCR
from sqlalchemy.orm import Session

from app.models.ocr_layout import OCRDocument
from app.models.invoice import Invoice
from app.services.classifier_service import classify_document, normalize_document_type
from app.schemas.ocr_layout import (
    BoundingBox,
    OCRWord,
    OCRLine,
    LayoutBlock,
    TableCell,
    TableLayout,
    KeyValuePair,
    PageLayout,
    ExtractedInvoiceFields,
    OCRLayoutResponse,
)

# Global singleton OCR engine
_ocr_engine: Optional[RapidOCR] = None

def get_ocr_engine() -> RapidOCR:
    """Lazy loader for RapidOCR ONNX model instance."""
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = RapidOCR()
    return _ocr_engine


def _normalize_text(text: str) -> str:
    """Normalize fullwidth unicode characters from OCR into standard ASCII/Unicode."""
    if not text:
        return ""
    text = text.replace("\uff1a", ":").replace("：", ":")
    text = text.replace("（", "(").replace("）", ")")
    text = text.replace("【", "[").replace("】", "]")
    text = text.replace("／", "/")
    text = text.replace("－", "-")
    text = text.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    text = re.sub(r"[于]\s*(?=\d)", "₹ ", text)
    text = re.sub(r"\b0ct\b", "Oct", text, flags=re.IGNORECASE)
    return text


def _parse_currency_amount(text: str) -> Optional[float]:
    """Safely parse a currency amount into a float."""
    if not text:
        return None
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        val = float(cleaned)
        return round(val, 2)
    except ValueError:
        return None


class _UnifiedBox:
    def __init__(self, text: str, x0: float, y0: float, x1: float, y1: float, conf: float = 1.0):
        self.text = _normalize_text(text.strip())
        self.x0 = x0
        self.y0 = y0
        self.x1 = x1
        self.y1 = y1
        self.conf = conf


def _group_boxes_into_lines(box_list: List[_UnifiedBox], y_thresh: float = 6.0) -> List[str]:
    """Group spatial boxes into ordered single lines based on vertical proximity."""
    if not box_list:
        return []
    # Sort primarily by y0 bucket, then x0
    sorted_boxes = sorted(box_list, key=lambda b: (round(b.y0 / y_thresh) * y_thresh, b.x0))
    lines: List[str] = []
    curr_line: List[_UnifiedBox] = [sorted_boxes[0]]
    for b in sorted_boxes[1:]:
        if abs(b.y0 - curr_line[-1].y0) <= y_thresh:
            curr_line.append(b)
        else:
            curr_line.sort(key=lambda x: x.x0)
            lines.append(" ".join(x.text for x in curr_line))
            curr_line = [b]
    if curr_line:
        curr_line.sort(key=lambda x: x.x0)
        lines.append(" ".join(x.text for x in curr_line))
    return lines


def _extract_fields_from_boxes(
    boxes: List[_UnifiedBox],
    page_width: float,
    page_height: float,
    tables: List[TableLayout],
) -> Tuple[List[KeyValuePair], ExtractedInvoiceFields]:
    """Accurately extract invoice metadata, line items, and totals using spatial zones."""
    kvs: List[KeyValuePair] = []
    fields = ExtractedInvoiceFields()

    valid_boxes = [b for b in boxes if b.text]
    if not valid_boxes:
        return kvs, fields

    all_raw_text = " ".join(b.text for b in valid_boxes)
    mid_x = page_width * 0.48

    # 1. Determine table region boundaries
    table_start_y: Optional[float] = None
    table_end_y: Optional[float] = None

    for b in valid_boxes:
        lower = b.text.lower()
        if any(k in lower for k in ["sub total", "subtotal", "taxable value"]):
            if table_end_y is None or b.y0 - 5 < table_end_y:
                table_end_y = b.y0 - 5
        if any(k in lower for k in ["description of goods", "item description", "particulars", "description"]):
            if table_start_y is None or b.y1 + 5 < table_start_y:
                table_start_y = b.y1 + 5

    if table_start_y is None:
        table_start_y = page_height * 0.40
    if table_end_y is None:
        table_end_y = page_height * 0.75

    header_left: List[_UnifiedBox] = []
    header_right: List[_UnifiedBox] = []
    table_boxes: List[_UnifiedBox] = []
    bottom_boxes: List[_UnifiedBox] = []

    for b in valid_boxes:
        if b.y1 < table_start_y:
            if b.x1 <= mid_x:
                header_left.append(b)
            elif b.x0 >= mid_x:
                header_right.append(b)
            else:
                if (b.x0 + b.x1) / 2 < mid_x:
                    header_left.append(b)
                else:
                    header_right.append(b)
        elif b.y0 >= table_end_y:
            bottom_boxes.append(b)
        else:
            table_boxes.append(b)

    left_lines = _group_boxes_into_lines(header_left, y_thresh=6.0)
    right_lines = _group_boxes_into_lines(header_right, y_thresh=6.0)
    bottom_lines = _group_boxes_into_lines(bottom_boxes, y_thresh=6.0)
    table_lines = _group_boxes_into_lines(table_boxes, y_thresh=8.0)

    combined_meta_text = "\n".join(right_lines) + "\n" + "\n".join(left_lines) + "\n" + "\n".join(bottom_lines)

    # --- Vendor Name & Address ---
    vendor_candidates = []
    for l in left_lines[:6]:
        cleaned = re.sub(r"^(?:tax\s*invoice|invoice|debit\s*note|credit\s*note)", "", l, flags=re.I).strip()
        cleaned = re.sub(r"^SV\s+", "", cleaned).strip()
        if len(cleaned) >= 3 and not re.search(r"^(bill\s*to|ship\s*to|client|customer|attn|date|gstin|phone|email|direct|101\s*tech|no\.\s*\d)", cleaned, re.I):
            vendor_candidates.append(cleaned)
    if vendor_candidates:
        if len(vendor_candidates) > 1 and any(s in vendor_candidates[1].lower() for s in ["llc", "inc", "ltd", "corp", "solutions", "traders", "technologies"]):
            fields.vendor_name = f"{vendor_candidates[0]} {vendor_candidates[1]}".strip()
        else:
            fields.vendor_name = vendor_candidates[0]

    # --- Customer Name & Address ---
    for idx, l in enumerate(left_lines):
        m = re.search(r"^(?:bill\s*to|ship\s*to|client|customer|billed\s*to)[:\s\-]*\s*(.*)$", l, re.I)
        if m:
            val = m.group(1).strip()
            if val and len(val) > 2 and not re.match(r"^(name|details|address)$", val, re.I):
                fields.customer_name = val
            elif idx + 1 < len(left_lines):
                next_l = left_lines[idx + 1].strip()
                if not re.search(r"^(gstin|pan|attn|tel|phone|contact)", next_l, re.I):
                    fields.customer_name = next_l
            break

    if fields.customer_name:
        fields.customer_name = re.sub(r"^M/s\.\s*", "", fields.customer_name).strip()

    # --- Invoice Number ---
    # First search for compound token like R-INV-2026-9055 or DN-2026-9055 or SVT/2024-25/0187
    codes = re.findall(r"\b((?:DN|CN|R-INV|INV|SVT)[-/][A-Za-z0-9\-_/]{4,})\b", all_raw_text, re.I)
    valid_codes = [c.strip().rstrip("-/") for c in codes if len(c.strip().rstrip("-/")) >= 6]
    if valid_codes:
        fields.invoice_number = max(valid_codes, key=len)
    else:
        inv_matches = re.findall(r"(?:Debit\s*Note\s*No|Credit\s*Note\s*No|Revised\s*Inv\s*No|Invoice\s*No|Inv\s*No|Invoice\s*#)[:\s\-]*([A-Za-z0-9\-_/]+)", combined_meta_text, re.I)
        if inv_matches:
            cand = inv_matches[0].strip()
            if cand.endswith("-") or cand.endswith("/"):
                full_m = re.search(re.escape(cand) + r"([A-Za-z0-9\-_/]+)", all_raw_text)
                if full_m:
                    cand = cand + full_m.group(1)
            fields.invoice_number = cand

    # --- Original Invoice Number & PO Number ---
    m_orig = re.search(r"(?:Original\s*Inv(?:oice)?(?:\s*No|#)?)[:\s\-]*([A-Za-z0-9\-_/]+)", combined_meta_text, re.I)
    if m_orig:
        fields.original_invoice_number = m_orig.group(1).strip()

    m_po = re.search(r"(?:Purchase\s*Order|PO\s*(?:#|No|Number)?)[:\s\-]*([A-Za-z0-9\-_/]+)", combined_meta_text, re.I)
    if m_po:
        fields.po_number = m_po.group(1).strip()

    # --- Dates ---
    m_due = re.search(r"(?:Payment\s*Due|Due\s*Date|Due\s*By)[:\s\-]*([0-3]?\d[/\-.][0-1]?\d[/\-.]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})", combined_meta_text, re.I)
    if m_due:
        fields.due_date = m_due.group(1).strip()

    m_inv = re.search(r"(?<!Payment\s)(?<!Due\s)\b(?:Invoice\s*Date|Date)[:\s\-]+([0-3]?\d[/\-.][0-1]?\d[/\-.]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})", combined_meta_text, re.I)
    if m_inv:
        val = m_inv.group(1).strip()
        if val != fields.due_date:
            fields.invoice_date = val

    # --- Currency ---
    if "$" in all_raw_text or "USD" in all_raw_text:
        fields.currency = "$"
    elif "₹" in all_raw_text or "INR" in all_raw_text or "Rupees" in all_raw_text:
        fields.currency = "INR"
    elif "€" in all_raw_text or "EUR" in all_raw_text:
        fields.currency = "EUR"
    elif "£" in all_raw_text or "GBP" in all_raw_text:
        fields.currency = "GBP"

    # --- Subtotal ---
    m_sub = re.search(r"(?:Sub\s*Total|Subtotal|Taxable\s*Value)[:\s\-]*([$€£₹]?\s*[\d,]+(?:\.\d{2})?)", combined_meta_text, re.I)
    if m_sub:
        fields.subtotal = _parse_currency_amount(m_sub.group(1))

    # --- Taxes ---
    taxes = []
    for m_t in re.finditer(r"(?:CGST|SGST|IGST|State\s*Tax|Tax)\s*(?:\(?\s*\d+(?:\.\d+)?\s*%\s*\)?)?[:\s\-]*([$€£₹]?\s*[\d,]+(?:\.\d{2})?)", combined_meta_text, re.I):
        val = _parse_currency_amount(m_t.group(1))
        if val is not None and val > 0:
            taxes.append(val)
    if taxes:
        fields.tax_amount = round(sum(taxes), 2)

    # --- Grand Total ---
    m_tot = re.search(r"(?:Total\s*Due|Total\s*Balance|Grand\s*Total|Net\s*Payable)[:\s\-]*([$€£₹]?\s*[\d,]+(?:\.\d{2})?)", combined_meta_text, re.I)
    if not m_tot:
        m_tot = re.search(r"(?<!Sub\s)(?<!Sub-)(?<!State\s)(?<!Tax\s)\bTotal[:\s\-]*([$€£₹]?\s*[\d,]+(?:\.\d{2})?)(?!\s*%)", combined_meta_text, re.I)
    if m_tot:
        fields.total_amount = _parse_currency_amount(m_tot.group(1))

    # Cross-checks for totals
    if fields.total_amount is None and fields.subtotal is not None and fields.tax_amount is not None:
        fields.total_amount = round(fields.subtotal + fields.tax_amount, 2)
    elif fields.tax_amount is None and fields.total_amount is not None and fields.subtotal is not None:
        diff = round(fields.total_amount - fields.subtotal, 2)
        if diff > 0:
            fields.tax_amount = diff

    # --- Bank Details ---
    bank_info = {}
    m_bn = re.search(r"Bank\s*Name[:\s\-]+([A-Za-z0-9\s.,&'-]+?)(?=\n|Account|Branch|IFSC|$)", combined_meta_text, re.I)
    if m_bn:
        bank_info["bank_name"] = m_bn.group(1).strip()
    m_ac = re.search(r"(?:Account\s*No\.?|Account\s*Number)[:\s\-]+([A-Za-z0-9\s]+?)(?=\n|Branch|IFSC|Routing|$)", combined_meta_text, re.I)
    if m_ac:
        bank_info["account_number"] = m_ac.group(1).strip()
    m_ifsc = re.search(r"IFSC\s*Code?[:\s\-]+([A-Za-z0-9]+)", combined_meta_text, re.I)
    if m_ifsc:
        bank_info["ifsc_code"] = m_ifsc.group(1).strip()
    if bank_info:
        fields.bank_details = bank_info

    # --- Line Items ---
    # Case A: Check digital tables
    for table in tables:
        if len(table.rows) > 0 and len(table.headers) > 1:
            for row in table.rows:
                if any(row) and not any("remittance" in str(c).lower() or "bank" in str(c).lower() for c in row):
                    item_dict = {}
                    for idx, col_val in enumerate(row):
                        header = table.headers[idx] if idx < len(table.headers) else f"col_{idx}"
                        item_dict[header.strip() or f"col_{idx}"] = col_val.strip() if col_val else ""
                    fields.line_items.append(item_dict)

    # Case B: If table_boxes present, parse structured line items
    if not fields.line_items and table_lines:
        for tl in table_lines:
            cleaned_tl = re.sub(r"\d+(?:\.\d+)?\s*%", "", tl)
            amounts = re.findall(r"[$€£₹]?\s*[\d,]+(?:\.\d{2})", cleaned_tl)
            if len(amounts) >= 1 and not re.search(r"(sub\s*total|subtotal|cgst|sgst|state\s*tax|total\s*due|remittance)", tl, re.I):
                desc = re.sub(r"[$€£₹]?\s*[\d,]+(?:\.\d{2})", "", tl)
                desc = re.sub(r"\b\d+(?:\.\d+)?\s*%", "", desc)
                desc = re.sub(r"^\s*[\d.]+\s+", "", desc).strip()
                desc = re.sub(r"%\s*$", "", desc).strip()
                fields.line_items.append({
                    "description": desc or tl,
                    "amount": _parse_currency_amount(amounts[-1]),
                    "rate": _parse_currency_amount(amounts[-2]) if len(amounts) >= 2 else None,
                })

    # --- Field Confidences: STRICT 100.0 or 0.0 (User rule: if less than full, MUST BE 0. Never 80 or 90) ---
    fields.field_confidences = {
        "invoice_number": 100.0 if fields.invoice_number else 0.0,
        "invoice_date": 100.0 if fields.invoice_date else 0.0,
        "due_date": 100.0 if fields.due_date else 0.0,
        "vendor_name": 100.0 if fields.vendor_name else 0.0,
        "customer_name": 100.0 if fields.customer_name else 0.0,
        "total_amount": 100.0 if fields.total_amount is not None else 0.0,
        "subtotal": 100.0 if fields.subtotal is not None else 0.0,
        "tax_amount": 100.0 if fields.tax_amount is not None else 0.0,
        "currency": 100.0 if fields.currency else 0.0,
        "po_number": 100.0 if fields.po_number else 0.0,
        "original_invoice_number": 100.0 if fields.original_invoice_number else 0.0,
    }

    # Overall Confidence: 100.0 if core fields are present and valid, otherwise strictly 0.0
    core_present = bool(fields.invoice_number and (fields.total_amount is not None) and (fields.invoice_date or fields.due_date))
    fields.confidence_score = 100.0 if core_present else 0.0

    # Populate KeyValuePair list
    for k, v in fields.field_confidences.items():
        val = getattr(fields, k, None)
        if val is not None and str(val).strip():
            kvs.append(KeyValuePair(key=k.replace("_", " ").title(), value=str(val)))

    return kvs, fields


def _run_ocr_on_image(
    image: Image.Image,
    scale: float = 1.0
) -> Tuple[List[OCRWord], List[OCRLine], str, List[_UnifiedBox]]:
    """Run RapidOCR on a PIL image and return words, lines, joined text, and unified boxes."""
    engine = get_ocr_engine()
    img_np = np.array(image)
    ocr_result, _ = engine(img_np)

    words: List[OCRWord] = []
    lines: List[OCRLine] = []
    full_text_list: List[str] = []
    boxes: List[_UnifiedBox] = []

    if not ocr_result:
        return words, lines, "", boxes

    for item in ocr_result:
        pts, text, score = item
        text = str(text).strip()
        if not text:
            continue

        score_val = float(score) if score is not None else 1.0

        x_coords = [p[0] / scale for p in pts]
        y_coords = [p[1] / scale for p in pts]
        min_x = float(min(x_coords))
        min_y = float(min(y_coords))
        max_x = float(max(x_coords))
        max_y = float(max(y_coords))

        bbox = BoundingBox(
            x0=min_x,
            y0=min_y,
            x1=max_x,
            y1=max_y,
            polygon=[[p[0] / scale, p[1] / scale] for p in pts],
        )

        full_text_list.append(text)
        boxes.append(_UnifiedBox(text, min_x, min_y, max_x, max_y, conf=score_val))

        line = OCRLine(
            text=text,
            confidence=score_val,
            bbox=bbox,
            words=[]
        )

        raw_words = text.split()
        if len(raw_words) > 1:
            line_w = max_x - min_x
            w_step = line_w / len(raw_words)
            for w_idx, w_text in enumerate(raw_words):
                wx0 = min_x + (w_idx * w_step)
                wx1 = min_x + ((w_idx + 1) * w_step)
                w_obj = OCRWord(
                    text=w_text,
                    confidence=score_val,
                    bbox=BoundingBox(x0=wx0, y0=min_y, x1=wx1, y1=max_y),
                )
                words.append(w_obj)
                line.words.append(w_obj)
        else:
            w_obj = OCRWord(text=text, confidence=score_val, bbox=bbox)
            words.append(w_obj)
            line.words.append(w_obj)

        lines.append(line)

    full_text = "\n".join(full_text_list)
    return words, lines, full_text, boxes


def _classify_layout_blocks(
    lines: List[OCRLine],
    page_height: float,
    tables: List[TableLayout]
) -> List[LayoutBlock]:
    """Group lines into logical layout blocks: header, footer, table, key_value, paragraph."""
    blocks: List[LayoutBlock] = []

    header_threshold = page_height * 0.15
    footer_threshold = page_height * 0.85

    sorted_lines = sorted(lines, key=lambda l: (l.bbox.y0, l.bbox.x0))
    current_group: List[OCRLine] = []
    current_type: str = "paragraph"

    def flush_group(lines_to_flush: List[OCRLine], btype: str):
        if not lines_to_flush:
            return
        min_x = min(l.bbox.x0 for l in lines_to_flush)
        min_y = min(l.bbox.y0 for l in lines_to_flush)
        max_x = max(l.bbox.x1 for l in lines_to_flush)
        max_y = max(l.bbox.y1 for l in lines_to_flush)
        text = "\n".join(l.text for l in lines_to_flush)
        avg_conf = sum(l.confidence for l in lines_to_flush) / len(lines_to_flush)

        blocks.append(
            LayoutBlock(
                id=str(uuid.uuid4())[:8],
                type=btype,
                text=text,
                bbox=BoundingBox(x0=min_x, y0=min_y, x1=max_x, y1=max_y),
                confidence=round(avg_conf, 3),
                lines=list(lines_to_flush),
            )
        )

    for line in sorted_lines:
        line_type = "paragraph"
        if line.bbox.y1 <= header_threshold:
            line_type = "header"
        elif line.bbox.y0 >= footer_threshold:
            line_type = "footer"
        elif ":" in line.text or any(k in line.text.lower() for k in ["total", "inv", "tax", "date", "due", "balance"]):
            line_type = "key_value"

        if current_type != line_type:
            flush_group(current_group, current_type)
            current_group = [line]
            current_type = line_type
        else:
            current_group.append(line)

    flush_group(current_group, current_type)
    return blocks


def _process_pdf_page(
    page_idx: int,
    pdf_plumber_doc: pdfplumber.PDF,
    pypdf_doc: pypdfium2.PdfDocument,
    force_ocr: bool = False
) -> Tuple[PageLayout, List[_UnifiedBox]]:
    """Extract layout, text, tables, and OCR data for a single PDF page."""
    plumber_page = pdf_plumber_doc.pages[page_idx]
    width = float(plumber_page.width)
    height = float(plumber_page.height)

    # 1. Digital table extraction via pdfplumber
    extracted_tables: List[TableLayout] = []
    raw_tables = plumber_page.extract_tables() or []
    for t_idx, raw_table in enumerate(raw_tables):
        if raw_table and len(raw_table) > 0:
            headers = [str(c or "").strip() for c in raw_table[0]]
            rows = [[str(c or "").strip() for c in row] for row in raw_table[1:]]
            extracted_tables.append(
                TableLayout(
                    table_id=f"table_{page_idx+1}_{t_idx+1}",
                    rows_count=len(raw_table),
                    cols_count=len(headers),
                    headers=headers,
                    rows=rows,
                )
            )

    # 2. Check for digital text
    raw_words = plumber_page.extract_words()
    has_digital_text = len(raw_words) >= 5

    words: List[OCRWord] = []
    lines: List[OCRLine] = []
    boxes: List[_UnifiedBox] = []
    page_text = ""
    ocr_applied = False

    if has_digital_text and not force_ocr:
        for w in raw_words:
            w_text = w.get("text", "").strip()
            if not w_text:
                continue
            w_bbox = BoundingBox(
                x0=float(w["x0"]),
                y0=float(w["top"]),
                x1=float(w["x1"]),
                y1=float(w["bottom"]),
            )
            ocr_w = OCRWord(text=w_text, confidence=1.0, bbox=w_bbox)
            words.append(ocr_w)
            boxes.append(_UnifiedBox(w_text, float(w["x0"]), float(w["top"]), float(w["x1"]), float(w["bottom"]), conf=1.0))

        # Group words by approx vertical line (bucket by ~5 points)
        line_buckets: Dict[int, List[OCRWord]] = {}
        for ocr_w in words:
            y_bucket = int(ocr_w.bbox.y0 // 5) * 5
            line_buckets.setdefault(y_bucket, []).append(ocr_w)

        for _, bucket_words in sorted(line_buckets.items(), key=lambda x: x[0]):
            bucket_words.sort(key=lambda w: w.bbox.x0)
            line_text = " ".join(w.text for w in bucket_words)
            min_x = min(w.bbox.x0 for w in bucket_words)
            min_y = min(w.bbox.y0 for w in bucket_words)
            max_x = max(w.bbox.x1 for w in bucket_words)
            max_y = max(w.bbox.y1 for w in bucket_words)
            lines.append(
                OCRLine(
                    text=line_text,
                    confidence=1.0,
                    bbox=BoundingBox(x0=min_x, y0=min_y, x1=max_x, y1=max_y),
                    words=bucket_words,
                )
            )
        page_text = "\n".join(l.text for l in lines)
    else:
        # Run RapidOCR on rendered PDF page
        ocr_applied = True
        scale = 2.0
        pypdf_page = pypdf_doc.get_page(page_idx)
        rendered_img = pypdf_page.render(scale=scale).to_pil()
        words, lines, page_text, boxes = _run_ocr_on_image(rendered_img, scale=scale)

    blocks = _classify_layout_blocks(lines, height, extracted_tables)
    kvs, _ = _extract_fields_from_boxes(boxes, width, height, extracted_tables)

    page = PageLayout(
        page_number=page_idx + 1,
        width=width,
        height=height,
        has_digital_text=has_digital_text,
        ocr_applied=ocr_applied,
        text=page_text,
        blocks=blocks,
        tables=extracted_tables,
        words=words,
        key_values=kvs,
    )
    return page, boxes


def _process_image_content(
    file_bytes: bytes,
    file_name: str,
    file_type: str,
    my_company_gstin: Optional[str] = None,
    my_company_name: Optional[str] = None,
) -> OCRLayoutResponse:
    """Process a single image file through RapidOCR and extract layout & fields."""
    raw_img = Image.open(io.BytesIO(file_bytes))
    if raw_img.mode in ("RGBA", "P"):
        img = Image.new("RGB", raw_img.size, (255, 255, 255))
        img.paste(raw_img, mask=raw_img.split()[3] if raw_img.mode == "RGBA" else None)
    else:
        img = raw_img.convert("RGB")
    width, height = float(img.width), float(img.height)

    words, lines, full_text, boxes = _run_ocr_on_image(img, scale=1.0)
    blocks = _classify_layout_blocks(lines, height, [])
    kvs, fields = _extract_fields_from_boxes(boxes, width, height, [])

    # Classify document type
    classification = classify_document(
        full_text,
        file_name=file_name,
        tables=[],
        my_company_gstin=my_company_gstin,
        my_company_name=my_company_name,
    )
    doc_type = classification.get("document_type", "Tax Invoice")
    raw_conf = classification.get("confidence_score", 0.0)
    conf = 100.0 if (raw_conf and raw_conf > 0.0 and full_text.strip()) else 0.0
    reason = classification.get("reason", "")
    direction = classification.get("transaction_direction", "UNKNOWN")
    is_valid_gst = classification.get("is_valid_gst_document", False)
    extracted_gstins = classification.get("extracted_gstins", [])

    fields.document_type = doc_type
    fields.document_type_confidence = conf
    fields.document_type_reason = reason
    fields.transaction_direction = direction
    fields.is_valid_gst_document = is_valid_gst
    fields.extracted_gstins = extracted_gstins

    page = PageLayout(
        page_number=1,
        width=width,
        height=height,
        has_digital_text=False,
        ocr_applied=True,
        text=full_text,
        blocks=blocks,
        tables=[],
        words=words,
        key_values=kvs,
    )

    return OCRLayoutResponse(
        id=str(uuid.uuid4()),
        file_name=file_name,
        file_type=file_type,
        page_count=1,
        status="completed",
        raw_text=full_text,
        document_type=doc_type,
        confidence_score=fields.confidence_score,
        transaction_direction=direction,
        is_valid_gst_document=is_valid_gst,
        extracted_gstins=extracted_gstins,
        classification_reasoning=reason,
        pages=[page],
        extracted_fields=fields,
        created_at=datetime.now(timezone.utc),
    )


def extract_document_layout(
    file_bytes: bytes,
    file_name: str,
    file_type: str = "application/pdf",
    force_ocr: bool = False,
    my_company_gstin: Optional[str] = None,
    my_company_name: Optional[str] = None,
) -> OCRLayoutResponse:
    """Main extraction pipeline: handles both PDF (digital & scanned) and images."""
    is_pdf = file_name.lower().endswith(".pdf") or "pdf" in file_type.lower()

    if not is_pdf:
        return _process_image_content(
            file_bytes=file_bytes,
            file_name=file_name,
            file_type=file_type,
            my_company_gstin=my_company_gstin,
            my_company_name=my_company_name,
        )

    # Process PDF
    pdf_plumber_doc = pdfplumber.open(io.BytesIO(file_bytes))
    pypdf_doc = pypdfium2.PdfDocument(file_bytes)
    page_count = len(pdf_plumber_doc.pages)

    pages: List[PageLayout] = []
    combined_texts: List[str] = []
    all_tables: List[TableLayout] = []
    all_boxes: List[_UnifiedBox] = []

    for idx in range(page_count):
        page_res, page_boxes = _process_pdf_page(idx, pdf_plumber_doc, pypdf_doc, force_ocr=force_ocr)
        pages.append(page_res)
        combined_texts.append(page_res.text)
        all_tables.extend(page_res.tables)
        all_boxes.extend(page_boxes)

    full_text = "\n\n--- Page Break ---\n\n".join(combined_texts)
    first_w = pages[0].width if pages else 612.0
    first_h = pages[0].height if pages else 792.0
    _, fields = _extract_fields_from_boxes(all_boxes, first_w, first_h, all_tables)

    # Classify document type
    classification = classify_document(
        full_text,
        file_name=file_name,
        tables=all_tables,
        my_company_gstin=my_company_gstin,
        my_company_name=my_company_name,
    )
    doc_type = classification.get("document_type", "Tax Invoice")
    raw_conf = classification.get("confidence_score", 0.0)
    conf = 100.0 if (raw_conf and raw_conf > 0.0 and full_text.strip()) else 0.0
    reason = classification.get("reason", "")
    direction = classification.get("transaction_direction", "UNKNOWN")
    is_valid_gst = classification.get("is_valid_gst_document", False)
    extracted_gstins = classification.get("extracted_gstins", [])

    fields.document_type = doc_type
    fields.document_type_confidence = conf
    fields.document_type_reason = reason
    fields.transaction_direction = direction
    fields.is_valid_gst_document = is_valid_gst
    fields.extracted_gstins = extracted_gstins

    return OCRLayoutResponse(
        id=str(uuid.uuid4()),
        file_name=file_name,
        file_type=file_type,
        page_count=page_count,
        status="completed",
        raw_text=full_text,
        document_type=doc_type,
        confidence_score=fields.confidence_score,
        transaction_direction=direction,
        is_valid_gst_document=is_valid_gst,
        extracted_gstins=extracted_gstins,
        classification_reasoning=reason,
        pages=pages,
        extracted_fields=fields,
        created_at=datetime.now(timezone.utc),
    )


# Database CRUD operations
def save_extraction_to_db(
    db: Session,
    extraction: OCRLayoutResponse,
    invoice_id: Optional[str] = None,
    file_size: Optional[int] = None,
) -> OCRDocument:
    """Save an OCR & layout extraction result to the database."""
    determined_doc_type = extraction.document_type or getattr(extraction.extracted_fields, "document_type", "Tax Invoice")
    raw_conf = extraction.confidence_score if extraction.confidence_score is not None else getattr(extraction.extracted_fields, "confidence_score", 100.0)
    determined_confidence = 100.0 if (raw_conf is not None and raw_conf >= 100.0) else 0.0
    
    doc = OCRDocument(
        id=extraction.id or str(uuid.uuid4()),
        invoice_id=invoice_id or extraction.invoice_id,
        file_name=extraction.file_name,
        file_type=extraction.file_type,
        file_size=file_size,
        page_count=extraction.page_count,
        status=extraction.status,
        raw_text=extraction.raw_text,
        document_type=determined_doc_type,
        transaction_direction=extraction.transaction_direction,
        confidence_score=determined_confidence,
        classification_reasoning=extraction.classification_reasoning,
        is_valid_gst_document=extraction.is_valid_gst_document or False,
        extracted_gstins=extraction.extracted_gstins or [],
        layout_data=extraction.model_dump(mode="json"),
        extracted_fields=extraction.extracted_fields.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(doc)

    # If linked to an invoice, also update invoice's document_type & confidence_score
    target_invoice_id = invoice_id or extraction.invoice_id
    if target_invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == target_invoice_id).first()
        if inv:
            inv.document_type = determined_doc_type
            inv.confidence_score = determined_confidence

    db.commit()
    db.refresh(doc)
    return doc


def get_extraction_by_id(db: Session, extraction_id: str) -> Optional[OCRDocument]:
    """Retrieve an extraction record by its UUID or invoice_id."""
    doc = db.query(OCRDocument).filter(OCRDocument.id == extraction_id).first()
    if not doc:
        doc = (
            db.query(OCRDocument)
            .filter(OCRDocument.invoice_id == extraction_id)
            .order_by(OCRDocument.created_at.desc())
            .first()
        )
    return doc


def get_extraction_by_invoice_id(db: Session, invoice_id: str) -> Optional[OCRDocument]:
    """Retrieve the latest OCR extraction record associated with an invoice_id (or matching file_name)."""
    doc = (
        db.query(OCRDocument)
        .filter(OCRDocument.invoice_id == invoice_id)
        .order_by(OCRDocument.created_at.desc())
        .first()
    )
    if not doc:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if inv and inv.file_name:
            doc = (
                db.query(OCRDocument)
                .filter(OCRDocument.file_name == inv.file_name)
                .order_by(OCRDocument.created_at.desc())
                .first()
            )
    return doc


def update_extraction_by_invoice_id(
    db: Session,
    invoice_id: str,
    extracted_fields_update: Dict[str, Any],
) -> Optional[OCRDocument]:
    """Update extracted_fields and layout_data for an invoice's OCR record when edited in Review/Correction."""
    doc = get_extraction_by_invoice_id(db, invoice_id=invoice_id)
    if not doc:
        return None

    current_fields = dict(doc.extracted_fields or {})
    current_fields.update(extracted_fields_update)
    doc.extracted_fields = current_fields

    if doc.layout_data and isinstance(doc.layout_data, dict):
        layout_copy = dict(doc.layout_data)
        layout_fields = dict(layout_copy.get("extracted_fields") or {})
        layout_fields.update(extracted_fields_update)
        layout_copy["extracted_fields"] = layout_fields
        doc.layout_data = layout_copy

    if "document_type" in extracted_fields_update and extracted_fields_update["document_type"]:
        doc.document_type = extracted_fields_update["document_type"]
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if inv:
            inv.document_type = extracted_fields_update["document_type"]

    doc.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(doc)
    return doc


def list_extractions(db: Session, skip: int = 0, limit: int = 50) -> List[OCRDocument]:
    """List extraction records with pagination."""
    return db.query(OCRDocument).order_by(OCRDocument.created_at.desc()).offset(skip).limit(limit).all()


def delete_extraction(db: Session, extraction_id: str) -> bool:
    """Delete an extraction record by its ID."""
    doc = db.query(OCRDocument).filter(OCRDocument.id == extraction_id).first()
    if not doc:
        return False
    db.delete(doc)
    db.commit()
    return True
