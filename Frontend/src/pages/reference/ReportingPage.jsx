// src/pages/reporting/ReportingPage.jsx
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Table from '../../components/ui/Table';

const ReportingPage = () => {
  const { activeClient } = useAppContext();
  const practiceTier = !activeClient;
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy reporting data mapped exactly to your HTML
  const rawReports = [
    { id: 1, name: 'Documents received', scope: practiceTier ? 'All clients' : 'This client', access: 'view_export' },
    { id: 2, name: 'Straight-through processing', scope: practiceTier ? 'Per client + practice-wide' : 'This client', access: 'view_export' },
    { id: 3, name: 'Review queue aging', scope: practiceTier ? 'Per client' : 'This client', access: 'view_export' },
    { id: 4, name: 'Flagged documents', scope: practiceTier ? 'Per client' : 'This client', access: 'view_export' },
    { id: 5, name: 'ERP posting results', scope: practiceTier ? 'Per client' : 'This client', access: 'view' },
    { id: 6, name: 'Reimbursement drafts', scope: '—', access: 'none' },
    { id: 7, name: 'Extraction correction rate by field', scope: practiceTier ? 'Across clients' : 'This client', access: practiceTier ? 'view' : 'view_export' },
    { id: 8, name: 'Duplicate detection counts', scope: practiceTier ? 'Per client' : 'This client', access: 'view_export' },
    { id: 9, name: 'Policy violations', scope: practiceTier ? 'Per client' : 'This client', access: practiceTier ? 'none' : 'view' }
  ];

  // Search filtering logic
  const filteredReports = rawReports.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.scope.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { label: 'Report' },
    { label: 'Scope' },
    { label: 'Your access' },
    { label: 'Actions', className: 'text-right' }
  ];

  const renderRow = (item) => {
    let chip;
    if (item.access === 'view_export') {
      chip = (
        <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold leading-[1.6] whitespace-nowrap text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6] cursor-default">
          <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
          View & export
        </span>
      );
    } else if (item.access === 'view') {
      chip = (
        <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold leading-[1.6] whitespace-nowrap text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0] cursor-default">
          <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
          View only
        </span>
      );
    } else {
      chip = (
        <span className="inline-flex items-center gap-1.5 px-[7px] py-[1px] rounded-[20px] border text-[11.5px] font-semibold leading-[1.6] whitespace-nowrap text-[#a5231c] bg-[#fbeae9] border-[#efc0bd] cursor-default">
          <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
          No access
        </span>
      );
    }

    const canOpen = item.access !== 'none';
    const canExport = item.access === 'view_export';

    return (
      <tr key={item.id} className="border-b border-[#d7dbe2] hover:bg-[#f8fafc] group align-middle">
        <td className="py-[9px] px-[12px]">{item.name}</td>
        <td className="py-[9px] px-[12px] text-[#5a6472]">{item.scope}</td>
        <td className="py-[9px] px-[12px]">{chip}</td>
        <td className="py-[9px] px-[12px]">
          <div className="flex gap-[6px] justify-end">
            <button
              className={`inline-flex items-center justify-center h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[12px] font-medium transition-colors ${!canOpen ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#fafbfc] hover:border-[#9aa4b3]'}`}
              disabled={!canOpen}
              title={!canOpen ? "Your role cannot view this report" : ""}
              onClick={() => alert(`Opening report: ${item.name}`)}
            >
              Open
            </button>
            <button
              className={`inline-flex items-center justify-center h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[12px] font-medium transition-colors ${!canExport ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#fafbfc] hover:border-[#9aa4b3]'}`}
              disabled={!canExport}
              title={!canExport ? "Your role cannot export this report" : ""}
              onClick={() => alert(`Exporting report: ${item.name}`)}
            >
              Export
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section className="flex-1 flex flex-col min-h-0 overflow-auto p-5 pb-10">
      <div className="flex items-start gap-4 mb-4 flex-wrap">
        <div className="min-w-[220px]">
          <h1 className="text-[20px] font-semibold m-0 leading-tight">Reporting</h1>
          <p className="text-[#5a6472] text-[12.5px] mt-[3px] mb-0 max-w-[74ch]">
            {practiceTier
              ? 'Practice-level roles are reporting across every client they can access. Client-level reports are never visible to a user not assigned to that client.'
              : `Scoped to ${activeClient?.name || 'the active client'}. Practice-level roles can switch scope in the Client Switcher to report across clients.`}
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] mb-4">
        <div className="p-[14px]">
          <div className="flex flex-col gap-1 w-full">
            <label htmlFor="reportSearch" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Global search</label>
            <input
              id="reportSearch"
              type="search"
              className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] text-[#151a21] w-full focus:outline-none focus:border-[#0b5cad] focus:ring-[2px] focus:ring-[#0b5cad]/15"
              placeholder="Document ID, invoice/receipt number, vendor or alias, ERP reference, employee, PO, GL code, cost centre, project, file name, amount, tax ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-[9px] flex-wrap mt-[10px]">
            <span className="text-[12px] text-[#5a6472]">Suggested:</span>
            {['DOC-2024-04871', 'Apex Industrial Supply', 'PO-4471', '6200-100'].map(term => (
              <button
                key={term}
                className="inline-flex items-center justify-center h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[12px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] whitespace-nowrap cursor-pointer"
                onClick={() => setSearchQuery(term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] flex flex-col overflow-hidden">
        <div className="flex items-center gap-[10px] px-[14px] py-[11px] border-b border-[#d7dbe2]">
          <h3 className="text-[13px] font-semibold m-0">Standard reports</h3>
          <div className="ml-auto"></div>
          <button
            className="inline-flex items-center justify-center h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[12px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] cursor-pointer mr-2"
            onClick={() => alert('Exporting all to CSV...')}
          >
            Export CSV
          </button>
          <button
            className="inline-flex items-center justify-center h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[12px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] cursor-pointer"
            onClick={() => alert('Exporting all to XLSX...')}
          >
            Export XLSX
          </button>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={filteredReports}
            renderRow={renderRow}
            emptyMessage="No reports match your search criteria."
            pagination={false}
          />
        </div>
      </div>
    </section>
  );
};

export default ReportingPage;