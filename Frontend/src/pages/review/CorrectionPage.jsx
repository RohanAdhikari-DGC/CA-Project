import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import invoiceService from '../../services/invoice_service';

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

const buildCorrectionFormData = (invoice, ocrDoc) => {
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
      item.col_0 ||
      item.col_1 ||
      (keys.length > 0 ? String(item[keys[0]] || '') : '');
    const qtyVal = item.qty || item.quantity || item.Quantity || item.col_2 || '1';
    const unitVal = item.unit_price || item.unit || item.rate || item.col_3 || '';
    const amountVal = item.amount || item.total || item.col_4 || '';

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
    header: [
      { key: 'vendor_name', label: 'Vendor', value: fields.vendor_name || '', band, pct, source: 'extracted', empty: !fields.vendor_name },
      { key: 'invoice_number', label: 'Invoice number', value: fields.invoice_number || '', band, pct, source: 'extracted', empty: !fields.invoice_number },
      { key: 'invoice_date', label: 'Invoice date', value: fields.invoice_date || '', band, pct, source: 'extracted', empty: !fields.invoice_date },
      { key: 'due_date', label: 'Due date', value: fields.due_date || '', band, pct, source: 'extracted', empty: !fields.due_date },
      { key: 'currency', label: 'Currency', value: fields.currency || 'INR', band, pct, source: 'extracted', empty: false },
      { key: 'customer_name', label: 'Customer / Bill to', value: fields.customer_name || '', band, pct, source: 'extracted', empty: !fields.customer_name },
    ],
    lines: mappedLines,
    totals: [
      { key: 'subtotal', label: 'Subtotal', value: fields.subtotal !== null && fields.subtotal !== undefined ? String(fields.subtotal) : '', band, pct, source: 'extracted', empty: fields.subtotal === null || fields.subtotal === undefined },
      { key: 'tax_amount', label: 'Tax', value: fields.tax_amount !== null && fields.tax_amount !== undefined ? String(fields.tax_amount) : '', band, pct, source: 'extracted', empty: false },
      { key: 'total_amount', label: 'Total due', value: fields.total_amount !== null && fields.total_amount !== undefined ? String(fields.total_amount) : '', band, pct, source: 'extracted', empty: fields.total_amount === null || fields.total_amount === undefined, grand: true },
    ],
  };
};

const CorrectionPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedInvoiceId = searchParams.get('invoiceId') || searchParams.get('id') || '';

  const [queueDocs, setQueueDocs] = useState([]);
  const [queueCounts, setQueueCounts] = useState({ pending: 0, correction: 0, flagged: 0 });
  const [activeDocId, setActiveDocId] = useState(requestedInvoiceId);
  const [docData, setDocData] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [autosave, setAutosave] = useState('saved');
  const saveTimeoutRef = useRef(null);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const [corrList, pendingCount, correctionCount, flaggedCount] = await Promise.all([
        invoiceService.getInvoices({ status: 'correction', limit: 100 }),
        invoiceService.getInvoicesCount({ status: 'pending_review' }).catch(() => 0),
        invoiceService.getInvoicesCount({ status: 'correction' }).catch(() => 0),
        invoiceService.getInvoicesCount({ status: 'flagged' }).catch(() => 0),
      ]);

      let docs = Array.isArray(corrList) ? corrList : [];
      if (requestedInvoiceId && !docs.some((d) => d.id === requestedInvoiceId)) {
        try {
          const clicked = await invoiceService.getInvoiceById(requestedInvoiceId);
          if (clicked) docs = [clicked, ...docs];
        } catch {
          // ignore
        }
      }

      setQueueDocs(docs);
      setQueueCounts({
        pending: typeof pendingCount === 'number' ? pendingCount : 0,
        correction: typeof correctionCount === 'number' ? correctionCount : docs.length,
        flagged: typeof flaggedCount === 'number' ? flaggedCount : 0,
      });

      if (requestedInvoiceId && docs.some((d) => d.id === requestedInvoiceId)) {
        setActiveDocId(requestedInvoiceId);
      } else if (docs.length > 0) {
        setActiveDocId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0].id));
      } else {
        setActiveDocId('');
        setDocData(null);
      }
    } catch (err) {
      console.error('Failed to load correction queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  }, [requestedInvoiceId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!activeDocId) {
      setDocData(null);
      return;
    }
    let isMounted = true;
    const fetchDetails = async () => {
      setLoadingDoc(true);
      setImageLoadFailed(false);
      try {
        const [inv, ocrDoc] = await Promise.all([
          invoiceService.getInvoiceById(activeDocId).catch(() => queueDocs.find((d) => d.id === activeDocId) || null),
          invoiceService.getOcrByInvoiceId(activeDocId).catch(() => null),
        ]);
        if (!isMounted) return;
        setDocData(buildCorrectionFormData(inv, ocrDoc));
        setAutosave('saved');
      } finally {
        if (isMounted) setLoadingDoc(false);
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [activeDocId]);

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
    }, 550);
  };

  const saveExtractedFieldsToBackend = async (dataToSave = docData) => {
    if (!activeDocId || !dataToSave) return;
    setAutosave('saving');
    try {
      const payload = {};
      dataToSave.header.forEach((h) => {
        payload[h.key] = h.value || null;
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
    } catch {
      setAutosave('failed');
    }
  };

  const handleStatusTransition = async (newStatus) => {
    if (!activeDocId) return;
    try {
      await saveExtractedFieldsToBackend(docData);
      await invoiceService.updateStatus(activeDocId, newStatus);
      await loadQueue();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const getZoomScale = () => (zoomLevel === 1 ? 1 : zoomLevel === 2 ? 1.25 : 1.5);
  const getZoomText = () => (zoomLevel === 1 ? '100%' : zoomLevel === 2 ? '125%' : '150%');
  const pageImageUrl = activeDocId ? invoiceService.getInvoicePageImageUrl(activeDocId, 1) : '';

  return (
    <div className="flex flex-col h-full p-[14px_16px] overflow-hidden bg-[#f4f5f7] text-[#151a21] font-sans">
      <div className="flex items-center mb-[11px] flex-none">
        <h1 className="text-[17px] font-semibold mr-4 m-0 leading-[1.25]">Queue</h1>
        <div className="flex border-b border-[#d7dbe2] gap-1 m-0">
          <Link to="/pending" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Pending Review ({queueCounts.pending})
          </Link>
          <Link to="/correction" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#0b4f96] border-b-2 border-[#0b5cad] -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Correction ({queueCounts.correction})
          </Link>
          <Link to="/flagged" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Flagged ({queueCounts.flagged})
          </Link>
        </div>
        <span className="ml-auto"></span>
        {docData && (
          <div className={`inline-flex items-center gap-[7px] text-[12px] font-semibold px-[10px] py-[5px] rounded-[6px] border bg-[#fafbfc] mr-3 ${
            autosave === 'saving' ? 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]' :
            autosave === 'saved' ? 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]' :
            'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]'
          }`}>
            <span className={`w-2 h-2 rounded-full bg-current ${autosave === 'saving' ? 'animate-pulse' : ''}`}></span>
            <span>{autosave === 'saving' ? 'Saving…' : autosave === 'saved' ? 'Saved' : 'Unsaved changes'}</span>
          </div>
        )}
      </div>

      {/* Document Strip */}
      <div className="flex gap-[9px] overflow-x-auto p-[9px] bg-white border border-[#d7dbe2] rounded-[10px] mb-[11px] flex-none min-h-[76px] items-center">
        {loadingQueue ? (
          <div className="text-xs text-[#5a6472] px-3">Loading correction queue from database...</div>
        ) : queueDocs.length === 0 ? (
          <div className="flex items-center justify-between w-full px-3 py-1 text-xs text-[#5a6472]">
            <span>No documents currently require correction.</span>
            <button onClick={() => navigate('/incoming')} className="h-[28px] px-3 bg-[#0b5cad] text-white rounded-[6px] text-xs font-medium cursor-pointer">
              Go to Incoming Documents
            </button>
          </div>
        ) : (
          queueDocs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => {
                setActiveDocId(doc.id);
                setSearchParams({ invoiceId: doc.id });
              }}
              className={`flex-none w-[225px] text-left border rounded-[6px] p-[9px_10px] flex flex-col gap-[5px] cursor-pointer ${
                activeDocId === doc.id
                  ? 'border-[#0b5cad] bg-[#eef4fb] shadow-[inset_0_0_0_1px_#0b5cad]'
                  : 'border-[#d7dbe2] bg-white hover:border-[#b9c0cb] hover:bg-[#fafbfc]'
              }`}
            >
              <div className="flex items-center justify-between gap-[6px]">
                <span className="text-[12px] font-bold font-mono truncate">{doc.id}</span>
              </div>
              <div className="text-[12px] text-[#151a21] whitespace-nowrap overflow-hidden text-ellipsis">{doc.fileName}</div>
              <div className="flex items-center justify-between gap-[6px]">
                <span className="inline-flex items-center gap-[6px] px-[8px] py-[1px] rounded-full border text-[11px] font-semibold text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]">
                  Needs correction
                </span>
                <span className="text-[11px] text-[#5a6472]">{formatRelativeAge(doc.received)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {!activeDocId || (!loadingDoc && !docData) ? (
        <div className="flex-1 bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col items-center justify-center p-8 text-center text-[#5a6472]">
          <div className="text-3xl mb-2">✎</div>
          <h3 className="text-sm font-semibold text-[#151a21] mb-1">No document selected for correction</h3>
          <p className="text-xs max-w-md">Documents sent to Correction will appear here.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-[12px]">
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-xs overflow-hidden">
            <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none">
              <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">{docData?.fileName || 'Scanned document'}</h3>
              <span className="ml-auto"></span>
              <button onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))} className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] cursor-pointer">−</button>
              <span className="text-[12px] text-[#5a6472]">{getZoomText()}</span>
              <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 1))} className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] cursor-pointer">+</button>
              <button onClick={() => setRotation((rotation + 90) % 360)} className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] cursor-pointer">⟳</button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-[#5b6472] p-[18px] flex justify-center items-start">
              {!imageLoadFailed ? (
                <div className="bg-white shadow-lg origin-top transition-transform duration-150" style={{ transform: `scale(${getZoomScale()}) rotate(${rotation}deg)` }}>
                  <img src={pageImageUrl} alt={docData?.fileName} onError={() => setImageLoadFailed(true)} className="max-w-[560px] w-full h-auto block object-contain" />
                </div>
              ) : (
                <div className="w-full max-w-[540px] bg-white shadow-lg p-6 rounded text-xs">
                  <strong className="block mb-2">{docData?.fileName}</strong>
                  <pre className="whitespace-pre-wrap font-mono text-[11px] bg-[#f8fafc] p-3 rounded border">{docData?.rawText || 'No raw text available.'}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-xs overflow-hidden">
            <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none">
              <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Fill the highlighted gaps</h3>
              <span className="ml-auto"></span>
              <span className="text-xs font-mono bg-[#eef0f3] px-2 py-0.5 rounded">{activeDocId}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-[14px]">
              {docData && (
                <div className="max-w-[620px] mx-auto space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                    {docData.header.map((field, i) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#5a6472]">
                          {field.label}
                          {field.empty && !field.value && <span className="text-[#8a5300] font-bold"> — needs entry</span>}
                        </label>
                        <input
                          type="text"
                          value={field.value || ''}
                          onChange={(e) => handleFieldChange('header', i, field.key, e.target.value)}
                          placeholder="Enter from scanned document"
                          className={`h-[33px] border rounded-[6px] px-[9px] text-[13px] w-full focus:outline-none focus:border-[#0b5cad] ${
                            field.empty && !field.value ? 'border-[#8a5300] border-dashed bg-[#fffdf6]' : 'border-[#b9c0cb] bg-white'
                          }`}
                        />
                        <div className="flex items-center gap-[6px]">
                          <ConfBadge band={field.band} pct={field.pct} />
                          <SourceTag source={field.source} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ml-auto max-w-[300px] space-y-2 pt-2">
                    {docData.totals.map((t, i) => (
                      <div key={t.key} className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-[#5a6472]">{t.label}</label>
                        <input
                          type="text"
                          value={t.value || ''}
                          onChange={(e) => handleFieldChange('totals', i, t.key, e.target.value)}
                          className={`h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] w-full ${t.grand ? 'font-bold' : ''}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-none p-[9px_12px] border-t border-[#d7dbe2] bg-[#fafbfc] flex items-center gap-[8px] flex-wrap">
              <button onClick={() => saveExtractedFieldsToBackend(docData)} className="h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] cursor-pointer">
                Save draft
              </button>
              <button onClick={() => handleStatusTransition('reviewed_erp')} className="h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] text-white rounded-[6px] cursor-pointer">
                Approve
              </button>
              <button onClick={() => handleStatusTransition('flagged')} className="h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] cursor-pointer">
                Flag for exception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrectionPage;