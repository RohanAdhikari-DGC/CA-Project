import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Table from '../../components/ui/Table'; // Adjust path based on your folder structure

const Invoices = () => {
  const { activeClient } = useAppContext();

  // Status and Style Helpers
  const getStatusInfo = (status) => {
    switch (status) {
      case 'auto_erp':
        return { label: 'Auto-approved, sent to ERP', class: 'bg-[#e6f4ec] text-[#1a6e45] border-[#b3ddc6]' };
      case 'reviewed_erp':
        return { label: 'Reviewed, sent to ERP', class: 'bg-[#e6f4ec] text-[#1a6e45] border-[#b3ddc6]' };
      case 'erp_pending':
        return { label: 'ERP upload pending', class: 'bg-[#e7f0fa] text-[#0b5cad] border-[#b6d2ee]' };
      case 'pending_review':
        return { label: 'Pending review', class: 'bg-[#fdf1de] text-[#8a5300] border-[#f0d5a5]', action: 'Go to Review' };
      case 'correction':
        return { label: 'Correction required', class: 'bg-[#fdf1de] text-[#8a5300] border-[#f0d5a5]', action: 'Go to Correction' };
      case 'erp_failed':
        return { label: 'ERP upload failed', class: 'bg-[#fbeae9] text-[#a5231c] border-[#efc0bd]', action: 'Retry ERP Upload' };
      case 'flagged':
        return { label: 'Flagged', class: 'bg-[#fbeae9] text-[#a5231c] border-[#efc0bd]', action: 'Resolve Flag' };
      default:
        return { label: status, class: 'bg-gray-100 text-gray-700 border-gray-300' };
    }
  };

  // Dynamic invoice list state with 25 dummy data entries
  const [invoices, setInvoices] = useState([
    {
      id: `${activeClient?.code || 'DOC'}-2026-04871`,
      fileName: 'inv_apex_8842.pdf',
      received: '2026-02-18 09:32',
      user: 'm.chen',
      source: 'Email',
      status: 'pending_review',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04870`,
      fileName: 'inv_northwind_1022.pdf',
      received: '2026-02-18 09:15',
      user: 'system',
      source: 'API',
      status: 'auto_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04869`,
      fileName: 'receipt_uber_901.png',
      received: '2026-02-17 18:45',
      user: 'j.okafor',
      source: 'Mobile',
      status: 'flagged',
      previewUrl: 'https://via.placeholder.com/150', 
      fileType: 'image'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04868`,
      fileName: 'inv_vertex_990.pdf',
      received: '2026-02-17 16:20',
      user: 'r.patel',
      source: 'Manual upload',
      status: 'correction',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04867`,
      fileName: 'inv_meridian_441.pdf',
      received: '2026-02-17 14:10',
      user: 'system',
      source: 'Cloud storage',
      status: 'erp_failed',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04866`,
      fileName: 'inv_orion_772.pdf',
      received: '2026-02-17 11:05',
      user: 'system',
      source: 'Email',
      status: 'reviewed_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04865`,
      fileName: 'inv_kestrel_901.pdf',
      received: '2026-02-16 10:30',
      user: 'm.chen',
      source: 'Manual upload',
      status: 'erp_pending',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04864`,
      fileName: 'receipt_officedepot_22.jpg',
      received: '2026-02-16 09:12',
      user: 'j.okafor',
      source: 'Expense tool',
      status: 'auto_erp',
      previewUrl: 'https://via.placeholder.com/150',
      fileType: 'image'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04863`,
      fileName: 'inv_apex_8843.pdf',
      received: '2026-02-15 17:45',
      user: 'm.chen',
      source: 'Email',
      status: 'pending_review',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04862`,
      fileName: 'inv_deltacargo_102.pdf',
      received: '2026-02-15 15:20',
      user: 'r.patel',
      source: 'API',
      status: 'flagged',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04861`,
      fileName: 'receipt_uber_902.png',
      received: '2026-02-15 14:05',
      user: 'system',
      source: 'Card feed',
      status: 'auto_erp',
      previewUrl: 'https://via.placeholder.com/150',
      fileType: 'image'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04860`,
      fileName: 'inv_northwind_1023.pdf',
      received: '2026-02-15 11:30',
      user: 'j.okafor',
      source: 'Manual upload',
      status: 'correction',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04859`,
      fileName: 'inv_grandharbour_01.pdf',
      received: '2026-02-14 16:50',
      user: 'r.patel',
      source: 'Email',
      status: 'pending_review',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04858`,
      fileName: 'inv_meridian_442.pdf',
      received: '2026-02-14 12:15',
      user: 'system',
      source: 'Cloud storage',
      status: 'auto_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04857`,
      fileName: 'receipt_delta_05.jpg',
      received: '2026-02-14 09:40',
      user: 'm.chen',
      source: 'Mobile',
      status: 'erp_failed',
      previewUrl: 'https://via.placeholder.com/150',
      fileType: 'image'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04856`,
      fileName: 'inv_vertex_991.pdf',
      received: '2026-02-13 15:55',
      user: 'system',
      source: 'API',
      status: 'reviewed_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04855`,
      fileName: 'inv_orion_773.pdf',
      received: '2026-02-13 13:20',
      user: 'j.okafor',
      source: 'Email',
      status: 'pending_review',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04854`,
      fileName: 'inv_apex_8844.pdf',
      received: '2026-02-13 10:10',
      user: 'system',
      source: 'Expense tool',
      status: 'auto_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04853`,
      fileName: 'receipt_officedepot_23.pdf',
      received: '2026-02-12 16:45',
      user: 'm.chen',
      source: 'Manual upload',
      status: 'correction',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04852`,
      fileName: 'inv_kestrel_902.pdf',
      received: '2026-02-12 14:30',
      user: 'r.patel',
      source: 'Cloud storage',
      status: 'erp_pending',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04851`,
      fileName: 'inv_northwind_1024.pdf',
      received: '2026-02-12 11:20',
      user: 'system',
      source: 'API',
      status: 'flagged',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04850`,
      fileName: 'receipt_uber_903.png',
      received: '2026-02-11 15:10',
      user: 'j.okafor',
      source: 'Card feed',
      status: 'pending_review',
      previewUrl: 'https://via.placeholder.com/150',
      fileType: 'image'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04849`,
      fileName: 'inv_meridian_443.pdf',
      received: '2026-02-11 13:45',
      user: 'm.chen',
      source: 'Email',
      status: 'reviewed_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04848`,
      fileName: 'inv_vertex_992.pdf',
      received: '2026-02-11 09:30',
      user: 'system',
      source: 'API',
      status: 'auto_erp',
      previewUrl: null,
      fileType: 'pdf'
    },
    {
      id: `${activeClient?.code || 'DOC'}-2026-04847`,
      fileName: 'receipt_grandharbour_02.jpg',
      received: '2026-02-10 16:15',
      user: 'r.patel',
      source: 'Mobile',
      status: 'correction',
      previewUrl: 'https://via.placeholder.com/150',
      fileType: 'image'
    }
  ]);

  // Modal & Upload states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const fileInputRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Pagination derived variables
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentInvoices = invoices.slice(indexOfFirstRow, indexOfLastRow);

  const handlePageSizeChange = (size) => {
    setRowsPerPage(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    // If it's an image, create an object URL for preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      // If PDF or document
      setPreviewUrl(null);
    }
  };

  // Process and push the invoice into the table
  const handleProcessInvoice = () => {
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith('image/');
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    const newInvoice = {
      id: `${activeClient?.code || 'DOC'}-2026-${randomNum}`,
      fileName: selectedFile.name,
      received: timestamp,
      user: 'Current User',
      source: 'Manual upload',
      status: 'pending_review',
      previewUrl: isImage ? previewUrl : null,
      fileType: isImage ? 'image' : 'pdf'
    };

    // Add to the front of the list
    setInvoices((prev) => [newInvoice, ...prev]);
    
    // Ensure the table resets to page 1 so the latest record is immediately visible
    setCurrentPage(1);

    // Reset and close modal
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Table Configuration for <Table /> component
  const columns = [
    { label: <span className="sr-only">View file</span>, className: 'w-12 text-center' },
    { label: 'Document ID / file name' },
    { label: 'Received' },
    { label: 'Uploaded by' },
    { label: 'Source' },
    { label: 'Status' },
    { label: 'DOCtype' },
    { label: 'Action', className: 'text-right' }
  ];

  const renderRow = (inv) => {
    const statusData = getStatusInfo(inv.status);
    return (
      <tr key={inv.id} className="border-b border-[#d7dbe2] hover:bg-[#f8fafc] group">
        <td className="px-3 py-2.5 align-middle text-center">
          <button
            onClick={() => inv.previewUrl ? setViewingImage(inv.previewUrl) : null}
            className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#5a6472] inline-flex items-center justify-center cursor-pointer hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] transition-colors"
            aria-label={`View file ${inv.fileName}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </td>
        <td className="px-3 py-2.5 align-middle">
          <div className="flex flex-col gap-[1px]">
            <strong className="font-mono text-[12.5px] text-[#151a21] font-semibold">{inv.id}</strong>
            <span className="text-[11.5px] text-[#5a6472]">{inv.fileName}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 align-middle font-mono text-[12px]">{inv.received}</td>
        <td className="px-3 py-2.5 align-middle">{inv.user}</td>
        <td className="px-3 py-2.5 align-middle">{inv.source}</td>
        <td className="px-3 py-2.5 align-middle">
          <span className={`inline-flex items-center gap-1.5 px-[7px] py-[2px] rounded-[20px] border text-[11.5px] font-semibold leading-[1.6] whitespace-nowrap ${statusData.class}`}>
            <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
            {statusData.label}
          </span>
        </td>
        <td className="px-3 py-2.5 align-middle"></td>
        <td className="px-3 py-2.5 align-middle text-right">
          {statusData.action ? (
            <button className="h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] hover:bg-[#fafbfc] transition-colors whitespace-nowrap">
              {statusData.action}
            </button>
          ) : (
            <span className="text-[12px] text-[#5a6472] italic">No action required</span>
          )}
        </td>
      </tr>
    );
  };

  if (!activeClient) {
    return <div className="p-5 text-gray-500">Switch to a client to view incoming documents.</div>;
  }

  return (
    <div className="fade-in flex flex-col h-full max-h-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-[20px] font-semibold mb-1 text-[#151a21]">Incoming Documents</h1>
          <p className="text-[#5a6472] text-[12.5px] max-w-[74ch]">
            Metadata and status feed for the active client only — no client column, because the workspace context already fixes it.
          </p>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-0 h-[32px] bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] text-[13px] font-medium hover:bg-[#0a4f95] transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Invoice
        </button>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col flex-1 min-h-0">
        
        {/* Filters Form */}
        <form className="flex flex-wrap items-end gap-2.5 p-3.5 border-b border-[#d7dbe2] shrink-0" role="search" aria-label="Filter incoming documents">
          <div className="flex flex-col gap-1">
            <label htmlFor="fFrom" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Received from</label>
            <input type="date" id="fFrom" defaultValue="2026-02-01" className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fTo" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Received to</label>
            <input type="date" id="fTo" defaultValue="2026-02-18" className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fUser" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Uploaded by</label>
            <select id="fUser" className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15 bg-white">
              <option value="">All users</option>
              <option>m.chen</option>
              <option>r.patel</option>
              <option>system</option>
              <option>j.okafor</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fSource" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Source</label>
            <select id="fSource" className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15 bg-white">
              <option value="">All sources</option>
              <option>Manual upload</option>
              <option>Email</option>
              <option>API</option>
              <option>Cloud storage</option>
              <option>Mobile</option>
              <option>Expense tool</option>
              <option>Card feed</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fStatus" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Status</label>
            <select id="fStatus" className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15 bg-white">
              <option value="">All statuses</option>
              <option value="auto_erp">Auto-approved, sent to ERP</option>
              <option value="erp_pending">ERP upload pending</option>
              <option value="erp_failed">ERP upload failed</option>
              <option value="pending_review">Pending review</option>
              <option value="reviewed_erp">Reviewed, sent to ERP</option>
              <option value="correction">Correction required</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
          <button type="reset" className="h-[27px] px-2.5 border border-transparent hover:bg-[#eef0f3] text-[#0b5cad] text-[12px] font-medium rounded-[6px] transition-colors mb-0.5">Clear</button>
        </form>

        {/* Reusable Table Area */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <Table
            columns={columns}
            data={currentInvoices}
            renderRow={renderRow}
            pagination={true}
            currentPage={currentPage}
            pageSize={rowsPerPage}
            totalItems={invoices.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>

      {/* Upload Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/55 p-4">
          <div className="bg-white rounded-[10px] shadow-[0_10px_30px_rgba(16,24,40,.16)] w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-[18px] pt-[15px] pb-2">
              <h2 className="text-[16px] font-semibold text-[#151a21]">Upload New Invoice</h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-[18px] py-3 text-[13px] text-[#5a6472]">
              {!selectedFile ? (
                /* Dropzone Area */
                <div
                  className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-[#b9c0cb] rounded-[6px] bg-[#fafbfc] hover:bg-[#eef0f3] hover:border-[#0b5cad] transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-[#e7f0fa] text-[#0b5cad] rounded-full flex items-center justify-center mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#151a21] mb-1">Click to select invoice</p>
                  <p className="text-xs text-[#5a6472]">Supports PNG, JPG, WEBP, or PDF</p>
                </div>
              ) : (
                /* File / Image Preview Area */
                <div className="relative w-full h-56 bg-[#f4f5f7] rounded-[6px] overflow-hidden border border-[#d7dbe2] flex flex-col items-center justify-center group">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Invoice Preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-[13px] font-medium text-[#151a21]">{selectedFile.name}</div>
                      <div className="text-xs text-[#5a6472]">{(selectedFile.size / 1024).toFixed(1)} KB (PDF)</div>
                    </div>
                  )}

                  {/* Change button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-[32px] px-[12px] bg-white text-[#151a21] border border-[#b9c0cb] rounded-[6px] text-[13px] font-medium shadow-sm hover:bg-[#fafbfc]"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*,application/pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-[18px] py-3 mt-2 border-t border-[#d7dbe2] flex justify-end gap-[9px] flex-wrap">
              <button
                onClick={closeModal}
                className="h-[32px] px-[12px] border border-[#b9c0cb] rounded-[6px] text-[#151a21] bg-white text-[13px] font-medium hover:bg-[#fafbfc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessInvoice}
                disabled={!selectedFile}
                className={`h-[32px] px-[12px] rounded-[6px] text-[13px] font-medium transition-colors shadow-sm flex items-center gap-1.5 ${
                  selectedFile
                    ? 'bg-[#0b5cad] border border-[#0b5cad] text-white hover:bg-[#0a4f95]'
                    : 'bg-[#fafbfc] border border-[#d7dbe2] text-[#5a6472] cursor-not-allowed opacity-50'
                }`}
              >
                Process Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Preview for clicked invoices */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#101828]/75 p-6 backdrop-blur-sm"
          onClick={() => setViewingImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-[10px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 bg-[#151a21] text-white rounded-[6px] w-[32px] h-[32px] flex items-center justify-center text-sm shadow hover:bg-black transition-colors"
            >
              ✕
            </button>
            <img src={viewingImage} alt="Expanded View" className="max-w-full max-h-[80vh] object-contain rounded" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;