import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import KPICard from '../../components/ui/KPICard'; // Make sure the path matches your structure
import Table from '../../components/ui/Table';     // Make sure the path matches your structure

const DashboardPage = () => {
  const { activeClient, currentData, visibleClients } = useAppContext();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  if (activeClient && currentData) {
    const { statusCounts, client, flagged = [] } = currentData;
    
    // Injecting dummy data if the context data is empty
    const displayFlagged = flagged.length > 0 ? flagged : [
      { id: 'DOC-2026-04855', flag: 'Duplicate invoice number', severity: 'critical', owner: 'm.chen', age: '1h' },
      { id: 'DOC-2026-04846', flag: 'Amount exceeds PO tolerance', severity: 'blocking', owner: 'r.patel', age: '4h' },
      { id: 'DOC-2026-04837', flag: 'Vendor blocked in master data', severity: 'blocking', owner: 'j.okafor', age: '7h' },
      { id: 'DOC-2026-04828', flag: 'Tax code missing', severity: 'warning', owner: 'unassigned', age: '10h' },
      { id: 'DOC-2026-04819', flag: 'Low confidence on total', severity: 'informational', owner: 'm.chen', age: '13h' }
    ];

    const erpSuccessRate = client.docs ? (100 - ((statusCounts.erp_failed / client.docs) * 100)).toFixed(1) : 0;
    const blockingCount = displayFlagged.filter(f => f.severity === 'blocking' || f.severity === 'critical').length;

    // Pagination calculations
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentFlagged = displayFlagged.slice(indexOfFirstRow, indexOfLastRow);

    const handleRowsPerPageChange = (newSize) => {
      setRowsPerPage(newSize);
      setCurrentPage(1);
    };

    const maxStatus = Math.max(
      statusCounts.auto_erp || 0,
      statusCounts.pending_review || 0,
      statusCounts.correction || 0,
      statusCounts.flagged || 0,
      statusCounts.erp_pending || 0,
      statusCounts.erp_failed || 0,
      statusCounts.reviewed_erp || 0,
      1
    );

    const statusBars = [
      { label: 'Auto-approved → ERP', val: statusCounts.auto_erp, color: 'bg-[#5aa87c]' },
      { label: 'Pending review', val: statusCounts.pending_review, color: 'bg-[#5b8fd6]' },
      { label: 'Correction required', val: statusCounts.correction, color: 'bg-[#d9a441]' },
      { label: 'Flagged', val: statusCounts.flagged, color: 'bg-[#cd6a63]' },
      { label: 'ERP upload pending', val: statusCounts.erp_pending, color: 'bg-[#5b8fd6]' },
      { label: 'ERP upload failed', val: statusCounts.erp_failed, color: 'bg-[#cd6a63]' },
      { label: 'Reviewed, sent to ERP', val: statusCounts.reviewed_erp, color: 'bg-[#5aa87c]' }
    ];

    const agingBars = [
      { label: '< 4 hours', val: 34, color: 'bg-[#5aa87c]' },
      { label: '4 – 24 hours', val: 12, color: 'bg-[#d9a441]' },
      { label: '1 – 3 days', val: 4, color: 'bg-[#d9a441]' },
      { label: '> 3 days', val: 2, color: 'bg-[#cd6a63]' }
    ];
    const maxAging = Math.max(...agingBars.map(b => b.val), 1);

    // Columns config for the Table component
    const tableColumns = [
      { label: 'Document', className: 'w-[15%]' },
      { label: 'Flag type', className: 'w-[35%]' },
      { label: 'Severity', className: 'w-[15%]' },
      { label: 'Owner', className: 'w-[15%]' },
      { label: 'Age', className: 'w-[10%]' },
      { label: <span className="sr-only">Actions</span>, className: 'w-[10%] text-right' }
    ];

    // Row renderer for the Table component
    const renderFlaggedRow = (f) => (
      <tr key={f.id} className="border-b hover:bg-[#f8fafc] group transition-colors">
        <td className="py-2.5 px-3.5 font-mono font-semibold">{f.id}</td>
        <td className="py-2.5 px-3.5 text-gray-800">{f.flag}</td>
        <td className="py-2.5 px-3.5">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
            f.severity === 'blocking' || f.severity === 'critical' 
              ? 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]' 
              : f.severity === 'warning'
              ? 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]'
              : 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]'
          }`}>
            <span className="w-[7px] h-[7px] rounded-full bg-current"></span>
            {f.severity.charAt(0).toUpperCase() + f.severity.slice(1)}
          </span>
        </td>
        <td className="py-2.5 px-3.5">{f.owner}</td>
        <td className="py-2.5 px-3.5">{f.age}</td>
        <td className="py-2.5 px-3.5 text-right">
          <button className="h-[26px] px-2.5 text-xs border border-[#b9c0cb] rounded font-medium bg-white text-gray-700 hover:bg-[#fafbfc] transition-colors">
            Open
          </button>
        </td>
      </tr>
    );

    return (
      <div className="fade-in pb-10">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1.5">Client Dashboard</h1>
            <p className="text-gray-500 text-[12.5px] max-w-[74ch]">
              Scoped to {client.name}. All figures come from this client's reporting endpoint.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#b9c0cb] rounded-md bg-white text-[13px] font-medium hover:bg-[#fafbfc] transition-colors whitespace-nowrap">
            Last 30 days ▾
          </button>
        </div>
        
        {/* Tiles utilizing the new KPICard component */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <KPICard 
            title="Documents received"
            value={client.docs}
            footer={<><span className="font-bold text-[#1a6e45]">▲ 6.2%</span> vs. previous period</>}
          />
          <KPICard 
            title="Straight-through rate"
            value={`${client.stp}%`}
            footer={<><span className="font-bold text-[#1a6e45]">▲ 2.1 pts</span> auto-approved & posted</>}
          />
          <KPICard 
            title="Review + correction queue"
            value={(statusCounts.pending_review || 0) + (statusCounts.correction || 0)}
            footer={<>Median age <strong className="text-gray-900 font-semibold">4h 12m</strong></>}
          />
          <KPICard 
            title="Open flags"
            value={statusCounts.flagged}
            footer={<><span className="font-bold text-[#a5231c]">{blockingCount} blocking</span> need escalation</>}
          />
          <KPICard 
            title="ERP posting success"
            value={`${erpSuccessRate}%`}
            footer={<>{statusCounts.erp_failed} failures awaiting retry</>}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-4">
          <div className="bg-white border rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden flex flex-col">
            <div className="px-3.5 py-2.5 border-b flex items-center bg-white">
              <h3 className="text-[13px] font-semibold m-0">Documents by status</h3>
            </div>
            <div className="p-3.5 flex-1">
              <div className="flex flex-col gap-2.5">
                {statusBars.map((bar, idx) => (
                  <div key={idx} className="grid grid-cols-[150px_1fr_52px] items-center gap-2.5 text-[12.5px]">
                    <span className="truncate">{bar.label}</span>
                    <div className="h-3.5 bg-[#eef0f3] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${Math.round((bar.val / maxStatus) * 100)}%` }}></div>
                    </div>
                    <span className="text-right tabular-nums text-gray-500 font-semibold">{bar.val || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden flex flex-col">
            <div className="px-3.5 py-2.5 border-b flex items-center bg-white">
              <h3 className="text-[13px] font-semibold m-0">Queue aging</h3>
            </div>
            <div className="p-3.5 flex-1">
              <div className="flex flex-col gap-2.5">
                {agingBars.map((bar, idx) => (
                  <div key={idx} className="grid grid-cols-[100px_1fr_52px] items-center gap-2.5 text-[12.5px]">
                    <span className="truncate">{bar.label}</span>
                    <div className="h-3.5 bg-[#eef0f3] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${Math.round((bar.val / maxAging) * 100)}%` }}></div>
                    </div>
                    <span className="text-right tabular-nums text-gray-500 font-semibold">{bar.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Needs Attention Table utilizing the updated Table component */}
        <div className="bg-white border rounded-xl shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between bg-white">
            <h3 className="text-[13px] font-semibold m-0">Needs attention</h3>
            <button className="h-[27px] px-2.5 text-xs border border-[#b9c0cb] rounded-md bg-white font-medium hover:bg-[#fafbfc] transition-colors">
              Open Flagged queue
            </button>
          </div>
          <Table 
            columns={tableColumns} 
            data={currentFlagged} 
            renderRow={renderFlaggedRow} 
            emptyMessage="No documents currently need attention in this queue."
            pagination={true}
            currentPage={currentPage}
            pageSize={rowsPerPage}
            totalItems={displayFlagged.length}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setCurrentPage}
            onPageSizeChange={handleRowsPerPageChange}
          />
        </div>
      </div>
    );
  }

  // Practice Dashboard View
  const totalDocs = visibleClients.reduce((acc, curr) => acc + curr.docs, 0);

  return (
    <div className="fade-in">
      <h1 className="text-xl font-semibold mb-2">Practice Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Spans every client you are assigned to.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border-l-4 border-l-[#5a3fb5] border rounded-xl p-4 shadow-sm">
          <div className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">Documents across practice</div>
          <div className="text-[27px] font-bold mt-1.5">{totalDocs.toLocaleString()}</div>
        </div>
        <div className="bg-white border-l-4 border-l-[#5a3fb5] border rounded-xl p-4 shadow-sm">
          <div className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">Active clients</div>
          <div className="text-[27px] font-bold mt-1.5">{visibleClients.length}</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;