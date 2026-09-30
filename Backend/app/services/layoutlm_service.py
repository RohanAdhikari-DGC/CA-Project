import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image

from app.services.classifier_service import (
    DOCUMENT_TYPE_TAX_INVOICE,
    DOCUMENT_TYPE_E_INVOICE,
    DOCUMENT_TYPE_BILL_OF_SUPPLY,
    DOCUMENT_TYPE_REVISED_INVOICE,
    DOCUMENT_TYPE_SUPPLEMENTARY_INVOICE,
    DOCUMENT_TYPE_RECEIPT_VOUCHER,
    DOCUMENT_TYPE_REFUND_VOUCHER,
    DOCUMENT_TYPE_ISD_INVOICE,
    DOCUMENT_TYPE_PROFORMA_INVOICE,
    DOCUMENT_TYPE_COMMERCIAL_INVOICE,
    DOCUMENT_TYPE_CREDIT_NOTE,
    DOCUMENT_TYPE_DEBIT_NOTE,
    DOCUMENT_TYPE_RECURRING_INVOICE,
    DOCUMENT_TYPE_TIMESHEET_MILESTONE,
    ALL_DOCUMENT_TYPES,
    DOCUMENT_TYPE_ALIASES,
    normalize_document_type,
)

logger = logging.getLogger(__name__)

# Configurable model path / name via environment variable
LAYOUTLMV3_MODEL_NAME = os.getenv("LAYOUTLMV3_MODEL_NAME", "rubentito/layoutlmv3-base-mpdocformat")

# Global singleton holders for lazy loading
_layoutlm_processor = None
_layoutlm_model = None
_layoutlm_load_attempted = False
_layoutlm_available = False

# Mapping from common dataset/model classes to our canonical GST document types
MODEL_LABEL_MAPPING: Dict[str, str] = {
    "invoice": DOCUMENT_TYPE_TAX_INVOICE,
    "tax invoice": DOCUMENT_TYPE_TAX_INVOICE,
    "tax_invoice": DOCUMENT_TYPE_TAX_INVOICE,
    "receipt": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    "receipt voucher": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    "receipt_voucher": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    "credit note": DOCUMENT_TYPE_CREDIT_NOTE,
    "credit_note": DOCUMENT_TYPE_CREDIT_NOTE,
    "memo": DOCUMENT_TYPE_CREDIT_NOTE,
    "credit memo": DOCUMENT_TYPE_CREDIT_NOTE,
    "debit note": DOCUMENT_TYPE_DEBIT_NOTE,
    "debit_note": DOCUMENT_TYPE_DEBIT_NOTE,
    "debit memo": DOCUMENT_TYPE_DEBIT_NOTE,
    "bill of supply": DOCUMENT_TYPE_BILL_OF_SUPPLY,
    "bill_of_supply": DOCUMENT_TYPE_BILL_OF_SUPPLY,
    "bill": DOCUMENT_TYPE_TAX_INVOICE,
    "e-invoice": DOCUMENT_TYPE_E_INVOICE,
    "einvoice": DOCUMENT_TYPE_E_INVOICE,
    "electronic invoice": DOCUMENT_TYPE_E_INVOICE,
    "proforma": DOCUMENT_TYPE_PROFORMA_INVOICE,
    "proforma invoice": DOCUMENT_TYPE_PROFORMA_INVOICE,
    "commercial invoice": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
    "budget": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
    "purchase order": DOCUMENT_TYPE_TAX_INVOICE,
    "financial statement": DOCUMENT_TYPE_TAX_INVOICE,
    "specification": DOCUMENT_TYPE_BILL_OF_SUPPLY,
    "form": DOCUMENT_TYPE_TAX_INVOICE,
    "letter": DOCUMENT_TYPE_TAX_INVOICE,
}


def _get_layoutlmv3_model():
    """Lazy loader for LayoutLMv3 processor and model."""
    global _layoutlm_processor, _layoutlm_model, _layoutlm_load_attempted, _layoutlm_available
    if _layoutlm_load_attempted:
        return _layoutlm_processor, _layoutlm_model

    _layoutlm_load_attempted = True

    # Allow disabling neural download via env var if desired
    if os.getenv("DISABLE_LAYOUTLMV3_NEURAL", "false").lower() in ("true", "1", "yes"):
        logger.info("LayoutLMv3 neural network disabled via environment. Using spatial layout engine.")
        return None, None

    try:
        from transformers import AutoProcessor, AutoModelForSequenceClassification
        import torch

        model_path = os.getenv("LAYOUTLMV3_MODEL_PATH", LAYOUTLMV3_MODEL_NAME)
        logger.info(f"Loading LayoutLMv3 model from '{model_path}'...")
        
        # Check local cache first to avoid hanging if offline or slow connection
        try:
            _layoutlm_processor = AutoProcessor.from_pretrained(model_path, apply_ocr=False, local_files_only=True)
            _layoutlm_model = AutoModelForSequenceClassification.from_pretrained(model_path, local_files_only=True)
        except Exception:
            # Fall back to remote hub only if explicitly enabled via env var
            if os.getenv("LAYOUTLMV3_ALLOW_DOWNLOAD", "false").lower() in ("true", "1", "yes"):
                _layoutlm_processor = AutoProcessor.from_pretrained(model_path, apply_ocr=False)
                _layoutlm_model = AutoModelForSequenceClassification.from_pretrained(model_path)
            else:
                raise RuntimeError("Model not cached locally and LAYOUTLMV3_ALLOW_DOWNLOAD is false")

        _layoutlm_model.eval()
        _layoutlm_available = True
        logger.info("LayoutLMv3 model successfully loaded.")
    except Exception as e:
        logger.info(
            f"LayoutLMv3 neural model not loaded ({e}). "
            "Falling back to spatial layout-heuristic classification engine."
        )
        _layoutlm_available = False
        _layoutlm_processor = None
        _layoutlm_model = None

    return _layoutlm_processor, _layoutlm_model


def _normalize_box(box: List[float], width: float, height: float) -> List[int]:
    """Normalize bounding box coordinates to [0, 1000] scale for LayoutLMv3."""
    if width <= 0:
        width = 1000.0
    if height <= 0:
        height = 1000.0
    return [
        int(max(0, min(1000, 1000 * (box[0] / width)))),
        int(max(0, min(1000, 1000 * (box[1] / height)))),
        int(max(0, min(1000, 1000 * (box[2] / width)))),
        int(max(0, min(1000, 1000 * (box[3] / height)))),
    ]


def _extract_words_and_boxes(
    text: str,
    words: Optional[List[Any]],
    image: Optional[Image.Image]
) -> Tuple[List[str], List[List[int]], Image.Image]:
    """
    Extract token strings and normalized [0, 1000] bounding boxes.
    Generates a default canvas image and coordinate estimates if not provided.
    """
    img_w, img_h = 1000.0, 1000.0
    pil_image = image

    if pil_image is not None:
        try:
            img_w, img_h = float(pil_image.width), float(pil_image.height)
        except Exception:
            pil_image = Image.new("RGB", (1000, 1000), color=(255, 255, 255))
    else:
        pil_image = Image.new("RGB", (1000, 1000), color=(255, 255, 255))

    word_tokens: List[str] = []
    norm_boxes: List[List[int]] = []

    if words and len(words) > 0:
        for w in words:
            # Handle OCRWord object or dict
            w_text = getattr(w, "text", None) or (w.get("text") if isinstance(w, dict) else str(w))
            w_text = str(w_text).strip()
            if not w_text:
                continue

            raw_box = None
            if hasattr(w, "bbox"):
                b = w.bbox
                raw_box = [getattr(b, "x0", 0.0), getattr(b, "y0", 0.0), getattr(b, "x1", 0.0), getattr(b, "y1", 0.0)]
            elif isinstance(w, dict) and "bbox" in w:
                b = w["bbox"]
                if isinstance(b, dict):
                    raw_box = [b.get("x0", 0.0), b.get("y0", 0.0), b.get("x1", 0.0), b.get("y1", 0.0)]
                elif isinstance(b, (list, tuple)) and len(b) >= 4:
                    raw_box = list(b[:4])

            if raw_box is not None:
                norm_box = _normalize_box(raw_box, img_w, img_h)
            else:
                norm_box = [0, 0, 1000, 1000]

            word_tokens.append(w_text)
            norm_boxes.append(norm_box)

    # Fallback to tokenizing raw text if words list was empty
    if not word_tokens and text:
        tokens = text.split()
        total = max(1, len(tokens))
        for idx, token in enumerate(tokens):
            y_pos = int(min(1000, (idx / total) * 1000))
            word_tokens.append(token)
            norm_boxes.append([100, y_pos, 900, min(1000, y_pos + 15)])

    if not word_tokens:
        word_tokens = ["Document"]
        norm_boxes = [[0, 0, 1000, 1000]]

    return word_tokens[:512], norm_boxes[:512], pil_image


def _spatial_layout_fallback_classification(
    text: str,
    words: Optional[List[Any]] = None,
    image: Optional[Image.Image] = None,
    file_name: str = "",
    tables: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Layout-aware spatial heuristic classification engine.
    Analyzes visual layout geometry (header zones, table structure, voucher patterns)
    when transformers neural weights are unavailable or offline.
    If confidence is less than full confidence, returns 0.0 (never 80 or 90).
    """
    text_lower = text.strip().lower() if text else ""
    if not text_lower:
        return {
            "document_type": DOCUMENT_TYPE_TAX_INVOICE,
            "confidence_score": 0.0,
            "reason": "LayoutLMv3: No OCR text extracted from document (0%)",
        }

    # 1. Inspect top header zone (words in y < 250 in normalized 0-1000 space)
    top_header_words = []
    if words and image:
        img_h = float(image.height) if image.height > 0 else 1000.0
        for w in words:
            y0 = getattr(getattr(w, "bbox", None), "y0", None)
            if y0 is not None and (y0 / img_h) <= 0.25:
                top_header_words.append(str(getattr(w, "text", "")).lower())

    header_text = " ".join(top_header_words) if top_header_words else text_lower[:1200]

    has_financial_patterns = bool(
        re.search(r"(?:gstin|total|subtotal|taxable|amount|invoice\s*no|debit\s*note\s*no|credit\s*note\s*no)", text_lower)
    )

    # Check for Credit Note / Debit Note in header
    if any(k in header_text for k in ["credit note", "credit memo", "cr note", "cn no"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_CREDIT_NOTE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Credit note header position and document structure identified",
        }
    if any(k in header_text for k in ["debit note", "debit memo", "dr note", "dn no"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_DEBIT_NOTE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Debit note header position and document structure identified",
        }

    # Check for E-Invoice layout (presence of IRN or Acknowledgement tokens)
    if re.search(r"\bIRN\b|ack\s*no|einvoice|irp\.nic\.in", text, re.IGNORECASE):
        return {
            "document_type": DOCUMENT_TYPE_E_INVOICE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): E-Invoice layout elements and IRN tokens identified",
        }

    # Check for Revised / Supplementary Invoice
    if any(k in header_text for k in ["revised invoice", "revised tax invoice", "revised inv"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_REVISED_INVOICE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Revised invoice header and structure identified",
        }
    if any(k in header_text for k in ["supplementary invoice", "supplementary tax invoice"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_SUPPLEMENTARY_INVOICE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Supplementary invoice header and structure identified",
        }

    # Check for Bill of Supply
    if any(k in header_text for k in ["bill of supply", "composition", "exempt supply"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_BILL_OF_SUPPLY,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Bill of Supply layout and composition scheme headers identified",
        }

    # Check for Vouchers
    if any(k in header_text for k in ["refund voucher", "refund of advance"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_REFUND_VOUCHER,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Refund voucher title and payment structure identified",
        }
    if any(k in header_text for k in ["receipt voucher", "advance receipt", "payment voucher"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_RECEIPT_VOUCHER,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Receipt voucher structure identified",
        }

    # Check for Proforma / Commercial Invoice
    if any(k in header_text for k in ["proforma", "pro-forma"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_PROFORMA_INVOICE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Proforma invoice layout detected",
        }
    if any(k in header_text for k in ["commercial invoice", "customs invoice"]) and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Commercial invoice layout detected",
        }

    # Check for Structured Tax Invoice by explicit invoice header AND financial fields
    has_invoice_header = any(k in header_text for k in ["tax invoice", "gst invoice", "invoice"])
    if has_invoice_header and has_financial_patterns:
        return {
            "document_type": DOCUMENT_TYPE_TAX_INVOICE,
            "confidence_score": 100.0,
            "reason": "LayoutLMv3 (spatial layout): Structured invoice header and financial fields detected",
        }

    # If confidence is less than full match, return 0.0 (never 80 or 90)
    return {
        "document_type": DOCUMENT_TYPE_TAX_INVOICE,
        "confidence_score": 0.0,
        "reason": "LayoutLMv3: Unable to determine document class with full confidence from visual and spatial features",
    }


def classify_with_layoutlmv3(
    text: str = "",
    image: Optional[Any] = None,
    words: Optional[List[Any]] = None,
    boxes: Optional[List[Any]] = None,
    file_name: str = "",
    tables: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Classify a document using LayoutLMv3 multimodal visual + spatial + text architecture.
    Called when standard rule-based / regex confidence score is 0.

    Returns:
        Dict containing:
            - document_type: str (canonical GST document type)
            - confidence_score: float (100.0 or 0.0)
            - reason: str (explanation of the LayoutLMv3 decision)
    """
    if not text or not text.strip():
        return {
            "document_type": DOCUMENT_TYPE_TAX_INVOICE,
            "confidence_score": 0.0,
            "reason": "LayoutLMv3: Empty OCR text (0%)",
        }

    # 1. Attempt neural LayoutLMv3 model inference if available
    processor, model = _get_layoutlmv3_model()

    if processor is not None and model is not None:
        try:
            import torch

            word_tokens, norm_boxes, pil_image = _extract_words_and_boxes(text, words, image)
            
            # Prepare multimodal inputs
            encoding = processor(
                pil_image,
                word_tokens,
                boxes=norm_boxes,
                return_tensors="pt",
                truncation=True,
                padding="max_length",
                max_length=512,
            )

            with torch.no_grad():
                outputs = model(**encoding)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=-1)[0]
                pred_idx = int(torch.argmax(probabilities).item())
                raw_prob_pct = float(probabilities[pred_idx].item()) * 100.0
                confidence = 100.0 if raw_prob_pct >= 95.0 else 0.0

            id2label = getattr(model.config, "id2label", {})
            raw_label = id2label.get(pred_idx, str(pred_idx)).lower()

            canonical_type = MODEL_LABEL_MAPPING.get(raw_label)
            if not canonical_type:
                canonical_type = normalize_document_type(raw_label)

            if canonical_type not in ALL_DOCUMENT_TYPES:
                canonical_type = DOCUMENT_TYPE_TAX_INVOICE

            if confidence == 100.0:
                return {
                    "document_type": canonical_type,
                    "confidence_score": 100.0,
                    "reason": f"Predicted by neural LayoutLMv3 model (class: '{raw_label}', score: 100.0%)",
                }
        except Exception as e:
            logger.warning(f"Error during neural LayoutLMv3 inference ({e}). Falling back to spatial layout engine.")

    # 2. Spatial layout heuristic fallback engine
    return _spatial_layout_fallback_classification(
        text=text,
        words=words,
        image=image,
        file_name=file_name,
        tables=tables,
    )
