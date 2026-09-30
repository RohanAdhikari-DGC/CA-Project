import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import invoiceService from '../../services/invoice_service';

// --- Helper Components ---
const ConfBadge = ({ band, pct }) => {
  if (!band) return null;
  const colors =
    band === 'High'
      ? 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]'
      : band === 'Medium'
      ? 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]'
      : 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]';
  return (
    <span
      className={`group inline-flex items-center gap-1 px-[7px] py-[1px] rounded-full border text-[10.5px] font-bold cursor-default ${colors}`}
      title={`${band} confidence — ${pct}%`}
    >
      {band} <span className="font-semibold opacity-85 hidden group-hover:inline">{pct}%</span>
    </span>
  );
};

const SourceTag = ({ source }) => {
  const s =
    {
      extracted: { label: 'Extracted', code: 'EX', cls: 'bg-[#e7f0fa] text-[#0b5cad]' },
      mapped: { label: 'Mapped', code: 'MP', cls: 'bg-[#efe7fa] text-[#6a3fb5]' },
      system: { label: 'System-generated', code: 'SYS', cls: 'bg-[#eef0f3] text-[#4e5867]' },
    }[source] || { label: 'Extracted', code: 'EX', cls: 'bg-[#e7f0fa] text-[#0b5cad]' };

  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#5a6472] bg-[#fafbfc] border border-[#d7dbe2] rounded px-[6px] py-[1px] cursor-default pl-1"
      title={s.label}
    >
      <span className={`font-mono text-[9px] font-bold rounded-[3px] px-[3px] ${s.cls}`}>{s.code}</span>
      {s.label}
    </span>
  );
};

const IssueChip = ({ severity }) => {
  const map = { informational: 'info', warning: 'warning', blocking: 'danger', critical: 'danger' };
  const label = severity.charAt(0).toUpperCase() + severity.slice(1);
  const colors = {
    info: 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]',
    warning: 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]',
    danger: 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]',
    success: 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]',
  }[map[severity] || 'info'];

  return (
    <span
      className={`inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] ${colors}`}
    >
      <span className="w-[7px] h-[7px] rounded-full bg-current"></span>
      {label}
    </span>
  );
};

const getConfidenceBand = (score) => {
  const pct = typeof score === 'number' ? Math.round(score) : 100;
  if (pct >= 85) return { band: 'High', pct };
  if (pct >= 60) return { band: 'Medium', pct };
  return { band: 'Low', pct };
};

const formatRelativeAge = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  } catch {
    return '—';
  }
};

const buildFormDataFromOcr = (invoice, ocrDoc) => {
  const fields = ocrDoc?.extracted_fields || {};
  const confScore = ocrDoc?.confidence_score ?? invoice?.confidenceScore ?? 100;
  const { band, pct } = getConfidenceBand(confScore);

  const rawLines = Array.isArray(fields.line_items) ? fields.line_items : [];
  const mappedLines = rawLines.map((item, idx) => {
    const keys = Object.keys(item || {});
    const descVal =
      item.description ||
      item.Description ||
      item.item ||
      item.service ||
      item.col_0 ||
      item.col_1 ||
      (keys.length > 0 ? String(item[keys[0]] || '') : '');
    const qtyVal = item.qty || item.quantity || item.Quantity || item['Hrs/Qty'] || item.col_2 || '1';
    const unitVal = item.unit_price || item.unit || item.rate || item['Rate/Price'] || item.col_3 || '';
    const amountVal = item.amount || item.total || item['Sub Total'] || item.col_4 || '';

    return {
      key: `l_${idx + 1}`,
      desc: String(descVal || ''),
      qty: String(qtyVal || ''),
      unit: String(unitVal || ''),
      amount: String(amountVal || ''),
      band,
      pct,
    };
  });

  return {
    id: invoice?.id || ocrDoc?.invoice_id || '',
    fileName: invoice?.fileName || ocrDoc?.file_name || '',
    documentType: ocrDoc?.document_type || invoice?.documentType || 'Tax Invoice',
    rawText: ocrDoc?.raw_text || '',
    pageCount: ocrDoc?.page_count || 1,
    blobPath: invoice?.blobPath || '',
    blobUrl: invoice?.blobUrl || invoice?.previewUrl || '',
    header: [
      { key: 'vendor_name', label: 'Vendor', value: fields.vendor_name || '', band, pct, source: 'extracted' },
      { key: 'invoice_number', label: 'Invoice number', value: fields.invoice_number || '', band, pct, source: 'extracted' },
      { key: 'invoice_date', label: 'Invoice date', value: fields.invoice_date || '', band, pct, source: 'extracted' },
      { key: 'due_date', label: 'Due date', value: fields.due_date || '', band, pct, source: 'extracted' },
      { key: 'currency', label: 'Currency', value: fields.currency || 'INR', band, pct, source: 'extracted' },
      { key: 'customer_name', label: 'Customer / Bill to', value: fields.customer_name || '', band, pct, source: 'extracted' },
      { key: 'document_type', label: 'Document type', value: ocrDoc?.document_type || invoice?.documentType || 'Tax Invoice', band, pct, source: 'extracted' },
      {
        key: 'gstin',
        label: 'Detected GSTIN(s)',
        value: Array.isArray(ocrDoc?.extracted_gstins) && ocrDoc.extracted_gstins.length > 0
          ? ocrDoc.extracted_gstins.join(', ')
          : '',
        band,
        pct,
        source: 'extracted',
      },
    ],
    lines: mappedLines,
    totals: [
      {
        key: 'subtotal',
        label: 'Subtotal',
        value: fields.subtotal !== null && fields.subtotal !== undefined ? String(fields.subtotal) : '',
        band,
        pct,
        source: 'extracted',
      },
      {
        key: 'tax_amount',
        label: 'Tax amount',
        value: fields.tax_amount !== null && fields.tax_amount !== undefined ? String(fields.tax_amount) : '',
        band,
        pct,
        source: 'extracted',
      },
      {
        key: 'total_amount',
        label: 'Total due',
        value: fields.total_amount !== null && fields.total_amount !== undefined ? String(fields.total_amount) : '',
        band,
        pct,
        source: 'extracted',
        grand: true,
      },
    ],
  };
};

const PendingReviewPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedInvoiceId = searchParams.get('invoiceId') || searchParams.get('id') || '';

  const [queueDocs, setQueueDocs] = useState([]);
  const [queueCounts, setQueueCounts] = useState({ pending: 0, correction: 0, flagged: 0 });
  const [activeDocId, setActiveDocId] = useState(requestedInvoiceId);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [docData, setDocData] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);

  const [zoomLevel, setZoomLevel] = useState(1); // 1: 100%, 2: 125%, 3: 150%
  const [rotation, setRotation] = useState(0);
  const [autosave, setAutosave] = useState('saved'); // 'saved', 'saving', 'unsaved', 'failed'

  const saveTimeoutRef = useRef(null);

  // Load pending_review queue and counts from backend database
  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [pendingList, pendingCount, correctionCount, flaggedCount] = await Promise.all([
        invoiceService.getInvoices({ status: 'pending_review', limit: 100 }),
        invoiceService.getInvoicesCount({ status: 'pending_review' }).catch(() => 0),
        invoiceService.getInvoicesCount({ status: 'correction' }).catch(() => 0),
        invoiceService.getInvoicesCount({ status: 'flagged' }).catch(() => 0),
      ]);

      let docs = Array.isArray(pendingList) ? pendingList : [];

      // If a specific invoiceId was clicked in Incoming Documents, make sure it is included and selected
      if (requestedInvoiceId && !docs.some((d) => d.id === requestedInvoiceId)) {
        try {
          const clickedInv = await invoiceService.getInvoiceById(requestedInvoiceId);
          if (clickedInv) {
            docs = [clickedInv, ...docs];
          }
        } catch {
          // Ignore if not found
        }
      }

      setQueueDocs(docs);
      setQueueCounts({
        pending: typeof pendingCount === 'number' ? pendingCount : docs.length,
        correction: typeof correctionCount === 'number' ? correctionCount : 0,
        flagged: typeof flaggedCount === 'number' ? flaggedCount : 0,
      });

      if (requestedInvoiceId && docs.some((d) => d.id === requestedInvoiceId)) {
        setActiveDocId(requestedInvoiceId);
      } else if (docs.length > 0) {
        setActiveDocId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0].id));
      } else {
        setActiveDocId('');
        setActiveInvoice(null);
        setDocData(null);
      }
    } catch (err) {
      console.error('Failed to load pending review queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  }, [requestedInvoiceId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Load active invoice + OCR extracted data whenever activeDocId changes
  useEffect(() => {
    if (!activeDocId) {
      setActiveInvoice(null);
      setDocData(null);
      return;
    }

    let isMounted = true;
    const fetchActiveDocDetails = async () => {
      setLoadingDoc(true);
      setImageLoadFailed(false);
      setCurrentPageNum(1);
      try {
        const [inv, ocrDoc] = await Promise.all([
          invoiceService.getInvoiceById(activeDocId).catch(() => queueDocs.find((d) => d.id === activeDocId) || null),
          invoiceService.getOcrByInvoiceId(activeDocId).catch(() => null),
        ]);
        if (!isMounted) return;
        setActiveInvoice(inv);
        setDocData(buildFormDataFromOcr(inv, ocrDoc));
        setAutosave('saved');
      } catch (err) {
        console.error('Failed to load document details:', err);
      } finally {
        if (isMounted) setLoadingDoc(false);
      }
    };

    fetchActiveDocDetails();
    return () => {
      isMounted = false;
    };
  }, [activeDocId]);

  const handleSelectDoc = (id) => {
    setActiveDocId(id);
    setSearchParams({ invoiceId: id });
  };

  // Persist current docData fields to backend OCR record
  const saveExtractedFieldsToBackend = async (dataToSave = docData) => {
    if (!activeDocId || !dataToSave) return;
    setAutosave('saving');
    try {
      const payload = {};
      dataToSave.header.forEach((h) => {
        if (h.key === 'gstin') {
          payload.extracted_gstins = h.value
            ? h.value.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        } else {
          payload[h.key] = h.value || null;
        }
      });

      dataToSave.totals.forEach((t) => {
        const num = parseFloat(String(t.value || '').replace(/[^0-9.-]/g, ''));
        payload[t.key] = !isNaN(num) ? num : null;
      });

      payload.line_items = dataToSave.lines.map((l) => ({
        description: l.desc,
        quantity: l.qty,
        unit_price: l.unit,
        amount: l.amount,
      }));

      await invoiceService.updateOcrByInvoiceId(activeDocId, payload);
      setAutosave('saved');
    } catch (err) {
      console.warn('Could not save OCR fields update:', err);
      setAutosave('failed');
    }
  };

  const handleFieldChange = (section, index, key, value) => {
    setDocData((prev) => {
      if (!prev) return prev;
      const newData = { ...prev };
      newData[section] = [...prev[section]];
      newData[section][index] = { ...newData[section][index], value };
      return newData;
    });

    setAutosave('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setAutosave('saving');
      setTimeout(() => setAutosave('saved'), 500);
    }, 600);
  };

  const handleAddLineItem = () => {
    setDocData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lines: [
          ...prev.lines,
          { key: `l_${Date.now()}`, desc: '', qty: '1', unit: '', amount: '', band: 'High', pct: 100 },
        ],
      };
    });
    setAutosave('unsaved');
  };

  // Workflow Actions (Approve, Correction, Flag, Reject)
  const handleStatusTransition = async (newStatus) => {
    if (!activeDocId) return;
    try {
      await saveExtractedFieldsToBackend(docData);
      await invoiceService.updateStatus(activeDocId, newStatus);
      await loadQueue();
    } catch (err) {
      alert('Failed to update document status: ' + (err.message || 'Unknown error'));
    }
  };

  const handleReject = async () => {
    if (!activeDocId) return;
    if (!window.confirm(`Delete / reject document ${activeDocId}?`)) return;
    try {
      await invoiceService.deleteInvoice(activeDocId);
      setSearchParams({});
      await loadQueue();
    } catch (err) {
      alert('Failed to delete document: ' + (err.message || 'Unknown error'));
    }
  };

  // Compute validation issues from real extracted data
  const computeIssues = (data) => {
    if (!data) return [];
    const issues = [];
    const totalStr = data.totals.find((t) => t.key === 'total_amount')?.value || '';
    const total = parseFloat(String(totalStr).replace(/,/g, ''));

    if (!isNaN(total) && total > 100000) {
      issues.push({
        id: 'po-tolerance',
        severity: 'blocking',
        field: 'total_amount',
        title: 'Amount exceeds approval threshold',
        detail: `Invoice total ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds the configured tolerance.`,
      });
    }

    const invNo = data.header.find((h) => h.key === 'invoice_number')?.value;
    if (!invNo || !invNo.trim()) {
      issues.push({
        id: 'missing-inv-no',
        severity: 'warning',
        field: 'invoice_number',
        title: 'Invoice number was not detected automatically',
        detail: 'Please verify or enter the invoice number from the scanned document before final approval.',
      });
    }

    return issues;
  };

  const issues = computeIssues(docData);
  const hasBlocking = issues.some((i) => i.severity === 'blocking' || i.severity === 'critical');
  const errorFields = issues.map((i) => i.field).filter(Boolean);

  const getZoomScale = () => (zoomLevel === 1 ? 1 : zoomLevel === 2 ? 1.25 : 1.5);
  const getZoomText = () => (zoomLevel === 1 ? '100%' : zoomLevel === 2 ? '125%' : '150%');

  const pageImageUrl = activeDocId ? invoiceService.getInvoicePageImageUrl(activeDocId, currentPageNum) : '';
  const directFileUrl = activeDocId ? invoiceService.getInvoiceFileUrl(activeDocId) : '';
  const totalPages = docData?.pageCount || 1;

  return (
    <div className="flex flex-col h-full p-[14px_16px] overflow-hidden bg-[#f4f5f7] text-[#151a21] font-sans">
      {/* Header & Tabs */}
      <div className="flex items-center mb-[11px] flex-none">
        <h1 className="text-[17px] font-semibold mr-4 m-0 leading-[1.25]">Queue</h1>
        <div className="flex border-b border-[#d7dbe2] gap-1 m-0">
          <Link
            to="/pending"
            className="px-[13px] py-[9px] text-[13px] font-semibold text-[#0b4f96] border-b-2 border-[#0b5cad] -mb-[1px] bg-transparent cursor-pointer no-underline block"
          >
            Pending Review ({queueCounts.pending})
          </Link>
          <Link
            to="/correction"
            className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block"
          >
            Correction ({queueCounts.correction})
          </Link>
          <Link
            to="/flagged"
            className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block"
          >
            Flagged ({queueCounts.flagged})
          </Link>
        </div>

        <span className="ml-auto"></span>

        {/* Autosave */}
        {docData && (
          <div
            className={`inline-flex items-center gap-[7px] text-[12px] font-semibold px-[10px] py-[5px] rounded-[6px] border bg-[#fafbfc] mr-3 ${
              autosave === 'saving'
                ? 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]'
                : autosave === 'saved'
                ? 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]'
                : 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full bg-current ${autosave === 'saving' ? 'animate-pulse' : ''}`}></span>
            <span>{autosave === 'saving' ? 'Saving…' : autosave === 'saved' ? 'Saved' : 'Unsaved changes'}</span>
          </div>
        )}

        <button
          onClick={() => navigate('/incoming')}
          className="inline-flex items-center justify-center gap-[6px] h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] cursor-pointer"
        >
          ← Back to Incoming
        </button>
      </div>

      {/* Document Strip from Real Database */}
      <div className="flex gap-[9px] overflow-x-auto p-[9px] bg-white border border-[#d7dbe2] rounded-[10px] mb-[11px] flex-none min-h-[76px] items-center">
        {loadingQueue ? (
          <div className="text-xs text-[#5a6472] px-3">Loading pending review documents from database...</div>
        ) : queueDocs.length === 0 ? (
          <div className="flex items-center justify-between w-full px-3 py-1 text-xs text-[#5a6472]">
            <span>No documents are currently in Pending Review. Upload a document in Incoming Documents to review it here.</span>
            <button
              onClick={() => navigate('/incoming')}
              className="h-[28px] px-3 bg-[#0b5cad] text-white rounded-[6px] text-xs font-medium hover:bg-[#0a4f95] cursor-pointer"
            >
              Go to Incoming Documents
            </button>
          </div>
        ) : (
          queueDocs.map((doc) => {
            const { band, pct } = getConfidenceBand(doc.confidenceScore ?? 100);
            return (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id)}
                className={`flex-none w-[225px] text-left border rounded-[6px] p-[9px_10px] flex flex-col gap-[5px] cursor-pointer transition-colors ${
                  activeDocId === doc.id
                    ? 'border-[#0b5cad] bg-[#eef4fb] shadow-[inset_0_0_0_1px_#0b5cad]'
                    : 'border-[#d7dbe2] bg-white hover:border-[#b9c0cb] hover:bg-[#fafbfc]'
                }`}
              >
                <div className="flex items-center justify-between gap-[6px]">
                  <span className="text-[12px] font-bold font-mono truncate">{doc.id}</span>
                  <ConfBadge band={band} pct={pct} />
                </div>
                <div className="text-[12px] text-[#151a21] whitespace-nowrap overflow-hidden text-ellipsis" title={doc.fileName}>
                  {doc.fileName}
                </div>
                <div className="flex items-center justify-between gap-[6px]">
                  <span className="text-[11px] text-[#5a6472] truncate">{doc.documentType || 'Needs review'}</span>
                  <span className="text-[11px] text-[#5a6472]">{formatRelativeAge(doc.received)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Main Split Pane View */}
      {!activeDocId || (!loadingDoc && !docData) ? (
        <div className="flex-1 bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col items-center justify-center p-8 text-center text-[#5a6472]">
          <div className="text-3xl mb-2">📄</div>
          <h3 className="text-sm font-semibold text-[#151a21] mb-1">No document selected for review</h3>
          <p className="text-xs max-w-md mb-4">
            Select a pending document from the queue strip above, or upload a new image/PDF in Incoming Documents.
          </p>
          <button
            onClick={() => navigate('/incoming')}
            className="h-[32px] px-3.5 bg-[#0b5cad] text-white rounded-[6px] text-xs font-medium hover:bg-[#0a4f95] cursor-pointer"
          >
            Go to Incoming Documents
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-[12px]">
          {/* Left Pane - Actual Uploaded Image / PDF Viewer */}
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
            <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none flex-wrap">
              <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25] truncate max-w-[200px]" title={docData?.fileName}>
                {docData?.fileName || 'Uploaded document'}
              </h3>
              {docData?.blobPath && (
                <span
                  className="text-[10.5px] font-mono text-[#0b5cad] bg-[#e7f0fa] border border-[#b6d2ee] px-2 py-0.5 rounded truncate max-w-[220px]"
                  title={`Azure Blob Path: ${docData.blobPath}`}
                >
                  ☁ {docData.blobPath}
                </span>
              )}
              <span className="ml-auto"></span>
              <button
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
                className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] cursor-pointer"
              >
                −
              </button>
              <span className="text-[12px] text-[#5a6472]">{getZoomText()}</span>
              <button
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 1))}
                className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] cursor-pointer"
              >
                +
              </button>
              <button
                onClick={() => setRotation((rotation + 90) % 360)}
                className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] cursor-pointer"
                title="Rotate document"
              >
                ⟳
              </button>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPageNum <= 1}
                    onClick={() => {
                      setImageLoadFailed(false);
                      setCurrentPageNum((p) => Math.max(1, p - 1));
                    }}
                    className="px-1.5 h-[24px] text-xs border rounded bg-white disabled:opacity-40 cursor-pointer"
                  >
                    ‹
                  </button>
                  <span className="text-[12px] text-[#5a6472]">
                    Page {currentPageNum} / {totalPages}
                  </span>
                  <button
                    disabled={currentPageNum >= totalPages}
                    onClick={() => {
                      setImageLoadFailed(false);
                      setCurrentPageNum((p) => Math.min(totalPages, p + 1));
                    }}
                    className="px-1.5 h-[24px] text-xs border rounded bg-white disabled:opacity-40 cursor-pointer"
                  >
                    ›
                  </button>
                </div>
              )}
              {totalPages <= 1 && <span className="text-[12px] text-[#5a6472]">Page 1 / 1</span>}
              <a
                href={directFileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] text-[#0b5cad] hover:underline ml-1"
              >
                Open file ↗
              </a>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-[#5b6472] p-[18px] flex justify-center items-start">
              {loadingDoc ? (
                <div className="text-white text-xs py-16 flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Loading document & extracted OCR layout...
                </div>
              ) : !imageLoadFailed ? (
                <div
                  className="bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] origin-top transition-transform duration-150 ease-out"
                  style={{ transform: `scale(${getZoomScale()}) rotate(${rotation}deg)` }}
                >
                  <img
                    src={pageImageUrl}
                    alt={docData?.fileName || activeDocId}
                    onError={() => setImageLoadFailed(true)}
                    className="max-w-[560px] w-full h-auto block object-contain"
                  />
                </div>
              ) : (
                /* Fallback for legacy database rows created before Azure Blob file storage was enabled */
                <div
                  className="w-full max-w-[540px] bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] p-[24px] text-[#151a21] origin-top text-[12px] leading-[1.5] rounded"
                  style={{ transform: `scale(${getZoomScale()}) rotate(${rotation}deg)` }}
                >
                  <div className="flex items-center justify-between border-b border-[#d7dbe2] pb-2.5 mb-3">
                    <div>
                      <strong className="text-sm block">{docData?.fileName}</strong>
                      <span className="text-[11px] text-[#5a6472] font-mono">{activeDocId} · {docData?.documentType}</span>
                    </div>
                    <span className="text-[11px] bg-[#fdf1de] text-[#8a5300] border border-[#f0d5a5] px-2 py-0.5 rounded font-semibold">
                      OCR Text View
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] text-[#1e293b] bg-[#f8fafc] p-3 rounded border border-[#e2e8f0] max-h-[60vh] overflow-y-auto">
                    {docData?.rawText || 'No raw OCR text stored for this document.'}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Real Database Extracted Fields Form */}
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
            <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none flex-wrap">
              <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Extracted fields — editable</h3>
              <span className="ml-auto"></span>
              <span className="inline-flex items-center gap-[6px] px-[7px] py-[2px] rounded-[20px] border font-semibold whitespace-nowrap text-[11.5px] leading-[1.6] text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0]">
                <span className="w-[7px] h-[7px] rounded-full bg-current"></span>
                {activeDocId}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-[14px]">
              {loadingDoc || !docData ? (
                <div className="py-12 text-center text-xs text-[#5a6472]">Loading extracted OCR fields...</div>
              ) : (
                <div className="max-w-[620px] mx-auto">
                  {/* Header */}
                  <div className="mb-[16px]">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">
                      Header (Extracted from Document)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                      {docData.header.map((field, i) => {
                        const isError = errorFields.includes(field.key);
                        return (
                          <div key={field.key} className="flex flex-col gap-1 min-w-0">
                            <label className="text-[11px] font-bold text-[#5a6472]">{field.label}</label>
                            <input
                              type="text"
                              value={field.value || ''}
                              onChange={(e) => handleFieldChange('header', i, field.key, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className={`h-[33px] border rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)] ${
                                isError ? 'border-[#a5231c] bg-[#fbeae9]' : 'border-[#b9c0cb]'
                              }`}
                            />
                            <div className="flex items-center gap-[6px] flex-wrap min-h-[18px]">
                              <ConfBadge band={field.band} pct={field.pct} />
                              <SourceTag source={field.source} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="mb-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494]">Line items</div>
                      <button
                        type="button"
                        onClick={handleAddLineItem}
                        className="text-[11.5px] font-medium text-[#0b5cad] hover:underline cursor-pointer"
                      >
                        + Add line item
                      </button>
                    </div>
                    {docData.lines.length === 0 ? (
                      <div className="p-3 border border-dashed border-[#d7dbe2] rounded-[6px] text-xs text-[#5a6472] text-center">
                        No table line items extracted for this document. Click "+ Add line item" to enter manually if needed.
                      </div>
                    ) : (
                      <table className="w-full border-collapse text-[12.5px]">
                        <thead>
                          <tr>
                            <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[44%] font-bold">
                              Description
                            </th>
                            <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[14%] font-bold">
                              Qty
                            </th>
                            <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[20%] font-bold">
                              Unit price
                            </th>
                            <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[22%] font-bold">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {docData.lines.map((l, i) => (
                            <tr key={l.key}>
                              <td className="p-[6px] border-b border-[#d7dbe2] align-top">
                                <input
                                  className="h-[30px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[12.5px] w-full focus:outline-none focus:border-[#0b5cad]"
                                  value={l.desc}
                                  onChange={(e) => handleFieldChange('lines', i, 'desc', e.target.value)}
                                />
                                <div className="flex items-center gap-[6px] flex-wrap min-h-[18px] mt-1">
                                  <ConfBadge band={l.band} pct={l.pct} />
                                  <SourceTag source="extracted" />
                                </div>
                              </td>
                              <td className="p-[6px] border-b border-[#d7dbe2] align-top text-right">
                                <input
                                  className="h-[30px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[12.5px] w-full text-right focus:outline-none focus:border-[#0b5cad]"
                                  value={l.qty}
                                  onChange={(e) => handleFieldChange('lines', i, 'qty', e.target.value)}
                                />
                              </td>
                              <td className="p-[6px] border-b border-[#d7dbe2] align-top text-right">
                                <input
                                  className="h-[30px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[12.5px] w-full text-right focus:outline-none focus:border-[#0b5cad]"
                                  value={l.unit}
                                  onChange={(e) => handleFieldChange('lines', i, 'unit', e.target.value)}
                                />
                              </td>
                              <td className="p-[6px] border-b border-[#d7dbe2] align-top text-right">
                                <input
                                  className="h-[30px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[12.5px] w-full text-right focus:outline-none focus:border-[#0b5cad]"
                                  value={l.amount}
                                  onChange={(e) => handleFieldChange('lines', i, 'amount', e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="mb-[16px]">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Totals</div>
                    <div className="ml-auto max-w-[300px] mt-[12px]">
                      {docData.totals.map((t, i) => {
                        const isError = errorFields.includes(t.key);
                        return (
                          <div key={t.key} className="flex flex-col gap-1 min-w-0 mb-[8px]">
                            <label className="text-[11px] font-bold text-[#5a6472]">{t.label}</label>
                            <input
                              className={`border rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:outline-none focus:border-[#0b5cad] ${
                                t.grand ? 'font-bold text-[15px] h-[38px]' : 'h-[33px]'
                              } ${isError ? 'border-[#a5231c] bg-[#fbeae9]' : 'border-[#b9c0cb]'}`}
                              value={t.value}
                              placeholder="0.00"
                              onChange={(e) => handleFieldChange('totals', i, t.key, e.target.value)}
                            />
                            <div className="flex items-center gap-[6px] flex-wrap min-h-[18px]">
                              <ConfBadge band={t.band} pct={t.pct} />
                              <SourceTag source={t.source} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Validation Issues */}
                  <div className="mb-[16px]">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">
                      Validation & policy issues
                    </div>
                    <div>
                      {issues.length > 0 ? (
                        issues.map((i, idx) => {
                          const map = { informational: 'info', warning: 'warning', blocking: 'danger', critical: 'danger' };
                          const variant = map[i.severity];
                          const bgBorder =
                            variant === 'danger'
                              ? 'border-[#efc0bd] bg-[#fbeae9]'
                              : variant === 'warning'
                              ? 'border-[#f0d5a5] bg-[#fdf1de]'
                              : 'border-[#b6d2ee] bg-[#e7f0fa]';
                          return (
                            <div
                              key={idx}
                              className={`flex gap-[9px] p-[9px_10px] border rounded-[6px] items-start ${bgBorder} ${
                                idx > 0 ? 'mt-[7px]' : ''
                              }`}
                            >
                              <IssueChip severity={i.severity} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[12.5px] font-semibold m-[0_0_2px]">{i.title}</p>
                                <p className="text-[12px] text-[#5a6472] m-0">{i.detail}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex gap-[9px] p-[9px_10px] border rounded-[6px] items-start border-[#b6d2ee] bg-[#e7f0fa]">
                          <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]">
                            <span className="w-[7px] h-[7px] rounded-full bg-current"></span>Clear
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] font-semibold m-[0_0_2px]">No open issues</p>
                            <p className="text-[12px] text-[#5a6472] m-0">
                              Validation, policy and duplicate checks returned clear for this document.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="flex-none p-[9px_12px] border-t border-[#d7dbe2] bg-[#fafbfc] flex items-center gap-[8px] flex-wrap">
              <button
                onClick={() => saveExtractedFieldsToBackend(docData)}
                className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer"
              >
                Save draft
              </button>
              <button
                disabled={hasBlocking}
                onClick={() => handleStatusTransition('reviewed_erp')}
                className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] hover:bg-[#0a4f95] hover:border-[#0a4f95] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve
              </button>
              <button
                disabled={hasBlocking}
                onClick={() => handleStatusTransition('auto_erp')}
                className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] hover:bg-[#0a4f95] hover:border-[#0a4f95] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Approve and post
              </button>
              <button
                onClick={() => handleStatusTransition('correction')}
                className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer"
              >
                Send to Correction
              </button>
              <button
                onClick={() => handleStatusTransition('flagged')}
                className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer"
              >
                Flag for exception
              </button>
              <button
                onClick={handleReject}
                className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#efc0bd] text-[#a5231c] rounded-[6px] hover:bg-[#fbeae9] whitespace-nowrap cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingReviewPage;