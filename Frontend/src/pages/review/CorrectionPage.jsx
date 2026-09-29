import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

// --- Correction Dummy Data ---
const dummyCorrectionDocs = [
  { id: 'DOC-2024-04903', vendor: 'Northwind Paper Co.', reason: 'OCR processing failure', variant: 'danger', age: '4h' },
  { id: 'DOC-2024-04891', vendor: 'Vertex Components', reason: 'Low confidence', variant: 'warning', age: '5h' },
  { id: 'DOC-2024-04885', vendor: 'Meridian Logistics', reason: 'Mandatory fields missing', variant: 'warning', age: '12h' }
];

const initialCorrectionData = {
  id: 'DOC-2024-04903',
  fileName: 'inv_northwind_3390.pdf',
  header: [
    { key: 'vendor', label: 'Vendor', value: 'Northwind Paper Co.', band: 'High', pct: 95, source: 'extracted' },
    { key: 'invoiceNumber', label: 'Invoice number', value: '', band: null, pct: null, source: 'extracted', empty: true },
    { key: 'invoiceDate', label: 'Invoice date', value: '2026-02-09', band: 'Medium', pct: 66, source: 'extracted' },
    { key: 'dueDate', label: 'Due date', value: '', band: null, pct: null, source: 'extracted', empty: true },
    { key: 'currency', label: 'Currency', value: 'USD', band: 'High', pct: 97, source: 'extracted' },
    { key: 'poNumber', label: 'PO number', value: 'PO-4488', band: 'Medium', pct: 69, source: 'mapped' }
  ],
  lines: [
    { key: 'l1', desc: 'LTL freight, Chicago → Dallas', qty: '1', unit: '', amount: '', band: null, pct: null, empty: true },
    { key: 'l2', desc: 'Fuel surcharge', qty: '1', unit: '', amount: '412.60', band: 'Low', pct: 48 }
  ],
  totals: [
    { key: 'subtotal', label: 'Subtotal', value: '', band: null, pct: null, source: 'system', empty: true },
    { key: 'tax', label: 'Tax', value: '34.04', band: 'Medium', pct: 64, source: 'mapped' },
    { key: 'total', label: 'Total due', value: '', band: null, pct: null, source: 'system', empty: true, grand: true }
  ],
  mapping: [
    { key: 'glCode', label: 'GL code', value: '', band: null, pct: null, source: 'mapped', empty: true },
    { key: 'taxCode', label: 'Tax code', value: 'TX-STD-8.25', band: 'High', pct: 88, source: 'mapped' },
    { key: 'costCenter', label: 'Cost centre', value: '', band: null, pct: null, source: 'mapped', empty: true }
  ]
};

// --- Shared Components ---
const ConfBadge = ({ band, pct }) => {
  if (!band) return null;
  const colors = 
    band === 'High' ? 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]' :
    band === 'Medium' ? 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]' :
    'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]';
  return (
    <span className={`group inline-flex items-center gap-1 px-[7px] py-[1px] rounded-full border text-[10.5px] font-bold cursor-default ${colors}`} title={`${band} confidence — ${pct}%`}>
      {band} <span className="font-semibold opacity-85 hidden group-hover:inline">{pct}%</span>
    </span>
  );
};

const SourceTag = ({ source }) => {
  const s = {
    extracted: { label: 'Extracted', code: 'EX', cls: 'bg-[#e7f0fa] text-[#0b5cad]' },
    mapped: { label: 'Mapped', code: 'MP', cls: 'bg-[#efe7fa] text-[#6a3fb5]' },
    system: { label: 'System-generated', code: 'SYS', cls: 'bg-[#eef0f3] text-[#4e5867]' },
  }[source] || { label: 'System-generated', code: 'SYS', cls: 'bg-[#eef0f3] text-[#4e5867]' };

  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#5a6472] bg-[#fafbfc] border border-[#d7dbe2] rounded px-[6px] py-[1px] cursor-default pl-1" title={s.label}>
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
    success: 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]'
  }[map[severity] || 'info'];

  return (
    <span className={`inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] ${colors}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current"></span>{label}
    </span>
  );
};

// --- Correction Page Component ---
const CorrectionPage = () => {
  const [activeDocId, setActiveDocId] = useState(dummyCorrectionDocs[0].id);
  const [docData, setDocData] = useState(initialCorrectionData);
  const [zoomLevel, setZoomLevel] = useState(1); 
  const [rotation, setRotation] = useState(0);
  const [autosave, setAutosave] = useState('saved'); 
  
  const saveTimeoutRef = useRef(null);

  // Compute validation issues
  const computeIssues = (data) => {
    const issues = [];
    const totalStr = data.totals.find(t => t.key === 'total')?.value || '';
    const total = parseFloat(totalStr.replace(/,/g, ''));
    
    if (!isNaN(total) && total > 10000) {
      issues.push({
        id: 'po-tolerance', severity: 'blocking', field: 'total',
        title: 'Amount exceeds PO tolerance',
        detail: `Invoice total $${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds the approved PO tolerance configured for this client, currency, document type and legal entity. Approval is blocked until an authorised override is recorded.`
      });
    }
    
    const vendor = data.header.find(h => h.key === 'vendor')?.value;
    const poNumber = data.header.find(h => h.key === 'poNumber')?.value;
    if (vendor && vendor.trim() && !poNumber) {
      issues.push({
        id: 'missing-po', severity: 'warning', field: 'poNumber',
        title: 'PO number is empty',
        detail: 'This vendor is flagged as PO-required in this client\'s master data. A matching PO must be present before posting.'
      });
    }
    
    const lowConf = data.lines.filter(l => l.band === 'Low');
    if (lowConf.length) {
      issues.push({
        id: 'low-confidence', severity: 'informational', field: null,
        title: `${lowConf.length} line item${lowConf.length > 1 ? 's' : ''} below the client's confidence threshold`,
        detail: 'The value is populated but should be checked against the source document before approval.'
      });
    }
    
    return issues;
  };

  const issues = computeIssues(docData);
  const hasBlocking = issues.some(i => i.severity === 'blocking' || i.severity === 'critical');
  
  // Block approval if empty fields still exist
  const emptyKeys = docData.header.filter(f => f.empty && !f.value).map(f => f.key)
    .concat(docData.totals.filter(f => f.empty && !f.value).map(f => f.key))
    .concat(docData.mapping.filter(f => f.empty && !f.value).map(f => f.key));
  const hasEmptyFields = emptyKeys.length > 0;

  const errorFields = issues.map(i => i.field).filter(Boolean).concat(emptyKeys);

  const handleFieldChange = (section, index, key, value) => {
    setDocData(prev => {
      const newData = { ...prev };
      newData[section] = [...prev[section]];
      newData[section][index] = { ...newData[section][index], value };
      return newData;
    });

    setAutosave('unsaved');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      setAutosave('saving');
      setTimeout(() => setAutosave('saved'), 700);
    }, 550);
  };

  const Field = ({ field, section, index }) => {
    const isError = errorFields.includes(field.key);
    const readOnly = field.source === 'mapped' || field.source === 'system';
    
    return (
      <div className={`flex flex-col gap-1 min-w-0`}>
        <label className="text-[11px] font-bold text-[#5a6472]">
          {field.label}
          {field.empty && !field.value && <span className="text-[#8a5300] font-bold"> — needs entry</span>}
        </label>
        <input
          type="text"
          value={field.value || ''}
          placeholder={field.empty ? "Enter from the scanned document" : ""}
          onChange={(e) => handleFieldChange(section, index, field.key, e.target.value)}
          readOnly={readOnly}
          className={`h-[33px] border rounded-[6px] px-[9px] text-[13px] w-full focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)] 
            ${field.empty && !field.value ? 'border-[#8a5300] border-dashed bg-[#fffdf6] text-[#151a21]' : 
              isError ? 'border-[#a5231c] bg-[#fbeae9] text-[#151a21]' : 'border-[#b9c0cb] bg-white text-[#151a21]'}`}
        />
        <div className="flex items-center gap-[6px] flex-wrap min-h-[18px]">
          {field.band && <ConfBadge band={field.band} pct={field.pct} />}
          {field.source && <SourceTag source={field.source} />}
          {isError && !field.empty && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#a5231c] bg-[#fbeae9] border border-[#efc0bd] rounded-[4px] px-[6px] py-[1px]">
              Blocking issue
            </span>
          )}
        </div>
      </div>
    );
  };

  const getZoomScale = () => zoomLevel === 1 ? 1 : zoomLevel === 2 ? 1.25 : 1.5;
  const getZoomText = () => zoomLevel === 1 ? '100%' : zoomLevel === 2 ? '125%' : '150%';

  return (
    <div className="flex flex-col h-full p-[14px_16px] overflow-hidden bg-[#f4f5f7] text-[#151a21] font-sans">
      
      {/* Header & Tabs */}
      <div className="flex items-center mb-[11px] flex-none">
        <h1 className="text-[17px] font-semibold mr-4 m-0 leading-[1.25]">Queue</h1>
        <div className="flex border-b border-[#d7dbe2] gap-1 m-0">
          <Link to="/pending" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Pending Review (42)
          </Link>
          <Link to="/correction" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#0b4f96] border-b-2 border-[#0b5cad] -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Correction (17)
          </Link>
          <Link to="/flagged" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Flagged (9)
          </Link>
        </div>
        
        <span className="ml-auto"></span>
        
        {/* Autosave */}
        <div className={`inline-flex items-center gap-[7px] text-[12px] font-semibold px-[10px] py-[5px] rounded-[6px] border bg-[#fafbfc] mr-3
          ${autosave === 'saving' ? 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]' : 
            autosave === 'saved' ? 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]' : 
            'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]'}`}>
          <span className={`w-2 h-2 rounded-full bg-current ${autosave === 'saving' ? 'animate-pulse' : ''}`}></span>
          <span>{autosave === 'saving' ? 'Saving…' : autosave === 'saved' ? 'Saved' : 'Unsaved changes'}</span>
        </div>
      </div>

      {/* Document Strip (Correction version) */}
      <div className="flex gap-[9px] overflow-x-auto p-[9px] bg-white border border-[#d7dbe2] rounded-[10px] mb-[11px] flex-none">
        {dummyCorrectionDocs.map(doc => {
          const colors = doc.variant === 'danger' ? 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]' : 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]';
          return (
            <button 
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`flex-none w-[214px] text-left border rounded-[6px] p-[9px_10px] flex flex-col gap-[5px] cursor-pointer
                ${activeDocId === doc.id 
                  ? 'border-[#0b5cad] bg-[#eef4fb] shadow-[inset_0_0_0_1px_#0b5cad]' 
                  : 'border-[#d7dbe2] bg-white hover:border-[#b9c0cb] hover:bg-[#fafbfc]'
                }`}
            >
              <div className="flex items-center justify-between gap-[6px]">
                <span className="text-[12px] font-bold font-mono">{doc.id}</span>
              </div>
              <div className="text-[12px] text-[#151a21] whitespace-nowrap overflow-hidden text-ellipsis">{doc.vendor}</div>
              <div className="flex items-center justify-between gap-[6px]">
                <span className={`inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] ${colors}`}>
                  <span className="w-[7px] h-[7px] rounded-full bg-current"></span>{doc.reason}
                </span>
                <span className="text-[11px] text-[#5a6472]">{doc.age}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Split Pane view */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-[12px]">
        
        {/* Left Pane - Viewer */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
          <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none flex-wrap">
            <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Scanned document</h3>
            <span className="ml-auto"></span>
            <button onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))} className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] cursor-pointer">−</button>
            <span className="text-[12px] text-[#5a6472]">{getZoomText()}</span>
            <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 1))} className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] cursor-pointer">+</button>
            <button onClick={() => setRotation((rotation + 90) % 180)} className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] cursor-pointer">⟳</button>
          </div>
          
          <div className="flex-1 min-h-0 overflow-auto bg-[#5b6472] p-[18px] flex justify-center items-start">
            <div 
              className="w-full max-w-[520px] bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] p-[34px_30px] font-serif text-[#1b1b1b] origin-top text-[12px] leading-[1.5] transition-transform duration-150 ease-out relative"
              style={{ transform: `scale(${getZoomScale()}) rotate(${rotation}deg)` }}
            >
              <div className="flex justify-between gap-[16px] border-b-2 border-[#333] pb-[10px] mb-[14px]">
                <div className="text-[15px] font-bold">
                  {docData.header.find(h => h.key === 'vendor')?.value || 'Vendor'}
                  <small className="block text-[10.5px] font-normal text-[#555]">1420 Foundry Road, Chicago IL 60632 · VAT US-88-1029384</small>
                </div>
                <div className="text-[19px] font-bold tracking-[0.14em] text-right">INVOICE</div>
              </div>

              {/* Correction specific poor quality stamp */}
              <div className="relative float-right border-2 border-[#b3261e] text-[#b3261e] text-[10px] p-[3px_8px] rounded-[3px] -rotate-3 tracking-[0.1em] font-bold">
                SCAN QUALITY POOR
              </div>
              
              <div className="grid grid-cols-2 gap-x-[18px] gap-y-[4px] mb-[16px] text-[11.5px]">
                <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Invoice No.</span><strong>{docData.header.find(h => h.key === 'invoiceNumber')?.value || '—'}</strong></div>
                <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Invoice Date</span><strong>{docData.header.find(h => h.key === 'invoiceDate')?.value || '—'}</strong></div>
                <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Due Date</span><strong>{docData.header.find(h => h.key === 'dueDate')?.value || '—'}</strong></div>
                <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Currency</span><strong>{docData.header.find(h => h.key === 'currency')?.value || '—'}</strong></div>
                <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>PO Number</span><strong>{docData.header.find(h => h.key === 'poNumber')?.value || '—'}</strong></div>
                <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Terms</span><strong>Net 30</strong></div>
              </div>
              
              <table className="w-full border-collapse text-[11px] mb-[12px]">
                <thead>
                  <tr>
                    <th className="border-y border-[#333] p-[5px_4px] text-left text-[10px] uppercase font-bold">Description</th>
                    <th className="border-y border-[#333] p-[5px_4px] text-right text-[10px] uppercase font-bold">Qty</th>
                    <th className="border-y border-[#333] p-[5px_4px] text-right text-[10px] uppercase font-bold">Unit</th>
                    <th className="border-y border-[#333] p-[5px_4px] text-right text-[10px] uppercase font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {docData.lines.map(line => (
                    <tr key={line.key}>
                      <td className="p-[5px_4px] border-b border-dotted border-[#ddd]">{line.desc || '—'}</td>
                      <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">{line.qty || '—'}</td>
                      <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">{line.unit || '—'}</td>
                      <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">{line.amount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="ml-auto w-[230px] text-[11.5px]">
                {docData.totals.map(t => (
                  <div key={t.key} className={`flex justify-between py-[3px] ${t.grand ? 'border-t-[1.5px] border-[#333] font-bold text-[13px] mt-[4px] pt-[6px]' : ''}`}>
                    <span>{t.label}</span><span>{t.value || '—'}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-[22px] text-[10px] text-[#666] border-t border-[#ddd] pt-[8px]">
                Remit to: {docData.header.find(h => h.key === 'vendor')?.value || 'Vendor'} · Demo rendering of the uploaded source file.
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane - Form */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
          <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none flex-wrap">
            <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Fill the highlighted gaps</h3>
            <span className="ml-auto"></span>
            <span className="inline-flex items-center gap-[6px] px-[7px] py-[2px] rounded-[20px] border font-semibold whitespace-nowrap text-[11.5px] leading-[1.6] text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0]">
              <span className="w-[7px] h-[7px] rounded-full bg-current"></span>{activeDocId}
            </span>
          </div>
          
          <div className="flex-1 min-h-0 overflow-auto p-[14px]">
            <div className="max-w-[620px] mx-auto">
              
              {/* Header */}
              <div className="mb-[16px]">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Header</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                  {docData.header.map((field, i) => (
                    <Field key={field.key} field={field} section="header" index={i} />
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-[16px]">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Line items</div>
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[44%] font-bold">Description</th>
                      <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[12%] font-bold">Qty</th>
                      <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[20%] font-bold">Unit price</th>
                      <th className="text-[10px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[5px_6px] border-b border-[#d7dbe2] w-[24%] font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docData.lines.map((l, i) => (
                      <tr key={l.key}>
                        <td className="p-[6px] border-b border-[#d7dbe2] align-top">
                          <input 
                            className={`h-[30px] border rounded-[6px] px-[9px] text-[12.5px] w-full focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)] 
                              ${l.empty && !l.desc ? 'border-[#8a5300] border-dashed bg-[#fffdf6]' : 'border-[#b9c0cb] bg-white'}`}
                            value={l.desc} onChange={e => handleFieldChange('lines', i, 'desc', e.target.value)} 
                          />
                          <div className="flex items-center gap-[6px] flex-wrap min-h-[18px] mt-1">
                            {l.band && <ConfBadge band={l.band} pct={l.pct} />}
                            {l.band && <SourceTag source="extracted" />}
                          </div>
                        </td>
                        <td className="p-[6px] border-b border-[#d7dbe2] align-top text-right">
                          <input 
                            className={`h-[30px] border rounded-[6px] px-[9px] text-[12.5px] w-full text-right focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)]
                              ${l.empty && !l.qty ? 'border-[#8a5300] border-dashed bg-[#fffdf6]' : 'border-[#b9c0cb] bg-white'}`} 
                            value={l.qty} onChange={e => handleFieldChange('lines', i, 'qty', e.target.value)} 
                          />
                        </td>
                        <td className="p-[6px] border-b border-[#d7dbe2] align-top text-right">
                          <input 
                            className={`h-[30px] border rounded-[6px] px-[9px] text-[12.5px] w-full text-right focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)]
                              ${l.empty && !l.unit ? 'border-[#8a5300] border-dashed bg-[#fffdf6]' : 'border-[#b9c0cb] bg-white'}`} 
                            value={l.unit} onChange={e => handleFieldChange('lines', i, 'unit', e.target.value)} 
                          />
                        </td>
                        <td className="p-[6px] border-b border-[#d7dbe2] align-top text-right">
                          <input 
                            className={`h-[30px] border rounded-[6px] px-[9px] text-[12.5px] w-full text-right focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)]
                              ${l.empty && !l.amount ? 'border-[#8a5300] border-dashed bg-[#fffdf6]' : 'border-[#b9c0cb] bg-white'}`} 
                            value={l.amount} onChange={e => handleFieldChange('lines', i, 'amount', e.target.value)} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mb-[16px]">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Totals</div>
                <div className="ml-auto max-w-[300px] mt-[12px]">
                  {docData.totals.map((t, i) => {
                    const isError = errorFields.includes(t.key);
                    const readOnly = t.source === 'system';
                    return (
                      <div key={t.key} className="flex flex-col gap-1 min-w-0 mb-[8px]">
                        <label className="text-[11px] font-bold text-[#5a6472]">
                          {t.label}
                          {t.empty && !t.value && <span className="text-[#8a5300] font-bold"> — needs entry</span>}
                        </label>
                        <input
                          className={`border rounded-[6px] px-[9px] text-[13px] w-full focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)]
                            ${t.grand ? 'font-bold text-[15px] h-[38px]' : 'h-[33px]'}
                            ${t.empty && !t.value ? 'border-[#8a5300] border-dashed bg-[#fffdf6] text-[#151a21]' : 
                              isError ? 'border-[#a5231c] bg-[#fbeae9] text-[#151a21]' : 'border-[#b9c0cb] bg-white text-[#151a21]'}`}
                          value={t.value}
                          placeholder={t.empty ? "Enter from the scanned document" : ""}
                          onChange={e => handleFieldChange('totals', i, t.key, e.target.value)}
                          readOnly={readOnly}
                        />
                        <div className="flex items-center gap-[6px] flex-wrap min-h-[18px]">
                          {t.band && <ConfBadge band={t.band} pct={t.pct} />}
                          {t.source && <SourceTag source={t.source} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mapping */}
              <div className="mb-[16px]">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Coding & mapping — from this client's master data</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
                  {docData.mapping.map((field, i) => (
                    <Field key={field.key} field={field} section="mapping" index={i} />
                  ))}
                </div>
              </div>

              {/* Validation Issues */}
              <div className="mb-[16px]">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Validation & policy issues</div>
                <div>
                  {issues.length > 0 ? issues.map((i, idx) => {
                    const map = { informational: 'info', warning: 'warning', blocking: 'danger', critical: 'danger' };
                    const variant = map[i.severity];
                    const bgBorder = variant === 'danger' ? 'border-[#efc0bd] bg-[#fbeae9]' : variant === 'warning' ? 'border-[#f0d5a5] bg-[#fdf1de]' : 'border-[#b6d2ee] bg-[#e7f0fa]';
                    return (
                      <div key={idx} className={`flex gap-[9px] p-[9px_10px] border rounded-[6px] items-start ${bgBorder} ${idx > 0 ? 'mt-[7px]' : ''}`}>
                        <IssueChip severity={i.severity} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-semibold m-[0_0_2px]">{i.title}</p>
                          <p className="text-[12px] text-[#5a6472] m-0">{i.detail}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex gap-[9px] p-[9px_10px] border rounded-[6px] items-start border-[#b6d2ee] bg-[#e7f0fa]">
                      <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]">
                        <span className="w-[7px] h-[7px] rounded-full bg-current"></span>Clear
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold m-[0_0_2px]">No open issues</p>
                        <p className="text-[12px] text-[#5a6472] m-0">Validation, policy and duplicate checks returned clear for this document.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Action Footer */}
          <div className="flex-none p-[9px_12px] border-t border-[#d7dbe2] bg-[#fafbfc] flex items-center gap-[8px] flex-wrap">
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer">
              Save draft
            </button>
            <button 
              disabled={hasBlocking || hasEmptyFields}
              className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] hover:bg-[#0a4f95] hover:border-[#0a4f95] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve
            </button>
            <button 
              disabled={hasBlocking || hasEmptyFields}
              className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] hover:bg-[#0a4f95] hover:border-[#0a4f95] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve and post
            </button>
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer">
              Flag for exception
            </button>
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#efc0bd] text-[#a5231c] rounded-[6px] hover:bg-[#fbeae9] whitespace-nowrap cursor-pointer">
              Reject
            </button>
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#efc0bd] text-[#a5231c] rounded-[6px] hover:bg-[#fbeae9] whitespace-nowrap cursor-pointer">
              Mark duplicate
            </button>
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer">
              Request information
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrectionPage;