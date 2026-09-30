import re
from typing import Dict, List, Tuple, Optional, Any

# Canonical Document Types matching user specifications
DOCUMENT_TYPE_TAX_INVOICE = "Tax Invoice"
DOCUMENT_TYPE_E_INVOICE = "E-Invoice (Electronic Invoice)"
DOCUMENT_TYPE_BILL_OF_SUPPLY = "Bill of Supply"
DOCUMENT_TYPE_REVISED_INVOICE = "Revised Invoice"
DOCUMENT_TYPE_SUPPLEMENTARY_INVOICE = "Supplementary Invoice"
DOCUMENT_TYPE_RECEIPT_VOUCHER = "Receipt Voucher"
DOCUMENT_TYPE_REFUND_VOUCHER = "Refund Voucher"
DOCUMENT_TYPE_ISD_INVOICE = "Input Service Distributor (ISD) Invoice"
DOCUMENT_TYPE_PROFORMA_INVOICE = "Proforma Invoice"
DOCUMENT_TYPE_COMMERCIAL_INVOICE = "Commercial Invoice"
DOCUMENT_TYPE_CREDIT_NOTE = "Credit Note / Credit Memo"
DOCUMENT_TYPE_DEBIT_NOTE = "Debit Note / Debit Memo"
DOCUMENT_TYPE_RECURRING_INVOICE = "Recurring Invoice"
DOCUMENT_TYPE_TIMESHEET_MILESTONE = "Timesheet / Milestone Invoice"

ALL_DOCUMENT_TYPES = [
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
]

# Aliases mapping to canonical document type
DOCUMENT_TYPE_ALIASES: Dict[str, str] = {
    "tax invoice": DOCUMENT_TYPE_TAX_INVOICE,
    "gst invoice": DOCUMENT_TYPE_TAX_INVOICE,
    "taxable invoice": DOCUMENT_TYPE_TAX_INVOICE,
    "invoice": DOCUMENT_TYPE_TAX_INVOICE,
    
    "e-invoice": DOCUMENT_TYPE_E_INVOICE,
    "einvoice": DOCUMENT_TYPE_E_INVOICE,
    "electronic invoice": DOCUMENT_TYPE_E_INVOICE,
    "e invoice": DOCUMENT_TYPE_E_INVOICE,
    "e-invoice (electronic invoice)": DOCUMENT_TYPE_E_INVOICE,
    
    "bill of supply": DOCUMENT_TYPE_BILL_OF_SUPPLY,
    "composition invoice": DOCUMENT_TYPE_BILL_OF_SUPPLY,
    
    "revised invoice": DOCUMENT_TYPE_REVISED_INVOICE,
    "revised tax invoice": DOCUMENT_TYPE_REVISED_INVOICE,
    
    "supplementary invoice": DOCUMENT_TYPE_SUPPLEMENTARY_INVOICE,
    "supplementary tax invoice": DOCUMENT_TYPE_SUPPLEMENTARY_INVOICE,
    
    "receipt voucher": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    "advance receipt": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    "advance receipt voucher": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    "payment receipt voucher": DOCUMENT_TYPE_RECEIPT_VOUCHER,
    
    "refund voucher": DOCUMENT_TYPE_REFUND_VOUCHER,
    "advance refund voucher": DOCUMENT_TYPE_REFUND_VOUCHER,
    
    "input service distributor invoice": DOCUMENT_TYPE_ISD_INVOICE,
    "input service distributor": DOCUMENT_TYPE_ISD_INVOICE,
    "isd invoice": DOCUMENT_TYPE_ISD_INVOICE,
    "isd": DOCUMENT_TYPE_ISD_INVOICE,
    
    "proforma invoice": DOCUMENT_TYPE_PROFORMA_INVOICE,
    "pro-forma invoice": DOCUMENT_TYPE_PROFORMA_INVOICE,
    "proforma": DOCUMENT_TYPE_PROFORMA_INVOICE,
    "performa invoice": DOCUMENT_TYPE_PROFORMA_INVOICE,
    
    "commercial invoice": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
    "export invoice": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
    "customs invoice": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
    
    "credit note": DOCUMENT_TYPE_CREDIT_NOTE,
    "credit memo": DOCUMENT_TYPE_CREDIT_NOTE,
    "credit note / credit memo": DOCUMENT_TYPE_CREDIT_NOTE,
    "credit note/memo": DOCUMENT_TYPE_CREDIT_NOTE,
    "cr note": DOCUMENT_TYPE_CREDIT_NOTE,
    
    "debit note": DOCUMENT_TYPE_DEBIT_NOTE,
    "debit memo": DOCUMENT_TYPE_DEBIT_NOTE,
    "debit note / debit memo": DOCUMENT_TYPE_DEBIT_NOTE,
    "debit note/memo": DOCUMENT_TYPE_DEBIT_NOTE,
    "dr note": DOCUMENT_TYPE_DEBIT_NOTE,
    
    "recurring invoice": DOCUMENT_TYPE_RECURRING_INVOICE,
    "subscription invoice": DOCUMENT_TYPE_RECURRING_INVOICE,
    
    "timesheet invoice": DOCUMENT_TYPE_TIMESHEET_MILESTONE,
    "milestone invoice": DOCUMENT_TYPE_TIMESHEET_MILESTONE,
    "timesheet / milestone invoice": DOCUMENT_TYPE_TIMESHEET_MILESTONE,
    "timesheet/milestone invoice": DOCUMENT_TYPE_TIMESHEET_MILESTONE,
}

def normalize_document_type(doc_type_str: Optional[str]) -> str:
    """Normalize any document type input to its canonical name."""
    if not doc_type_str:
        return DOCUMENT_TYPE_TAX_INVOICE
    cleaned = doc_type_str.strip().lower()
    return DOCUMENT_TYPE_ALIASES.get(cleaned, doc_type_str.strip())


# Detailed classification rules
CLASSIFICATION_RULES = [
    {
        "type": DOCUMENT_TYPE_CREDIT_NOTE,
        "title_patterns": [
            r"\bcredit\s+note\b",
            r"\bcredit\s+memo\b",
            r"\bcredit\s+memorandum\b",
            r"\bcr[\s.-]*note\b",
            r"\bcn\s*no\b",
        ],
        "strong_patterns": [
            r"original\s+invoice\s*(?:no|number|ref)",
            r"against\s+invoice",
            r"reason\s+for\s+(?:issuing\s+)?credit\s+note",
            r"credit\s+note\s*(?:date|no|number|#)",
            r"credited\s+amount",
            r"goods\s+returned",
            r"sec(?:tion)?\s*34\s*\(\s*1\s*\)",
        ],
        "supporting_patterns": [
            r"\bdiscount\s+allowed\b",
            r"\bprice\s+difference\b",
            r"\bdeficiency\s+in\s+service\b",
            r"\bpost[\s-]sale\s+discount\b",
        ],
        "negative_patterns": [
            r"\bdebit\s+note\b",
            r"\bdebit\s+memo\b",
        ]
    },
    {
        "type": DOCUMENT_TYPE_DEBIT_NOTE,
        "title_patterns": [
            r"\bdebit\s+note\b",
            r"\bdebit\s+memo\b",
            r"\bdebit\s+memorandum\b",
            r"\bdr[\s.-]*note\b",
            r"\bdn\s*no\b",
        ],
        "strong_patterns": [
            r"original\s+inv(?:oice)?\s*(?:no|number|ref|:)?",
            r"against\s+invoice",
            r"reason\s+for\s+(?:issuing\s+)?debit(?:\s+note)?",
            r"debit\s+note\s*(?:date|no|number|#|:)",
            r"debited\s+amount",
            r"underbilled\s+items",
            r"sec(?:tion)?\s*34\s*\(\s*3\s*\)",
        ],
        "supporting_patterns": [
            r"\bundercharged\b",
            r"\bshort\s+billed\b",
            r"\bextra\s+fee\b",
            r"\brate\s+difference\b",
        ],
        "negative_patterns": [
            r"\bcredit\s+note\b",
            r"\bcredit\s+memo\b",
        ]
    },
    {
        "type": DOCUMENT_TYPE_E_INVOICE,
        "title_patterns": [
            r"\be[\s-]invoice\b",
            r"\belectronic\s+invoice\b",
        ],
        "strong_patterns": [
            r"\bIRN\b[\s:]+[a-fA-F0-9]{32,64}",
            r"\bIRN\s*[:#-]",
            r"invoice\s+reference\s+number",
            r"ack(?:nowledgement)?\s*no[\s:]*\d+",
            r"ack(?:nowledgement)?\s*date",
            r"irp\.nic\.in",
            r"einvoice1\.gst\.gov\.in",
            r"signed\s+by\s+nic",
        ],
        "supporting_patterns": [
            r"qr\s*code\s*verified",
            r"nic\s+irn",
            r"portal\s+irn",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_BILL_OF_SUPPLY,
        "title_patterns": [
            r"\bbill\s+of\s+supply\b",
        ],
        "strong_patterns": [
            r"composition\s+taxable\s+person",
            r"not\s+eligible\s+to\s+collect\s+tax",
            r"exempted\s+goods\s+or\s+services",
            r"composition\s+scheme",
            r"sec(?:tion)?\s*10\b",
            r"sec(?:tion)?\s*31\s*\(\s*3\s*\)\s*\(\s*c\s*\)",
        ],
        "supporting_patterns": [
            r"\bnon[\s-]taxable\s+supply\b",
            r"\bexempt\s+supply\b",
            r"\bnil[\s-]rated\b",
        ],
        "negative_patterns": [
            r"\btax\s+invoice\b",
            r"\bigst\s+payable\b",
            r"\bcgst\s+payable\b",
        ]
    },
    {
        "type": DOCUMENT_TYPE_RECEIPT_VOUCHER,
        "title_patterns": [
            r"\breceipt\s+voucher\b",
            r"\badvance\s+receipt\s+voucher\b",
            r"\badvance\s+payment\s+voucher\b",
        ],
        "strong_patterns": [
            r"advance\s+received",
            r"sec(?:tion)?\s*31\s*\(\s*3\s*\)\s*\(\s*d\s*\)",
            r"amount\s+received\s+in\s+advance",
            r"voucher\s+no",
        ],
        "supporting_patterns": [
            r"\badvance\s+towards\b",
            r"\bfuture\s+supply\b",
            r"\badvance\s+token\b",
        ],
        "negative_patterns": [
            r"\brefund\s+voucher\b",
        ]
    },
    {
        "type": DOCUMENT_TYPE_REFUND_VOUCHER,
        "title_patterns": [
            r"\brefund\s+voucher\b",
            r"\badvance\s+refund\s+voucher\b",
        ],
        "strong_patterns": [
            r"sec(?:tion)?\s*31\s*\(\s*3\s*\)\s*\(\s*e\s*\)",
            r"receipt\s+voucher\s*(?:no|number|ref)",
            r"refund\s+of\s+advance",
            r"refunded\s+amount",
        ],
        "supporting_patterns": [
            r"\bno\s+supply\s+made\b",
            r"\bcancelled\s+order\b",
            r"\breturned\s+advance\b",
        ],
        "negative_patterns": [
            r"\breceipt\s+voucher\b(?!\s*no)",
        ]
    },
    {
        "type": DOCUMENT_TYPE_ISD_INVOICE,
        "title_patterns": [
            r"\binput\s+service\s+distributor\b",
            r"\bisd\s+invoice\b",
            r"\bisd\s+credit\s+note\b",
        ],
        "strong_patterns": [
            r"credit\s+distributed\s+under\s+sec(?:tion)?\s*20",
            r"isd\s+registration\s+no",
            r"distribution\s+of\s+itc",
            r"common\s+input\s+services",
        ],
        "supporting_patterns": [
            r"\bhead\s+office\b",
            r"\bbranch\s+allocation\b",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_REVISED_INVOICE,
        "title_patterns": [
            r"\brevised\s+tax\s+invoice\b",
            r"\brevised\s+invoice\b",
            r"\brevised\s+inv\b",
            r"\brevised\b[\s\S]{0,40}\binvoice\b",
        ],
        "strong_patterns": [
            r"sec(?:tion)?\s*31\s*\(\s*3\s*\)\s*\(\s*a\s*\)",
            r"effective\s+date\s+of\s+registration",
            r"date\s+of\s+grant\s+of\s+certificate",
            r"original\s+(?:bill|inv(?:oice)?)\s*(?:no|number|:)?",
            r"reason\s+for\s+revision",
            r"\bR-INV-[A-Z0-9\-]+",
        ],
        "supporting_patterns": [
            r"\brevised\b",
            r"\bnewly\s+registered\b",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_SUPPLEMENTARY_INVOICE,
        "title_patterns": [
            r"\bsupplementary\s+tax\s+invoice\b",
            r"\bsupplementary\s+invoice\b",
            r"\bsupplementary\b[\s\S]{0,40}\binvoice\b",
        ],
        "strong_patterns": [
            r"sec(?:tion)?\s*31\s*\(\s*3\s*\)\s*\(\s*b\s*\)",
            r"supplementary\s+bill",
            r"deficiency\s+in\s+tax\s+charged",
            r"price\s+revision",
            r"original\s+ref\s*:",
            r"\bINV-\d{4}-\d+-S\b",
        ],
        "supporting_patterns": [
            r"\badditional\s+tax\s+liability\b",
            r"\bescalation\b",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_PROFORMA_INVOICE,
        "title_patterns": [
            r"\bproforma\s+invoice\b",
            r"\bpro-forma\s+invoice\b",
            r"\bproforma\b",
            r"\bperforma\s+invoice\b",
        ],
        "strong_patterns": [
            r"this\s+is\s+not\s+a\s+tax\s+invoice",
            r"quotation\s+only",
            r"preliminary\s+cost\s+estimate",
            r"for\s+customs\s+purpose\s+only",
        ],
        "supporting_patterns": [
            r"\bestimate\b",
            r"\bquote\b",
            r"\bvalid\s+until\b",
            r"\bvalidity\s+period\b",
        ],
        "negative_patterns": [
            r"\btax\s+invoice\b",
            r"\binput\s+tax\s+credit\s+eligible\b",
        ]
    },
    {
        "type": DOCUMENT_TYPE_COMMERCIAL_INVOICE,
        "title_patterns": [
            r"\bcommercial\s+invoice\b",
            r"\bexport\s+invoice\b",
            r"\bcustoms\s+invoice\b",
            r"\bconsular\s+invoice\b",
        ],
        "strong_patterns": [
            r"country\s+of\s+origin",
            r"country\s+of\s+final\s+destination",
            r"port\s+of\s+loading",
            r"port\s+of\s+discharge",
            r"bill\s+of\s+lading",
            r"shipping\s+bill",
            r"iec\s*(?:no|number)?[\s:]*[A-Z0-9]{10}",
            r"incoterms\s*(?:2020|2010)?\s*[:\-]*(?:FOB|CIF|CFR|EXW|DDP|FCA|CPT|CIP|DAP|DPU)",
            r"letter\s+of\s+credit\s*(?:no|#)?",
        ],
        "supporting_patterns": [
            r"\bvessel\s*(?:/|\s+)?flight\b",
            r"\bcontainer\s*no\b",
            r"\bcustoms\b",
            r"\bforeign\s+currency\b",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_RECURRING_INVOICE,
        "title_patterns": [
            r"\brecurring\s+invoice\b",
            r"\bsubscription\s+invoice\b",
            r"\bretainer\s+invoice\b",
        ],
        "strong_patterns": [
            r"billing\s+cycle",
            r"subscription\s+period",
            r"monthly\s+retainer",
            r"annual\s+subscription",
            r"membership\s+period",
            r"next\s+billing\s+date",
            r"auto[\s-]renewal",
        ],
        "supporting_patterns": [
            r"\bsubscription\s+id\b",
            r"\bplan\s*(?:name|tier)\b",
            r"\bmonthly\s+fee\b",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_TIMESHEET_MILESTONE,
        "title_patterns": [
            r"\btimesheet\s+invoice\b",
            r"\bmilestone\s+invoice\b",
            r"\bmilestone\s+billing\b",
            r"\btimesheet\s*(?:&|and)\s*milestone\b",
            r"\btimesheet\b",
        ],
        "strong_patterns": [
            r"hours\s+worked",
            r"billable\s+hours",
            r"total\s+hours\s+billed",
            r"hourly\s+rate",
            r"time\s+and\s+materials?",
            r"milestone\s*(?:1|2|3|4|5|one|two|three|\bcomplete\b)",
            r"sprint\s*(?:1|2|3|4|5|\d+)\s+deliverable",
            r"project\s+milestone",
            r"rate\s*per\s*hour",
        ],
        "supporting_patterns": [
            r"\btimesheet\s+summary\b",
            r"\btotal\s+hours\b",
            r"\bconsultant\s+hours\b",
            r"\bphase\s+completion\b",
        ],
        "negative_patterns": []
    },
    {
        "type": DOCUMENT_TYPE_TAX_INVOICE,
        "title_patterns": [
            r"\btax\s+invoice\b",
            r"\bgst\s+invoice\b",
            r"\btaxable\s+invoice\b",
            r"\binvoice\b",
        ],
        "strong_patterns": [
            r"input\s+tax\s+credit",
            r"original\s+for\s+recipient",
            r"duplicate\s+for\s+transporter",
            r"triplicate\s+for\s+supplier",
            r"\bGSTIN\b",
            r"\bHSN\s*(?:/\s*SAC|\s*code)?\b",
            r"\bSAC\s*(?:code)?\b",
            r"\bCGST\b",
            r"\bSGST\b",
            r"\bIGST\b",
        ],
        "supporting_patterns": [
            r"\btaxable\s+value\b",
            r"\btotal\s+tax\s+amount\b",
            r"\bplace\s+of\s+supply\b",
            r"\brcm\s*(?:applicable)?\b",
            r"\breverse\s+charge\b",
        ],
        "negative_patterns": [
            r"\bcredit\s+note\b",
            r"\bcredit\s+memo\b",
            r"\bdebit\s+note\b",
            r"\bdebit\s+memo\b",
            r"\brevised\s+invoice\b",
            r"\brevised\s+inv\b",
            r"\breason\s+for\s+revision\b",
            r"\bsupplementary\s+invoice\b",
            r"\bproforma\s+invoice\b",
            r"\bcommercial\s+invoice\b",
            r"\bbill\s+of\s+supply\b",
            r"\brefund\s+voucher\b",
            r"\breceipt\s+voucher\b",
            r"\btimesheet\b",
        ]
    }
]

# Standard Indian GSTIN Regex
GSTIN_PATTERN = r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}\b"


def determine_transaction_direction(
    text: str, 
    extracted_gstins: List[str], 
    my_company_gstin: Optional[str], 
    my_company_name: Optional[str]
) -> Tuple[str, str]:
    """Determine if document is Purchase (Inward/Vendor) or Sales (Outward/Client)"""
    text_lower = text.lower()
    
    if re.search(r"\bpurchase\s+(?:invoice|bill)\b", text_lower):
        return "INWARD (Purchase / Vendor)", "Explicitly titled as a Purchase Invoice"
    if re.search(r"\bsales\s+(?:invoice|bill)\b", text_lower):
        return "OUTWARD (Sales / Client)", "Explicitly titled as a Sales Invoice"

    if my_company_gstin and my_company_gstin.upper() in extracted_gstins:
        idx = text.upper().find(my_company_gstin.upper())
        context_window = text_lower[max(0, idx - 100):idx]

        for kw in [r"buyer", r"billed\s*to", r"ship\s*to", r"customer", r"consignee", r"to:"]:
            if re.search(kw, context_window):
                return "INWARD (Purchase / Vendor)", f"My GSTIN found under buyer context ('{kw}')"
                
        for kw in [r"supplier", r"sold\s*by", r"billed\s*by", r"issued\s*by", r"consignor", r"from:"]:
            if re.search(kw, context_window):
                return "OUTWARD (Sales / Client)", f"My GSTIN found under supplier context ('{kw}')"

    if my_company_name and my_company_name.lower() in text_lower:
        idx = text_lower.find(my_company_name.lower())
        context_window = text_lower[max(0, idx - 100):idx]
        
        if any(re.search(kw, context_window) for kw in [r"buyer", r"billed\s*to", r"ship\s*to", r"customer"]):
            return "INWARD (Purchase / Vendor)", "My Company Name found under buyer context"
        if any(re.search(kw, context_window) for kw in [r"supplier", r"sold\s*by", r"billed\s*by", r"vendor"]):
            return "OUTWARD (Sales / Client)", "My Company Name found under supplier context"

    return "UNKNOWN", "Could not determine direction from text layout"


def classify_document(
    text: str,
    file_name: str = "",
    tables: Optional[List[Any]] = None,
    my_company_gstin: Optional[str] = None,
    my_company_name: Optional[str] = None,
    image: Optional[Any] = None,
    words: Optional[List[Any]] = None,
    boxes: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Classify a document into standard GST types and determine transaction direction.
    Enforces strict binary confidence: 100.0 when confident, 0.0 if less than confident (never 90 or 80).
    """
    if not text:
        text = ""

    text_lower = text.lower()
    filename_clean = file_name.lower().replace("_", " ").replace("-", " ")

    scores: Dict[str, float] = {rule["type"]: 0.0 for rule in CLASSIFICATION_RULES}
    matches: Dict[str, List[str]] = {rule["type"]: [] for rule in CLASSIFICATION_RULES}
    direct_match_in_text: Dict[str, bool] = {rule["type"]: False for rule in CLASSIFICATION_RULES}

    header_chunk = text_lower[:1400]

    # Evaluate rules
    for rule in CLASSIFICATION_RULES:
        rtype = rule["type"]

        # 1. Title patterns
        for pattern in rule["title_patterns"]:
            if re.search(pattern, header_chunk, re.IGNORECASE):
                scores[rtype] += 60.0
                direct_match_in_text[rtype] = True
                matches[rtype].append(f"Direct title match '{pattern}' extracted from header")
                break
            elif re.search(pattern, text_lower, re.IGNORECASE):
                scores[rtype] += 35.0
                direct_match_in_text[rtype] = True
                matches[rtype].append(f"Title match '{pattern}' extracted from text body")
                break

        # Check filename (only boosts if text also has content)
        if text.strip():
            for pattern in rule["title_patterns"]:
                if re.search(pattern, filename_clean, re.IGNORECASE):
                    scores[rtype] += 25.0
                    matches[rtype].append(f"Pattern found in file name: '{file_name}'")
                    break

        # 2. Strong marker patterns
        for pattern in rule["strong_patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                scores[rtype] += 25.0
                matches[rtype].append(f"Key indicator '{pattern}' found")

        # 3. Supporting patterns
        for pattern in rule["supporting_patterns"]:
            if re.search(pattern, text, re.IGNORECASE):
                scores[rtype] += 7.0
                matches[rtype].append(f"Supporting term '{pattern}'")

        # 4. Negative patterns (Handles overlapping words like 'Invoice' inside 'Credit Note' / 'Debit Note' / 'Revised Invoice')
        for pattern in rule["negative_patterns"]:
            if re.search(pattern, header_chunk, re.IGNORECASE) or re.search(pattern, filename_clean, re.IGNORECASE):
                scores[rtype] -= 80.0

    # Special handling: E-Invoice override
    irn_found = re.search(r"\bIRN\b[\s:]+[a-fA-F0-9]{30,64}", text, re.IGNORECASE) or \
                re.search(r"invoice\s+reference\s+number", text, re.IGNORECASE)
    ack_found = re.search(r"ack(?:nowledgement)?\s*no[\s:]*\d+", text, re.IGNORECASE)
    
    if irn_found:
        scores[DOCUMENT_TYPE_E_INVOICE] += 80.0
        direct_match_in_text[DOCUMENT_TYPE_E_INVOICE] = True
        matches[DOCUMENT_TYPE_E_INVOICE].append("Direct IRN portal registration extracted")
    elif ack_found and scores[DOCUMENT_TYPE_E_INVOICE] > 0:
        scores[DOCUMENT_TYPE_E_INVOICE] += 40.0
        direct_match_in_text[DOCUMENT_TYPE_E_INVOICE] = True
        matches[DOCUMENT_TYPE_E_INVOICE].append("Acknowledgement number extracted")

    # Pick top scoring type
    sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_type, top_score = sorted_types[0]

    # GSTIN extraction & Direction evaluation
    extracted_gstins = list(set(re.findall(GSTIN_PATTERN, text.upper())))
    direction, direction_reason = determine_transaction_direction(
        text, extracted_gstins, my_company_gstin, my_company_name
    )

    # Require a legitimate document match (score >= 50.0 and direct title/strong match in text).
    # If confidence is less than threshold, it is strictly 0.0 (never 90, 80, 70, or 7).
    has_legitimate_match = bool(text.strip()) and top_score >= 50.0 and (
        direct_match_in_text.get(top_type, False) or top_score >= 60.0
    )
    initial_confidence = 100.0 if has_legitimate_match else 0.0
    classifier_used = "RuleBased"

    # IF THE CONFIDENCE SCORE IS 0 -> FALLBACK TO LAYOUTLMv3 FOR CLASSIFICATION
    if initial_confidence == 0.0:
        from app.services.layoutlm_service import classify_with_layoutlmv3

        layout_res = classify_with_layoutlmv3(
            text=text,
            image=image,
            words=words,
            boxes=boxes,
            file_name=file_name,
            tables=tables,
        )
        layout_type = layout_res.get("document_type")
        layout_conf = float(layout_res.get("confidence_score", 0.0) or 0.0)
        layout_reason = layout_res.get("reason", "")

        if layout_conf >= 100.0 and layout_type:
            top_type = layout_type
            confidence_score = 100.0
            classifier_used = "LayoutLMv3"
            reason = f"Type: {top_type} [LayoutLMv3] (100.0%). {layout_reason}. Direction: {direction_reason}"
        else:
            top_type = DOCUMENT_TYPE_TAX_INVOICE
            confidence_score = 0.0
            reason = f"Type: Not found (0.0%). LayoutLMv3: {layout_reason}. Direction: {direction_reason}"
    else:
        confidence_score = 100.0
        matched_details = ", ".join(matches[top_type][:3]) if matches[top_type] else "indicators in extracted text"
        reason = f"Type: {matched_details} (100.0%). Direction: {direction_reason}"

    return {
        "document_type": top_type,
        "confidence_score": confidence_score,
        "reason": reason,
        "transaction_direction": direction,
        "is_valid_gst_document": len(extracted_gstins) > 0,
        "extracted_gstins": extracted_gstins,
        "available_types": ALL_DOCUMENT_TYPES,
        "classifier": classifier_used,
    }