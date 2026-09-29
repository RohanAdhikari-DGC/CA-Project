import React, { useState } from 'react';
import KPICard from '../../components/ui/KPICard';
import Table from '../../components/ui/Table';

const PracticeDashboardPage = () => {
  // --- Dummy Data ---
  const clientsData = [
    { name: 'Apex Industrial Supply', code: 'APEX', docs: 1250, stp: 74.1, exceptions: 9 },
    { name: 'Meridian Logistics', code: 'MRDN', docs: 980, stp: 59.2, exceptions: 14 },
    { name: 'Vertex Components', code: 'VRTC', docs: 850, stp: 78.5, exceptions: 4 },
    { name: 'Northwind Paper Co.', code: 'NWPC', docs: 720, stp: 66.8, exceptions: 6 },
    { name: 'Orion Freight', code: 'ORFN', docs: 610, stp: 62.0, exceptions: 11 },
    { name: 'Kestrel Office Supplies', code: 'KSTR', docs: 402, stp: 81.3, exceptions: 2 }
  ];

  const confidenceData = [
    { label: 'High', val: 3417, color: 'bg-[#5aa87c]' },
    { label: 'Medium', val: 1108, color: 'bg-[#d9a441]' },
    { label: 'Low', val: 287, color: 'bg-[#cd6a63]' }
  ];

  const slaBreaches = [
    { client: 'Apex Industrial Supply', doc: 'APEX-2026-04855', breach: 'Duplicate invoice number', age: '14h' },
    { client: 'Northwind Paper Co.', doc: 'NWPC-2026-04820', breach: 'Amount exceeds PO tolerance', age: '1d 2h' },
    { client: 'Meridian Logistics', doc: 'MRDN-2026-04901', breach: 'Vendor blocked in master data', age: '2d 5h' }
  ];

  const productivity = [
    { reviewer: 'm.chen', client: 'Apex Industrial Supply', docs: 112, correction: '4.2%', time: '2m 14s' },
    { reviewer: 'r.patel', client: 'Apex Industrial Supply', docs: 89, correction: '5.1%', time: '3m 05s' },
    { reviewer: 'j.okafor', client: 'Meridian Logistics', docs: 145, correction: '3.8%', time: '1m 58s' },
    { reviewer: 'm.chen', client: 'Vertex Components', docs: 76, correction: '2.9%', time: '2m 40s' }
  ];

  // --- Calculations ---
  const totalDocs = clientsData.reduce((acc, c) => acc + c.docs, 0);
  const maxDocs = Math.max(...clientsData.map(c => c.docs));
  const maxExceptions = Math.max(...clientsData.map(c => c.exceptions));
  const topClients = [...clientsData].sort((a, b) => b.docs - a.docs).slice(0, 5);

  // --- Helper to Render Bar Charts ---
  const renderBar = (label, val, max, colorClass, displayVal) => (
    <div key={label} className="grid grid-cols-[150px_1fr_52px] items-center gap-2.5 text-[12.5px] mb-2.5 last:mb-0">
      <span className="truncate text-gray-800">{label}</span>
      <div className="h-3.5 bg-[#eef0f3] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.round((val / max) * 100)}%` }}></div>
      </div>
      <span className="text-right tabular-nums text-gray-500 font-semibold">{displayVal || val}</span>
    </div>
  );

  // --- Table Configurations ---
  const topClientsCols = [
    { label: 'Client', className: 'w-[40%]' },
    { label: 'Docs', className: 'w-[20%] text-right' },
    { label: 'Exception rate', className: 'w-[20%] text-right' },
    { label: 'STP', className: 'w-[20%] text-right' }
  ];

  const renderTopClientRow = (c, idx) => (
    <tr key={idx} className="border-b border-[#d7dbe2] hover:bg-[#f8fafc] transition-colors">
      <td className="py-2.5 px-3.5 text-gray-800">{c.name}</td>
      <td className="py-2.5 px-3.5 text-right tabular-nums">{c.docs.toLocaleString()}</td>
      <td className="py-2.5 px-3.5 text-right tabular-nums">{((c.exceptions / c.docs) * 100).toFixed(1)}%</td>
      <td className="py-2.5 px-3.5 text-right tabular-nums">{c.stp}%</td>
    </tr>
  );

  const slaCols = [
    { label: 'Client', className: 'w-[25%]' },
    { label: 'Document', className: 'w-[20%]' },
    { label: 'Breach', className: 'w-[30%]' },
    { label: 'Age', className: 'w-[15%]' },
    { label: <span className="sr-only">Actions</span>, className: 'w-[10%] text-right' }
  ];

  const renderSlaRow = (b, idx) => (
    <tr key={idx} className="border-b border-[#d7dbe2] hover:bg-[#f8fafc] transition-colors">
      <td className="py-2.5 px-3.5 text-gray-800">{b.client}</td>
      <td className="py-2.5 px-3.5 font-mono text-[12px] font-semibold">{b.doc}</td>
      <td className="py-2.5 px-3.5 text-gray-800">{b.breach}</td>
      <td className="py-2.5 px-3.5 text-gray-800">{b.age}</td>
      <td className="py-2.5 px-3.5 text-right flex justify-end">
        <button className="h-[26px] px-2.5 text-xs border border-[#b9c0cb] rounded bg-white font-medium hover:bg-[#fafbfc] transition-colors text-gray-700">
          Open
        </button>
      </td>
    </tr>
  );

  const prodCols = [
    { label: 'Reviewer', className: 'w-[20%]' },
    { label: 'Client', className: 'w-[25%]' },
    { label: 'Docs reviewed', className: 'w-[15%] text-right' },
    { label: 'Correction rate', className: 'w-[20%] text-right' },
    { label: 'Avg. handling time', className: 'w-[20%] text-right' }
  ];

  const renderProdRow = (p, idx) => (
    <tr key={idx} className="border-b border-[#d7dbe2] hover:bg-[#f8fafc] transition-colors">
      <td className="py-2.5 px-3.5 text-gray-800">{p.reviewer}</td>
      <td className="py-2.5 px-3.5 text-gray-800">{p.client}</td>
      <td className="py-2.5 px-3.5 text-right tabular-nums">{p.docs}</td>
      <td className="py-2.5 px-3.5 text-right tabular-nums">{p.correction}</td>
      <td className="py-2.5 px-3.5 text-right tabular-nums">{p.time}</td>
    </tr>
  );

  return (
    <div className="fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-[#151a21] leading-tight mb-1">Practice Dashboard</h1>
          <p className="text-[#5a6472] text-[12.5px] max-w-[74ch] m-0">
            Spans every client you are assigned to. All figures come from the practice-level reporting endpoint — the frontend never aggregates per-client numbers itself.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors">
            Last 30 days ▾
          </button>
          <button className="h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <KPICard 
          title="Documents across practice" 
          value={totalDocs.toLocaleString()}
          className="border-l-[3px] border-l-[#5a3fb5]"
          footer={<><span className="font-bold text-[#1a6e45]">▲ 8.4%</span> vs. previous period</>}
        />
        <KPICard 
          title="Active clients" 
          value={clientsData.length}
          className="border-l-[3px] border-l-[#5a3fb5]"
          footer="2 onboarding in progress"
        />
        <KPICard 
          title="Practice-wide STP rate" 
          value="68.9%"
          className="border-l-[3px] border-l-[#5a3fb5]"
          footer={<><span className="font-bold text-[#1a6e45]">▲ 1.4 pts</span> auto-approved & posted</>}
        />
        <KPICard 
          title="SLA breaches" 
          value="7"
          className="border-l-[3px] border-l-[#5a3fb5]"
          footer={<span className="font-bold text-[#a5231c]">3 clients affected</span>}
        />
        <KPICard 
          title="ERP posting success" 
          value="96.1%"
          className="border-l-[3px] border-l-[#5a3fb5]"
          footer="Across 6 ERP connections"
        />
      </div>

      {/* Row 1: Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4">
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#151a21] m-0">Documents by client</h3>
            <span className="text-[12px] text-[#5a6472]">Practice-wide</span>
          </div>
          <div className="p-3.5">
            {clientsData.map(c => renderBar(c.name, c.docs, maxDocs, 'bg-[#8b6fd6]'))}
          </div>
        </div>

        <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center">
            <h3 className="text-[13px] font-semibold text-[#151a21] m-0">Confidence distribution across practice</h3>
          </div>
          <div className="p-3.5">
            {confidenceData.map(c => renderBar(c.label, c.val, 3417, c.color))}
          </div>
        </div>
      </div>

      {/* Row 2: Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4">
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center">
            <h3 className="text-[13px] font-semibold text-[#151a21] m-0">Straight-through rate per client</h3>
          </div>
          <div className="p-3.5">
            {clientsData.map(c => renderBar(
              c.code, 
              c.stp, 
              100, 
              c.stp >= 70 ? 'bg-[#5aa87c]' : c.stp >= 62 ? 'bg-[#5b8fd6]' : 'bg-[#d9a441]', 
              `${c.stp}%`
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center">
            <h3 className="text-[13px] font-semibold text-[#151a21] m-0">Flagged volume by severity per client</h3>
          </div>
          <div className="p-3.5">
            {clientsData.map(c => renderBar(
              c.code, 
              c.exceptions, 
              maxExceptions, 
              c.exceptions >= 10 ? 'bg-[#cd6a63]' : 'bg-[#d9a441]'
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4">
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center">
            <h3 className="text-[13px] font-semibold text-[#151a21] m-0">Top clients by volume & exception rate</h3>
          </div>
          <Table 
            columns={topClientsCols} 
            data={topClients} 
            renderRow={renderTopClientRow}
            pagination={false}
          />
        </div>

        <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#151a21] m-0">SLA breaches / escalations</h3>
            <button className="h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] hover:bg-[#fafbfc] transition-colors">
              Open cross-client list
            </button>
          </div>
          <Table 
            columns={slaCols} 
            data={slaBreaches} 
            renderRow={renderSlaRow}
            pagination={false}
          />
        </div>
      </div>

      {/* Row 4: Full Width Table */}
      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-[#d7dbe2] flex items-center">
          <h3 className="text-[13px] font-semibold text-[#151a21] m-0">Reviewer productivity — per user and client</h3>
        </div>
        <Table 
          columns={prodCols} 
          data={productivity} 
          renderRow={renderProdRow}
          pagination={false}
        />
      </div>

    </div>
  );
};

export default PracticeDashboardPage;