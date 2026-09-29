import React, { useState } from 'react';
import Table from '../../components/ui/Table'; // Adjust path if necessary

// Helper to generate the status chips matching HTML design tokens
const getStatusChip = (status) => {
  if (status === 'posted' || status === 'paid') return <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold whitespace-nowrap text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]"><span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  if (status === 'pending' || status === 'partially received' || status === 'open') return <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold whitespace-nowrap text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]"><span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  if (status === 'failed' || status === 'blocked') return <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold whitespace-nowrap text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]"><span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  return <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold whitespace-nowrap text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0]"><span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
};

// Dummy Data mapped by Document Types
const DOC_TYPES = {
  'Invoice': {
    columns: [
      { label: <span className="sr-only">View file</span> },
      { label: 'Vendor' }, { label: 'Invoice number' }, { label: 'Invoice date' },
      { label: 'GL code' }, { label: 'Tax code' }, { label: 'Cost centre' },
      { label: 'Total', className: 'text-right' }, { label: 'Currency' }, { label: 'ERP status' }
    ],
    data: Array.from({ length: 45 }, (_, i) => ({
      id: `inv-${i}`,
      cells: [
        { value: ['Apex Industrial Supply', 'Northwind Paper Co.', 'Meridian Logistics', 'Vertex Components', 'Orion Freight'][i % 5] },
        { value: `APEX-${8800 + i * 7}` },
        { value: `2026-02-${String((i % 28) + 1).padStart(2, '0')}` },
        { value: ['6200-100', '6100-200', '6300-400', '6400-010'][i % 4] },
        { value: 'TX-STD-8.25' },
        { value: ['CC-OPS-04', 'CC-ADM-01', 'CC-LOG-02'][i % 3] },
        { value: `$${(1200 + i * 15.5).toLocaleString('en-US', {minimumFractionDigits: 2})}`, isNumeric: true },
        { value: 'USD' },
        { render: () => getStatusChip(['posted', 'pending', 'failed'][i % 3]) }
      ]
    }))
  },
  'PO': {
    columns: [
      { label: <span className="sr-only">View file</span> },
      { label: 'PO number' }, { label: 'Requester' }, { label: 'Vendor' },
      { label: 'Line items' }, { label: 'Budget / project' }, { label: 'Status' }
    ],
    data: Array.from({ length: 25 }, (_, i) => ({
      id: `po-${i}`,
      cells: [
        { value: `PO-${4400 + i * 13}` },
        { value: ['r.patel', 'j.okafor', 'm.chen'][i % 3] },
        { value: ['Vertex Components', 'Orion Freight', 'Steelcraft Fasteners'][i % 3] },
        { value: `${1 + (i % 6)} lines` },
        { value: ['PRJ-FOUNDRY-26', 'PRJ-DIST-26', 'OPEX-ADMIN'][i % 3] },
        { render: () => getStatusChip(['open', 'partially received', 'closed'][i % 3]) }
      ]
    }))
  },
  'Receipt': {
    columns: [
      { label: <span className="sr-only">View file</span> },
      { label: 'Employee' }, { label: 'Merchant' }, { label: 'Transaction date' },
      { label: 'Expense category' }, { label: 'Amount', className: 'text-right' }, { label: 'Reimbursement status' }
    ],
    data: Array.from({ length: 15 }, (_, i) => ({
      id: `rc-${i}`,
      cells: [
        { value: ['j.okafor', 'm.chen', 'r.patel'][i % 3] },
        { value: ['Uber', 'Office Depot', 'Grand Harbour Hotel'][i % 3] },
        { value: `2026-02-${String((i % 28) + 1).padStart(2, '0')}` },
        { value: ['Ground transport', 'Lodging', 'Office supplies'][i % 3] },
        { value: `$${(30 + i * 8.2).toLocaleString('en-US', {minimumFractionDigits: 2})}`, isNumeric: true },
        { render: () => getStatusChip(['pending', 'approved', 'paid'][i % 3]) }
      ]
    }))
  },
  'Credit Note': {
    columns: [
      { label: <span className="sr-only">View file</span> },
      { label: 'Vendor' }, { label: 'Credit note number' }, { label: 'Date' },
      { label: 'Original invoice' }, { label: 'Amount', className: 'text-right' }, { label: 'ERP status' }
    ],
    data: Array.from({ length: 8 }, (_, i) => ({
      id: `cn-${i}`,
      cells: [
        { value: ['Apex Industrial Supply', 'Northwind Paper Co.'][i % 2] },
        { value: `CN-${2200 + i * 14}` },
        { value: `2026-02-0${i+1}` },
        { value: `APEX-${8790 + i}` },
        { value: `-$${(410 + i * 10).toLocaleString('en-US', {minimumFractionDigits: 2})}`, isNumeric: true },
        { render: () => getStatusChip('posted') }
      ]
    }))
  },
  'Debit Note': {
    columns: [
      { label: <span className="sr-only">View file</span> },
      { label: 'Vendor' }, { label: 'Debit note number' }, { label: 'Date' },
      { label: 'Original invoice' }, { label: 'Amount', className: 'text-right' }, { label: 'ERP status' }
    ],
    data: Array.from({ length: 5 }, (_, i) => ({
      id: `dn-${i}`,
      cells: [
        { value: ['Meridian Logistics', 'Vertex Components'][i % 2] },
        { value: `DN-${44 + i * 9}` },
        { value: `2026-02-0${i+2}` },
        { value: `MRDN-${1102 + i}` },
        { value: `$${(220 + i * 5).toLocaleString('en-US', {minimumFractionDigits: 2})}`, isNumeric: true },
        { render: () => getStatusChip('pending') }
      ]
    }))
  }
};

const ViewDocumentsPage = () => {
  const [activeTab, setActiveTab] = useState('Invoice');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const currentData = DOC_TYPES[activeTab];
  const totalItems = currentData.data.length;

  // Pagination logic
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = currentData.data.slice(startIndex, startIndex + pageSize);

  // Individual Table Row implementation
  const renderRow = (item, idx) => {
    // Find the primary reference ID for the modal (Invoice/PO number)
    const docId = item.cells[1].value;

    return (
      <tr key={item.id || idx} className="hover:bg-[#f8fafc] border-b border-[#d7dbe2] text-[13px] transition-colors">
        <td className="py-[9px] px-[12px] align-middle">
          <button 
            onClick={() => setSelectedDoc(docId)} 
            className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white flex items-center justify-center cursor-pointer text-[#5a6472] hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad]" 
            aria-label="View document file"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </td>
        {item.cells.map((cell, cIdx) => (
          <td key={cIdx} className={`py-[9px] px-[12px] align-middle ${cell.isNumeric ? 'text-right tabular-nums' : ''}`}>
            {cell.render ? cell.render() : cell.value}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-[20px_22px_40px]">
      {/* Header section */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4 shrink-0">
        <div className="min-w-[220px]">
          <h1 className="text-[20px] font-semibold leading-tight m-0 text-[#151a21]">View Documents</h1>
          <p className="text-[#5a6472] text-[12.5px] mt-[3px] mb-0 max-w-[74ch]">
            Reference lookup for the active client's processed documents, organised by document type. No workflow actions here.
          </p>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] flex flex-col min-h-0 flex-1">
        
        {/* Document Type Tabs */}
        <div className="px-3.5 pt-0 border-b-0 shrink-0">
          <div className="flex gap-1 border-b border-[#d7dbe2] pt-2">
            {Object.keys(DOC_TYPES).map(type => (
              <button
                key={type}
                onClick={() => { setActiveTab(type); setCurrentPage(1); }}
                className={`border-0 bg-transparent font-inherit text-[13px] font-semibold px-[13px] py-[9px] cursor-pointer border-b-2 -mb-[1px] transition-colors ${
                  activeTab === type
                    ? 'text-[#0b4f96] border-b-[#0b5cad]'
                    : 'text-[#5a6472] border-b-transparent hover:text-[#151a21]'
                }`}
                aria-selected={activeTab === type}
                role="tab"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Reusable Table integration */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Table 
            columns={currentData.columns} 
            data={paginatedData} 
            renderRow={renderRow}
            pagination={true}
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>

      </div>

      {/* Dummy Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-[#1018288c] flex justify-center items-center z-[100] p-5">
          <div className="bg-white rounded-[10px] shadow-[0_10px_30px_rgba(16,24,40,0.16)] w-[min(900px,100%)] max-h-[88vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true">
            <div className="flex items-center gap-2.5 p-[15px_18px_15px] border-b border-[#d7dbe2]">
              <h2 className="text-[16px] font-semibold m-0 text-[#151a21]">File preview — {selectedDoc}</h2>
              <span className="ml-auto"></span>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="inline-flex items-center justify-center h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[12px] font-medium cursor-pointer hover:bg-[#fafbfc]"
              >
                Close
              </button>
            </div>
            <div className="p-0 overflow-auto bg-[#5b6472] flex-1">
              <div className="flex justify-center items-start min-h-full p-[22px]">
                
                {/* HTML Replica Dummy Scan */}
                <div className="bg-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] p-[34px_30px] w-full max-w-[520px] text-[#1b1b1b] text-[12px] leading-[1.5]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  <div className="flex justify-between gap-4 border-b-2 border-[#333] pb-[10px] mb-[14px]">
                    <div className="text-[15px] font-bold">
                      Vendor
                      <span className="block text-[10.5px] font-normal text-[#555]">1420 Foundry Road, Chicago IL 60632 · VAT US-88-1029384</span>
                    </div>
                    <div className="text-[19px] font-bold tracking-[0.14em] text-right">INVOICE</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-[18px] gap-y-[4px] mb-[16px] text-[11.5px]">
                    <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Invoice No.</span><strong>{selectedDoc}</strong></div>
                    <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Invoice Date</span><strong>2026-02-11</strong></div>
                    <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Due Date</span><strong>2026-03-13</strong></div>
                    <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Currency</span><strong>USD</strong></div>
                    <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>PO Number</span><strong>PO-4471</strong></div>
                    <div className="flex justify-between border-b border-dotted border-[#bbb] pb-[2px]"><span>Terms</span><strong>Net 30</strong></div>
                  </div>
                  
                  <table className="w-full border-collapse text-[11px] mb-[12px]">
                    <thead>
                      <tr>
                        <th className="border-y border-[#333] p-[5px_4px] text-left text-[10px] uppercase">Description</th>
                        <th className="border-y border-[#333] p-[5px_4px] text-right text-[10px] uppercase">Qty</th>
                        <th className="border-y border-[#333] p-[5px_4px] text-right text-[10px] uppercase">Unit</th>
                        <th className="border-y border-[#333] p-[5px_4px] text-right text-[10px] uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd]">Hydraulic hose assembly 2in</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">12</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">148.00</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">1,776.00</td>
                      </tr>
                      <tr>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd]">Coupling, stainless steel</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">40</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">22.50</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">900.00</td>
                      </tr>
                      <tr>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd]">Freight and handling</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">1</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">184.00</td>
                        <td className="p-[5px_4px] border-b border-dotted border-[#ddd] text-right">184.00</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <div className="ml-auto w-[230px] text-[11.5px]">
                    <div className="flex justify-between py-[3px]"><span>Subtotal</span><span>2,860.00</span></div>
                    <div className="flex justify-between py-[3px]"><span>Tax (8.25%)</span><span>235.95</span></div>
                    <div className="flex justify-between py-[3px] border-t-[1.5px] border-[#333] font-bold text-[13px] mt-[4px] pt-[6px]"><span>Total due</span><span>3,095.95</span></div>
                  </div>
                  
                  <div className="mt-[22px] text-[10px] text-[#666] border-t border-[#ddd] pt-[8px]">
                    Remit to: Vendor · Demo rendering of the uploaded source file.
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ViewDocumentsPage;