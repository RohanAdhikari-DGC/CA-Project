import React, { useState, useMemo, useEffect } from 'react';

// --- Dummy Data Generators ---
const CLIENTS = [
  { id: 'cl_apex', name: 'Apex Industrial Supply', code: 'APEX' },
  { id: 'cl_northwind', name: 'Northwind Paper Co.', code: 'NWPC' },
  { id: 'cl_meridian', name: 'Meridian Logistics', code: 'MRDN' },
  { id: 'cl_vertex', name: 'Vertex Components', code: 'VRTC' },
  { id: 'cl_orion', name: 'Orion Freight', code: 'ORFN' },
  { id: 'cl_kestrel', name: 'Kestrel Office Supplies', code: 'KSTR' }
];

const VENDORS = [
  'Apex Industrial Supply', 'Northwind Paper Co.', 'Meridian Logistics',
  'Vertex Components', 'Orion Freight', 'Kestrel Office Supplies',
  'Grand Harbour Hotel', 'Office Depot', 'Uber', 'Delta Cargo'
];

const STATUSES = {
  auto_erp: { label: 'Auto-approved, sent to ERP', variant: 'success' },
  erp_pending: { label: 'ERP upload pending', variant: 'info' },
  erp_failed: { label: 'ERP upload failed', variant: 'danger' },
  pending_review: { label: 'Pending review', variant: 'warning' },
  reviewed_erp: { label: 'Reviewed, sent to ERP', variant: 'success' },
  correction: { label: 'Correction required', variant: 'warning' },
  flagged: { label: 'Flagged', variant: 'danger' }
};

const STATUS_COLORS = {
  success: 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]',
  info: 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]',
  warning: 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]',
  danger: 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]',
  neutral: 'text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0]'
};

// Generate 85 deterministic dummy documents
const generateDummyData = () => {
  const docs = [];
  for (let i = 0; i < 85; i++) {
    const client = CLIENTS[i % CLIENTS.length];
    const type = ['Invoice', 'PO', 'Receipt', 'Credit Note', 'Debit Note'][i % 5];
    const statusKey = Object.keys(STATUSES)[i % Object.keys(STATUSES).length];
    const confBand = ['High', 'Medium', 'Low'][i % 3];
    const confPct = confBand === 'High' ? 92 + (i % 8) : confBand === 'Medium' ? 66 + (i % 15) : 40 + (i % 20);
    const vendorName = VENDORS[(i * 3) % VENDORS.length];
    
    docs.push({
      id: `${client.code}-2026-${String(4800 + i).padStart(5, '0')}`,
      file: `inv_${vendorName.split(' ')[0].toLowerCase()}_${1000 + i}.pdf`,
      client: client,
      type: type,
      vendor: vendorName,
      amount: 150.50 + (i * 243.21) % 12000,
      confidenceBand: confBand,
      confidencePct: confPct,
      received: `2026-02-${String(28 - (i % 28)).padStart(2, '0')} ${String(9 + (i % 8)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
      status: statusKey
    });
  }
  return docs;
};

const DUMMY_DOCS = generateDummyData();

// --- Main Component ---
const CrossClientDocumentsPage = () => {
  // State
  const [filters, setFilters] = useState({
    client: '',
    type: '',
    status: '',
    confidence: '',
    vendor: '',
    minAmount: '',
    reviewer: '',
    sortBy: 'Received date'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Derived Data (Filtering & Sorting)
  const filteredDocs = useMemo(() => {
    let result = DUMMY_DOCS.filter(doc => {
      const minAmount = parseFloat(filters.minAmount);
      return (
        (!filters.client || doc.client.id === filters.client) &&
        (!filters.type || doc.type === filters.type) &&
        (!filters.status || doc.status === filters.status) &&
        (!filters.confidence || doc.confidenceBand === filters.confidence) &&
        (!filters.vendor || doc.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) &&
        (isNaN(minAmount) || doc.amount >= minAmount)
      );
    });

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'Client': return a.client.name.localeCompare(b.client.name);
        case 'Confidence': return b.confidencePct - a.confidencePct;
        case 'Amount': return b.amount - a.amount;
        case 'Received date':
        default:
          return b.received.localeCompare(a.received);
      }
    });

    return result;
  }, [filters]);

  // Pagination
  const totalItems = filteredDocs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      client: '', type: '', status: '', confidence: '',
      vendor: '', minAmount: '', reviewer: '', sortBy: 'Received date'
    });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <section className="flex-1 min-h-0 overflow-auto p-[20px_22px_40px] bg-[#f4f5f7] text-[#151a21]" aria-labelledby="h-cross">
      {/* Page Header */}
      <div className="flex items-start gap-4 mb-4 flex-wrap">
        <div className="min-w-[220px] flex-1">
          <h1 id="h-cross" className="text-[20px] font-semibold leading-tight m-0">Cross-Client Documents</h1>
          <p className="text-[#5a6472] text-[12.5px] mt-[3px] max-w-[74ch]">
            Read-and-navigate only. Field edits and ERP actions are never available across clients — opening a row takes you into that document's own client workspace.
          </p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button className="inline-flex items-center gap-[6px] h-[32px] px-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[13px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors" onClick={() => alert('Export CSV Triggered')}>
            Bulk export CSV
          </button>
          <button className="inline-flex items-center gap-[6px] h-[32px] px-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[13px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors" onClick={() => alert('Export XLSX Triggered')}>
            Export XLSX
          </button>
        </div>
      </div>

      {/* Practice Banner */}
      <div className="flex items-center gap-[9px] p-[9px_13px] rounded-[6px] text-[12.5px] font-semibold mb-[14px] bg-[#efeafc] border border-[#cec1f0] text-[#4a2fa0]">
        <span aria-hidden="true">◆</span> 
        <span>Practice-level view spanning <strong>{CLIENTS.length}</strong> clients. Reassignment is only offered within the same client.</span>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,.06),0_1px_3px_rgba(16,24,40,.1)] flex flex-col">
        
        {/* Filters Form */}
        <form className="flex gap-[10px] flex-wrap items-end p-[12px_14px] border-b border-[#d7dbe2]" onSubmit={e => e.preventDefault()}>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfClient" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Client</label>
            <select id="xfClient" name="client" value={filters.client} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15">
              <option value="">All clients</option>
              {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfType" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Document type</label>
            <select id="xfType" name="type" value={filters.type} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15">
              <option value="">All types</option>
              <option value="Invoice">Invoice</option>
              <option value="PO">PO</option>
              <option value="Receipt">Receipt</option>
              <option value="Credit Note">Credit Note</option>
              <option value="Debit Note">Debit Note</option>
            </select>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfStatus" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Status</label>
            <select id="xfStatus" name="status" value={filters.status} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15">
              <option value="">All statuses</option>
              {Object.entries(STATUSES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfConf" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Confidence</label>
            <select id="xfConf" name="confidence" value={filters.confidence} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15">
              <option value="">Any</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfVendor" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Vendor</label>
            <input id="xfVendor" name="vendor" type="search" placeholder="Vendor name" value={filters.vendor} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15" />
          </div>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfMin" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Amount min</label>
            <input id="xfMin" name="minAmount" type="number" placeholder="0" value={filters.minAmount} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15" />
          </div>
          <div className="flex flex-col gap-[4px]">
            <label htmlFor="xfSort" className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Sort by</label>
            <select id="xfSort" name="sortBy" value={filters.sortBy} onChange={handleFilterChange} className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15">
              <option value="Received date">Received date</option>
              <option value="Client">Client</option>
              <option value="Confidence">Confidence</option>
              <option value="Amount">Amount</option>
            </select>
          </div>
          <button type="button" onClick={handleClearFilters} className="inline-flex items-center justify-center h-[31px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white hover:bg-[#fafbfc] transition-colors">
            Clear
          </button>
        </form>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <caption className="sr-only">Documents across clients</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap"><span className="sr-only">View file</span></th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Client</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Document</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Type</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Vendor</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Amount</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Confidence</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Received</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap">Status</th>
                <th scope="col" className="sticky top-0 z-[2] bg-[#fafbfc] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold py-[9px] px-[12px] border-b border-[#d7dbe2] whitespace-nowrap text-right">Open in workspace</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocs.length > 0 ? (
                paginatedDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#f8fafc] group">
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">
                      <button className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white grid place-items-center text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] transition-colors" aria-label={`View file ${doc.file} in a lightbox`}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                    </td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">
                      <div className="flex flex-col gap-[1px]">
                        <strong className="font-semibold text-[12.5px]">{doc.client.name}</strong>
                        <span className="text-[11px] text-[#7b8494] font-mono">{doc.client.code}</span>
                      </div>
                    </td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">
                      <div className="flex flex-col gap-[1px]">
                        <strong className="font-semibold text-[12.5px] font-mono">{doc.id}</strong>
                        <span className="text-[11.5px] text-[#5a6472]">{doc.file}</span>
                      </div>
                    </td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">{doc.type}</td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">{doc.vendor}</td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle text-right font-mono text-[12.5px]">{formatMoney(doc.amount)}</td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">
                      <span className={`inline-flex items-center gap-[4px] px-[7px] py-[1px] rounded-[20px] border text-[10.5px] font-bold cursor-default ${STATUS_COLORS[doc.confidenceBand === 'High' ? 'success' : doc.confidenceBand === 'Medium' ? 'warning' : 'danger']}`} title={`${doc.confidenceBand} confidence — ${doc.confidencePct}%`}>
                        {doc.confidenceBand} <span className="font-semibold opacity-85 ml-[2px]">{doc.confidencePct}%</span>
                      </span>
                    </td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle font-mono text-[12px]">{doc.received}</td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">
                      <span className={`inline-flex items-center gap-[6px] px-[7px] py-[2px] rounded-[20px] border text-[11.5px] font-semibold leading-[1.6] whitespace-nowrap ${STATUS_COLORS[STATUSES[doc.status].variant]}`}>
                        <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
                        {STATUSES[doc.status].label}
                      </span>
                    </td>
                    <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle text-right">
                      <button className="inline-flex items-center justify-center h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors">
                        Open in {doc.client.code}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="p-[24px] text-center text-[#5a6472]">
                    No documents match the current filters across the clients you can access.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-[10px] p-[11px_14px] border-t border-[#d7dbe2] text-[12.5px] text-[#5a6472]">
          <span>
            Showing {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems.toLocaleString()}
          </span>
          <span className="ml-auto"></span>
          <button 
            className="inline-flex items-center justify-center h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white font-medium hover:bg-[#fafbfc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹ Previous
          </button>
          <button 
            className="inline-flex items-center justify-center h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white font-medium hover:bg-[#fafbfc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next ›
          </button>
        </div>

      </div>
    </section>
  );
};

export default CrossClientDocumentsPage;