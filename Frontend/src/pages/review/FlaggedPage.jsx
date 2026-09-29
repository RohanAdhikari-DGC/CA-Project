import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// --- Dummy Data ---
const dummyFlagged = [
  { id: 'APEX-2026-04855', flag: 'Duplicate invoice number', severity: 'critical', owner: 'm.chen', age: '1h', due: 'Today' },
  { id: 'APEX-2026-04846', flag: 'Amount exceeds PO tolerance', severity: 'blocking', owner: 'r.patel', age: '4h', due: 'Tomorrow' },
  { id: 'APEX-2026-04837', flag: 'Vendor blocked in master data', severity: 'blocking', owner: 'j.okafor', age: '7h', due: 'Overdue' },
  { id: 'APEX-2026-04828', flag: 'Tax code missing', severity: 'warning', owner: 'unassigned', age: '10h', due: '—' },
  { id: 'APEX-2026-04819', flag: 'Currency mismatch vs. PO', severity: 'warning', owner: 'm.chen', age: '13h', due: 'Today' }
];

const docData = {
  header: [
    { key: 'vendor', label: 'Vendor', value: 'Apex Industrial Supply', band: 'High', pct: 98, source: 'extracted' },
    { key: 'invoiceNumber', label: 'Invoice number', value: 'APEX-8842', band: 'High', pct: 97, source: 'extracted' },
    { key: 'invoiceDate', label: 'Invoice date', value: '2026-02-11', band: 'High', pct: 95, source: 'extracted' },
    { key: 'dueDate', label: 'Due date', value: '2026-03-13', band: 'Medium', pct: 78, source: 'extracted' },
    { key: 'currency', label: 'Currency', value: 'USD', band: 'High', pct: 99, source: 'extracted' },
    { key: 'poNumber', label: 'PO number', value: 'PO-4471', band: 'Medium', pct: 71, source: 'mapped' }
  ],
  lines: [
    { key: 'l1', desc: 'Hydraulic hose assembly 2in', qty: '12', unit: '148.00', amount: '1,776.00', band: 'High', pct: 96 },
    { key: 'l2', desc: 'Coupling, stainless steel', qty: '40', unit: '22.50', amount: '900.00', band: 'Medium', pct: 73 }
  ],
  totals: [
    { key: 'subtotal', label: 'Subtotal', value: '2,676.00', band: 'High', pct: 94, source: 'system' },
    { key: 'tax', label: 'Tax (8.25%)', value: '220.77', band: 'Medium', pct: 81, source: 'mapped' },
    { key: 'total', label: 'Total due', value: '2,896.77', band: 'High', pct: 92, source: 'system', grand: true }
  ],
  mapping: [
    { key: 'glCode', label: 'GL code', value: '6200-100', band: 'High', pct: 93, source: 'mapped' },
    { key: 'taxCode', label: 'Tax code', value: 'TX-STD-8.25', band: 'High', pct: 90, source: 'mapped' },
    { key: 'costCenter', label: 'Cost centre', value: 'CC-OPS-04', band: 'Medium', pct: 76, source: 'mapped' }
  ]
};

// --- Helper Components ---
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

const IssueChip = ({ severity, customLabel }) => {
  const map = { informational: 'info', warning: 'warning', blocking: 'danger', critical: 'danger', success: 'success', neutral: 'neutral' };
  const label = customLabel || severity.charAt(0).toUpperCase() + severity.slice(1);
  const colors = {
    info: 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]',
    warning: 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]',
    danger: 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]',
    success: 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]',
    neutral: 'text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0]'
  }[map[severity] || 'info'];

  return (
    <span className={`inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] ${colors}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current"></span>{label}
    </span>
  );
};

const ReadOnlyField = ({ field }) => (
  <div className="flex flex-col gap-1 min-w-0">
    <label className="text-[11px] font-bold text-[#5a6472]">{field.label}</label>
    <input
      type="text"
      value={field.value || ''}
      readOnly
      className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-[#fafbfc] text-[#151a21] w-full focus:outline-none"
    />
    <div className="flex items-center gap-[6px] flex-wrap min-h-[18px]">
      <ConfBadge band={field.band} pct={field.pct} />
      <SourceTag source={field.source} />
    </div>
  </div>
);

const FlaggedPage = () => {
  const [activeFlagId, setActiveFlagId] = useState(dummyFlagged[0].id);
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignee, setAssignee] = useState('m.chen — Accountant');

  const activeFlag = dummyFlagged.find(f => f.id === activeFlagId) || dummyFlagged[0];
  const isBlocking = activeFlag.severity === 'blocking' || activeFlag.severity === 'critical';
  const variant = isBlocking ? 'danger' : activeFlag.severity === 'warning' ? 'warning' : 'info';

  const handleResolve = () => {
    if (!resolutionNote.trim()) return;
    alert(`Flag resolved for ${activeFlag.id} with note: "${resolutionNote}" assigned to ${assignee}`);
    setResolutionNote('');
  };

  return (
    <div className="flex flex-col h-full p-[14px_16px] overflow-hidden bg-[#f4f5f7] text-[#151a21] font-sans">
      
      {/* Header & Tabs */}
      <div className="flex items-center mb-[11px] flex-none">
        <h1 className="text-[17px] font-semibold mr-4 m-0 leading-[1.25]">Queue</h1>
        <div className="flex border-b border-[#d7dbe2] gap-1 m-0">
          <Link to="/pending" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Pending Review (42)
          </Link>
          <Link to="/correction" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Correction (17)
          </Link>
          <Link to="/flagged" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#0b4f96] border-b-2 border-[#0b5cad] -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Flagged (9)
          </Link>
        </div>
      </div>

      {/* Split Pane view */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_1.35fr] gap-[12px]">
        
        {/* Left Pane - Flagged List */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
          <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none">
            <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Flagged documents</h3>
            <span className="ml-auto"></span>
            <span className="text-[12px] text-[#5a6472]">{dummyFlagged.length} open</span>
          </div>
          
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-[#fafbfc] sticky top-0 z-[2]">
                <tr>
                  <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold whitespace-nowrap">Document</th>
                  <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold whitespace-nowrap">Flag type</th>
                  <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold whitespace-nowrap">Severity</th>
                  <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold whitespace-nowrap">Owner</th>
                  <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold whitespace-nowrap">Age</th>
                  <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold whitespace-nowrap">Due</th>
                </tr>
              </thead>
              <tbody>
                {dummyFlagged.map(f => (
                  <tr 
                    key={f.id} 
                    onClick={() => setActiveFlagId(f.id)}
                    className={`cursor-pointer border-b border-[#d7dbe2] hover:bg-[#f8fafc] ${f.id === activeFlagId ? 'bg-[#eef4fb] shadow-[inset_0_0_0_1px_#0b5cad]' : ''}`}
                  >
                    <td className="p-[9px_12px] align-middle"><span className="font-mono">{f.id}</span></td>
                    <td className="p-[9px_12px] align-middle">{f.flag}</td>
                    <td className="p-[9px_12px] align-middle"><IssueChip severity={f.severity} /></td>
                    <td className="p-[9px_12px] align-middle">{f.owner}</td>
                    <td className="p-[9px_12px] align-middle">{f.age}</td>
                    <td className="p-[9px_12px] align-middle">{f.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Pane - Flag Detail */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
          <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none">
            <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Flag detail — {activeFlag.id}</h3>
            <span className="ml-auto"></span>
            <IssueChip severity={activeFlag.severity} customLabel={activeFlag.severity.charAt(0).toUpperCase() + activeFlag.severity.slice(1)} />
          </div>
          
          <div className="flex-1 min-h-0 overflow-auto p-[14px]">
            
            {/* Calculation Breakdown */}
            <div className={`border rounded-[6px] p-[11px_12px] mb-[12px] ${isBlocking ? 'border-[#efc0bd] bg-[#fbeae9]' : variant === 'warning' ? 'border-[#f0d5a5] bg-[#fdf1de]' : 'border-[#b6d2ee] bg-[#e7f0fa]'}`}>
              <h4 className={`text-[12px] mb-[6px] uppercase tracking-[0.05em] font-semibold ${isBlocking ? 'text-[#a5231c]' : variant === 'warning' ? 'text-[#8a5300]' : 'text-[#0b5cad]'}`}>
                Validation calculation that raised this flag
              </h4>
              <p className="text-[12px] mb-[8px] text-[#5a6472]">
                Tolerance is configured per client, currency, document type and legal entity. The backend supplied the tolerance used for <strong>this specific flag</strong>.
              </p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-[14px] gap-y-[3px] text-[12.5px] tabular-nums">
                <dt className="text-[#5a6472]">Invoice total (extracted)</dt><dd className="m-0 text-right font-semibold">$11,268.83</dd>
                <dt className="text-[#5a6472]">Approved PO value</dt><dd className="m-0 text-right font-semibold">$10,000.00</dd>
                <dt className="text-[#5a6472]">Line items matched to PO</dt><dd className="m-0 text-right font-semibold">2 of 2</dd>
                <dt className="text-[#5a6472]">Receipted quantity variance</dt><dd className="m-0 text-right font-semibold">0 units</dd>
                <dt className="text-[#5a6472]">Tolerance applied</dt><dd className="m-0 text-right font-semibold">$10,000.00 · USD · Invoice · APEX</dd>
                <dt className={`pt-[5px] mt-[3px] border-t font-bold ${isBlocking ? 'border-[#efc0bd]' : 'border-[#f0d5a5]'}`}>Variance over tolerance</dt>
                <dd className={`pt-[5px] mt-[3px] border-t font-bold text-right ${isBlocking ? 'border-[#efc0bd]' : 'border-[#f0d5a5]'}`}>$1,268.83</dd>
              </dl>
            </div>

            {/* Warning Box */}
            <div className="border border-[#f0d5a5] bg-[#fdf1de] rounded-[6px] p-[11px_12px] mb-[12px]">
              <h4 className="text-[12px] text-[#8a5300] mb-[6px] uppercase tracking-[0.05em] font-semibold">Second open flag on this document</h4>
              <div className="flex items-center gap-[9px] flex-wrap">
                <IssueChip severity="warning" />
                <span className="text-[12px]">Vendor tax ID on the invoice does not match Apex Industrial Supply's master record (advisory).</span>
              </div>
            </div>

            {/* Document Fields Form Panel */}
            <div className="bg-white border border-[#d7dbe2] rounded-[10px] mb-[12px]">
              <div className="flex items-center p-[11px_14px] border-b border-[#d7dbe2]">
                <h3 className="text-[13px] font-semibold m-0">Document fields — Apex Industrial Supply</h3>
              </div>
              <div className="p-[14px]">
                <div className="max-w-[620px] mx-auto">
                  <div className="mb-[16px]">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Header</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                      {docData.header.map((field) => <ReadOnlyField key={field.key} field={field} />)}
                    </div>
                  </div>
                  <div className="mb-[16px]">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Totals</div>
                    <div className="ml-auto max-w-[300px] mt-[12px]">
                      {docData.totals.map((t) => (
                        <div key={t.key} className="flex flex-col gap-1 min-w-0 mb-[8px]">
                          <label className="text-[11px] font-bold text-[#5a6472]">{t.label}</label>
                          <input
                            className={`border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-[#fafbfc] text-[#151a21] w-full focus:outline-none ${t.grand ? 'font-bold text-[15px] h-[38px]' : 'h-[33px]'}`}
                            value={t.value}
                            readOnly
                          />
                          <div className="flex items-center gap-[6px] flex-wrap min-h-[18px]">
                            <ConfBadge band={t.band} pct={t.pct} />
                            <SourceTag source={t.source} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Coding & mapping</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
                      {docData.mapping.map((field) => <ReadOnlyField key={field.key} field={field} />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution Section */}
            <div className="mb-[16px] max-w-[620px] mx-auto">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Resolution</div>
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="flagResolution" className="text-[11px] font-bold text-[#5a6472]">Resolution note (required to resolve)</label>
                <textarea 
                  id="flagResolution"
                  className="min-h-[74px] border border-[#b9c0cb] rounded-[6px] p-[9px] font-sans text-[13px] resize-y w-full focus:outline-none focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,0.15)]"
                  placeholder="Describe how this flag was resolved."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                ></textarea>
              </div>
              <div className="flex items-center gap-[9px] flex-wrap mt-[9px]">
                <div className="flex flex-col gap-[4px]">
                  <label htmlFor="flagAssignee" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Assign to (within Apex only)</label>
                  <select 
                    id="flagAssignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] font-sans text-[13px] bg-white text-[#151a21] min-w-[135px] focus:outline-none focus:border-[#0b5cad]"
                  >
                    <option>m.chen — Accountant</option>
                    <option>r.patel — AP team</option>
                    <option>j.okafor — Expense manager</option>
                    <option>Practice administrator</option>
                  </select>
                </div>
              </div>
              <p className="text-[12px] text-[#5a6472] mt-[7px]">
                Overriding a blocking flag requires an authorised role and a mandatory override reason. Assignees are limited to this client's team — cross-client reassignment is never offered.
              </p>
            </div>

            {/* Audit Trail Section */}
            <div className="mb-[16px] max-w-[620px] mx-auto">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Audit trail — resolved flags remain visible</div>
              <div className="flex gap-[9px] p-[9px_10px] border border-[#d7dbe2] bg-white rounded-[6px] items-start">
                <IssueChip severity="neutral" customLabel="Audit" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold m-[0_0_2px]">Flag raised by policy engine</p>
                  <p className="text-[12px] text-[#5a6472] m-0">2026-02-18 09:02 · system · {activeFlag.severity.charAt(0).toUpperCase() + activeFlag.severity.slice(1)} · {activeFlag.flag}</p>
                </div>
              </div>
              <div className="flex gap-[9px] p-[9px_10px] border border-[#d7dbe2] bg-white rounded-[6px] items-start mt-[7px]">
                <IssueChip severity="success" customLabel="Resolved" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold m-[0_0_2px]">Prior flag resolved — tax ID mismatch</p>
                  <p className="text-[12px] text-[#5a6472] m-0">2026-02-12 14:41 · r.patel · Apex vendor master updated with alias</p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="flex-none p-[9px_12px] border-t border-[#d7dbe2] bg-[#fafbfc] flex items-center gap-[8px] flex-wrap">
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer">
              Request information
            </button>
            <button className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#efc0bd] text-[#a5231c] rounded-[6px] hover:bg-[#fbeae9] whitespace-nowrap cursor-pointer">
              Reject document
            </button>
            <span className="ml-auto"></span>
            <button 
              disabled={!resolutionNote.trim()}
              onClick={handleResolve}
              className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] hover:bg-[#0a4f95] hover:border-[#0a4f95] whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resolve flag
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlaggedPage;