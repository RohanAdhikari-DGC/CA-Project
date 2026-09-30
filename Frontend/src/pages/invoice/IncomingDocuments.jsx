import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Table from '../../components/ui/Table';
import useInvoices from '../../hooks/useInvoices';
import invoiceService from '../../services/invoice_service';

const IncomingDocuments = () => {
  const { activeClient } = useAppContext();
  const navigate = useNavigate();

  // Custom Hook connecting directly to backend API
  const {
    invoices,
    totalCount,
    loading,
    error,
    isUploading,
    uploadProgress,
    currentPage,
    pageSize,
    filters,
    fetchInvoices,
    uploadInvoice,
    updateStatus,
    setFilters,
    clearFilters,
    setCurrentPage,
    setPageSize,
  } = useInvoices();

  // Modal & Upload states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadUser, setUploadUser] = useState('m.chen');
  const [uploadSource, setUploadSource] = useState('Manual upload');
  const [uploadError, setUploadError] = useState('');
  const [forceOcr, setForceOcr] = useState(false);

  // Inspector / Preview states
  const [inspectionInvoice, setInspectionInvoice] = useState(null);
  const [ocrDetails, setOcrDetails] = useState(null);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [activeTab, setActiveTab] = useState('fields'); // 'fields', 'raw', 'preview'
  const [previewImgError, setPreviewImgError] = useState(false);

  const fileInputRef = useRef(null);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    } catch {
      return dateStr;
    }
  };

  // Status and Style Helpers matching backend values and mockup design
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
        return { label: status || 'Unknown', class: 'bg-gray-100 text-gray-700 border-gray-300' };
    }
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
    setUploadError('');

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Process and upload invoice through the complete backend pipeline + Azure Blob Storage
  const handleProcessInvoice = async () => {
    if (!selectedFile) return;

    try {
      setUploadError('');
      await uploadInvoice(selectedFile, {
        user: uploadUser,
        source: uploadSource,
        client_code: activeClient?.code || 'APEX',
        client_name: activeClient?.name || 'Apex Industrial Supply',
        my_company_name: activeClient?.name || 'Apex Industrial Supply',
        status: 'pending_review',
        force_ocr: forceOcr,
      });

      // Reset and close modal on success
      closeModal();
    } catch (err) {
      setUploadError(err.message || 'Failed to process document');
    }
  };

  const closeModal = () => {
    if (isUploading) return;
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError('');
  };

  // Handle Action button clicks — pass the specific invoiceId so Review/Correction/Flagged opens this exact document
  const handleActionClick = async (inv, action) => {
    if (action === 'Go to Review') {
      navigate(`/pending?invoiceId=${encodeURIComponent(inv.id)}`);
    } else if (action === 'Go to Correction') {
      navigate(`/correction?invoiceId=${encodeURIComponent(inv.id)}`);
    } else if (action === 'Resolve Flag') {
      navigate(`/flagged?invoiceId=${encodeURIComponent(inv.id)}`);
    } else if (action === 'Retry ERP Upload') {
      try {
        await updateStatus(inv.id, 'auto_erp');
      } catch (err) {
        alert('Failed to retry ERP upload: ' + err.message);
      }
    }
  };

  // Open Document / OCR inspection modal
  const openInspector = async (inv) => {
    setInspectionInvoice(inv);
    setOcrDetails(null);
    setPreviewImgError(false);
    setActiveTab('fields');
    setLoadingOcr(true);

    try {
      const fullDoc = await invoiceService.getOcrByInvoiceId(inv.id);
      setOcrDetails(fullDoc);
    } catch (err) {
      console.warn('Could not load detailed OCR layout:', err);
    } finally {
      setLoadingOcr(false);
    }
  };

  // Table Configuration
  const columns = [
    { label: <span className="sr-only">View file</span>, className: 'w-12 text-center' },
    { label: 'Document ID / file name' },
    { label: 'Received' },
    { label: 'Uploaded by' },
    { label: 'Source' },
    { label: 'Status' },
    { label: 'DOCTYPE' },
    { label: 'Action', className: 'text-right' },
  ];

  const renderRow = (inv) => {
    const statusData = getStatusInfo(inv.status);
    return (
      <tr key={inv.id} className="border-b border-[#d7dbe2] hover:bg-[#f8fafc] group transition-colors">
        <td className="px-3 py-2.5 align-middle text-center">
          <button
            onClick={() => openInspector(inv)}
            className="w-[26px] h-[26px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#5a6472] inline-flex items-center justify-center cursor-pointer hover:bg-[#e7f0fa] hover:border-[#b6d2ee] hover:text-[#0b5cad] transition-colors"
            title="Inspect document & OCR layout"
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
            <span className="text-[11.5px] text-[#5a6472] truncate max-w-[220px]" title={inv.fileName}>{inv.fileName}</span>
            {inv.blobPath && (
              <span className="text-[10px] text-[#0b5cad] font-mono truncate max-w-[260px]" title={`Azure Blob: ${inv.blobPath}`}>
                ☁ {inv.blobPath}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 align-middle font-mono text-[12px] text-[#151a21]">
          {formatDate(inv.received)}
        </td>
        <td className="px-3 py-2.5 align-middle text-[#151a21]">{inv.user}</td>
        <td className="px-3 py-2.5 align-middle text-[#151a21]">{inv.source}</td>
        <td className="px-3 py-2.5 align-middle">
          <span className={`inline-flex items-center gap-1.5 px-[7px] py-[2px] rounded-[20px] border text-[11.5px] font-semibold leading-[1.6] whitespace-nowrap ${statusData.class}`}>
            <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
            {statusData.label}
          </span>
        </td>
        <td className="px-3 py-2.5 align-middle">
          {inv.documentType && (
            <span className="inline-block text-[11px] font-medium text-[#475467] bg-[#f2f4f7] border border-[#eaecf0] px-2 py-0.5 rounded-[4px] max-w-[160px] truncate" title={inv.documentType}>
              {inv.documentType}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 align-middle text-right">
          {statusData.action ? (
            <button
              onClick={() => handleActionClick(inv, statusData.action)}
              className="h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] hover:bg-[#fafbfc] hover:border-[#0b5cad] hover:text-[#0b5cad] transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            >
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
            Metadata and status feed for <strong>{activeClient.name}</strong>. Uploaded images & PDFs are extracted into the database and stored in Azure Blob Storage (<code>castorage</code>) under <code>{activeClient.name}/finance/&lt;doctype&gt;/</code>.
          </p>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-0 h-[32px] bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] text-[13px] font-medium hover:bg-[#0a4f95] transition-colors shadow-sm cursor-pointer"
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
        <form
          className="flex flex-wrap items-end gap-2.5 p-3.5 border-b border-[#d7dbe2] shrink-0"
          role="search"
          aria-label="Filter incoming documents"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="fFrom" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Received from</label>
            <input
              type="date"
              id="fFrom"
              value={filters.dateFrom}
              onChange={(e) => setFilters('dateFrom', e.target.value)}
              className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fTo" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Received to</label>
            <input
              type="date"
              id="fTo"
              value={filters.dateTo}
              onChange={(e) => setFilters('dateTo', e.target.value)}
              className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fUser" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Uploaded by</label>
            <select
              id="fUser"
              value={filters.user}
              onChange={(e) => setFilters('user', e.target.value)}
              className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15 bg-white"
            >
              <option value="">All users</option>
              <option value="m.chen">m.chen</option>
              <option value="r.patel">r.patel</option>
              <option value="system">system</option>
              <option value="j.okafor">j.okafor</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fSource" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Source</label>
            <select
              id="fSource"
              value={filters.source}
              onChange={(e) => setFilters('source', e.target.value)}
              className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15 bg-white"
            >
              <option value="">All sources</option>
              <option value="Manual upload">Manual upload</option>
              <option value="Email">Email</option>
              <option value="API">API</option>
              <option value="Cloud storage">Cloud storage</option>
              <option value="Mobile">Mobile</option>
              <option value="Expense tool">Expense tool</option>
              <option value="Card feed">Card feed</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fStatus" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">Status</label>
            <select
              id="fStatus"
              value={filters.status}
              onChange={(e) => setFilters('status', e.target.value)}
              className="h-[31px] px-2.5 min-w-[135px] border border-[#b9c0cb] rounded-[6px] text-[13px] text-[#151a21] outline-none focus:border-[#0b5cad] focus:ring-2 focus:ring-[#0b5cad]/15 bg-white"
            >
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
          <button
            type="button"
            onClick={clearFilters}
            className="h-[27px] px-2.5 border border-transparent hover:bg-[#eef0f3] text-[#0b5cad] text-[12px] font-medium rounded-[6px] transition-colors mb-0.5 cursor-pointer"
          >
            Clear
          </button>
        </form>

        {/* Error notification banner if any */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchInvoices()} className="underline font-medium hover:text-red-900 ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#5a6472]">
              <div className="w-7 h-7 border-2 border-[#0b5cad] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-[13px] font-medium">Loading documents from database...</p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={invoices}
              renderRow={renderRow}
              emptyMessage={
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-[#f2f4f7] flex items-center justify-center text-gray-400 mb-3 text-xl">
                    📄
                  </div>
                  <h3 className="text-sm font-semibold text-[#151a21] mb-1">No incoming documents found</h3>
                  <p className="text-xs text-[#5a6472] max-w-sm mb-4">
                    Upload an image or PDF invoice to extract OCR data into the database and store the file in Azure Blob Storage.
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b5cad] text-white rounded-[6px] text-xs font-medium hover:bg-[#0a4f95] transition-colors shadow-xs"
                  >
                    + Upload First Invoice
                  </button>
                </div>
              }
              pagination={true}
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {/* Upload Invoice Modal with Backend OCR + Azure Blob Storage Process Flow */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/55 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-[10px] shadow-[0_10px_30px_rgba(16,24,40,.16)] w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-[18px] pt-[15px] pb-2 border-b border-[#eef0f3]">
              <div>
                <h2 className="text-[16px] font-semibold text-[#151a21]">Upload New Invoice</h2>
              </div>
              <button
                onClick={closeModal}
                disabled={isUploading}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-[18px] py-4 text-[13px] text-[#5a6472] flex flex-col gap-4">
              {!selectedFile ? (
                /* Dropzone Area */
                <div
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#b9c0cb] rounded-[8px] bg-[#fafbfc] hover:bg-[#f0f5fc] hover:border-[#0b5cad] transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-12 h-12 bg-[#e7f0fa] text-[#0b5cad] rounded-full flex items-center justify-center mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#151a21] mb-1">Click to select invoice image or PDF</p>
                  <p className="text-xs text-[#5a6472]">Supports PDF, PNG, JPG, JPEG, or WEBP</p>
                </div>
              ) : (
                /* File / Image Preview Area */
                <div className="relative w-full h-44 bg-[#f4f5f7] rounded-[8px] overflow-hidden border border-[#d7dbe2] flex flex-col items-center justify-center group">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Invoice Preview" className="max-w-full max-h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-4">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-[13px] font-medium text-[#151a21]">{selectedFile.name}</div>
                      <div className="text-xs text-[#5a6472]">{(selectedFile.size / 1024).toFixed(1)} KB (PDF)</div>
                    </div>
                  )}

                  {!isUploading && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-[32px] px-[12px] bg-white text-[#151a21] border border-[#b9c0cb] rounded-[6px] text-[13px] font-medium shadow-sm hover:bg-[#fafbfc] cursor-pointer"
                      >
                        Change File
                      </button>
                    </div>
                  )}
                </div>
              )}

            

              {/* Upload Metadata Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472] block mb-1">
                    Uploaded By
                  </label>
                  <input
                    type="text"
                    value={uploadUser}
                    onChange={(e) => setUploadUser(e.target.value)}
                    disabled={isUploading}
                    className="w-full h-[32px] px-2.5 border border-[#b9c0cb] rounded-[6px] text-xs text-[#151a21] outline-none focus:border-[#0b5cad]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472] block mb-1">
                    Source
                  </label>
                  <select
                    value={uploadSource}
                    onChange={(e) => setUploadSource(e.target.value)}
                    disabled={isUploading}
                    className="w-full h-[32px] px-2.5 border border-[#b9c0cb] rounded-[6px] text-xs text-[#151a21] outline-none focus:border-[#0b5cad] bg-white"
                  >
                    <option value="Manual upload">Manual upload</option>
                    <option value="Email">Email</option>
                    <option value="API">API</option>
                    <option value="Cloud storage">Cloud storage</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Expense tool">Expense tool</option>
                  </select>
                </div>
              </div>

              {/* Force OCR Checkbox */}
              <label className="inline-flex items-center gap-2 text-xs text-[#5a6472] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={forceOcr}
                  onChange={(e) => setForceOcr(e.target.checked)}
                  disabled={isUploading}
                  className="rounded border-[#b9c0cb] text-[#0b5cad] focus:ring-[#0b5cad]"
                />
                Force RapidOCR deep model scan (even for digital PDFs)
              </label>

              {/* Backend Processing Status Indicator */}
              {isUploading && (
                <div className="p-3 bg-[#e7f0fa] border border-[#b6d2ee] rounded-[6px] flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0b5cad] border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-[#0b4f96]">Backend Pipeline & Azure Blob Upload</p>
                    <p className="text-[11px] text-[#0b5cad]">{uploadProgress}</p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {uploadError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[6px]">
                  <strong>Error: </strong> {uploadError}
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-[18px] py-3 border-t border-[#d7dbe2] flex justify-end gap-[9px] flex-wrap">
              <button
                onClick={closeModal}
                disabled={isUploading}
                className="h-[32px] px-[12px] border border-[#b9c0cb] rounded-[6px] text-[#151a21] bg-white text-[13px] font-medium hover:bg-[#fafbfc] transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessInvoice}
                disabled={!selectedFile || isUploading}
                className={`h-[32px] px-[14px] rounded-[6px] text-[13px] font-medium transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  selectedFile && !isUploading
                    ? 'bg-[#0b5cad] border border-[#0b5cad] text-white hover:bg-[#0a4f95]'
                    : 'bg-[#fafbfc] border border-[#d7dbe2] text-[#5a6472] cursor-not-allowed opacity-50'
                }`}
              >
                {isUploading ? 'Uploading & Extracting...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Inspector & OCR Details Modal */}
      {inspectionInvoice && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#101828]/70 p-4 backdrop-blur-xs"
          onClick={() => setInspectionInvoice(null)}
        >
          <div
            className="bg-white rounded-[10px] shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#d7dbe2] bg-[#fafbfc]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#151a21]">{inspectionInvoice.id}</h3>
                  <span className="text-xs bg-[#eef0f3] text-[#5a6472] px-2 py-0.5 rounded font-mono">
                    {inspectionInvoice.fileType?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-[#5a6472] mt-0.5">{inspectionInvoice.fileName}</p>
              </div>
              <button
                onClick={() => setInspectionInvoice(null)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#d7dbe2] px-5 bg-white gap-4 text-xs font-semibold text-[#5a6472]">
              <button
                onClick={() => setActiveTab('fields')}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'fields' ? 'border-[#0b5cad] text-[#0b5cad]' : 'border-transparent hover:text-[#151a21]'}`}
              >
                Extracted Metadata
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'raw' ? 'border-[#0b5cad] text-[#0b5cad]' : 'border-transparent hover:text-[#151a21]'}`}
              >
                OCR Raw Text
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer ${activeTab === 'preview' ? 'border-[#0b5cad] text-[#0b5cad]' : 'border-transparent hover:text-[#151a21]'}`}
              >
                File Preview
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 text-xs text-[#151a21]">
              {loadingOcr && (
                <div className="py-8 text-center text-[#5a6472]">
                  <div className="w-6 h-6 border-2 border-[#0b5cad] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading OCR layout data...
                </div>
              )}

              {activeTab === 'fields' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-[#f8fafc] p-3.5 rounded-[8px] border border-[#e2e8f0]">
                    <div>
                      <span className="text-[#64748b] block text-[11px] font-medium">Document Type</span>
                      <strong className="text-xs text-[#0f172a]">{inspectionInvoice.documentType || 'Tax Invoice'}</strong>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[11px] font-medium">Confidence Score</span>
                      <strong className="text-xs text-[#0f172a]">{(inspectionInvoice.confidenceScore !== null && inspectionInvoice.confidenceScore !== undefined && inspectionInvoice.confidenceScore >= 100) ? 100 : 0}%</strong>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[11px] font-medium">Status</span>
                      <span className="inline-block mt-0.5">{getStatusInfo(inspectionInvoice.status).label}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[11px] font-medium">Received Date</span>
                      <span className="font-mono text-xs">{formatDate(inspectionInvoice.received)}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[11px] font-medium">Uploaded By</span>
                      <span>{inspectionInvoice.user}</span>
                    </div>
                    <div>
                      <span className="text-[#64748b] block text-[11px] font-medium">Source</span>
                      <span>{inspectionInvoice.source}</span>
                    </div>
                    {inspectionInvoice.blobPath && (
                      <div className="col-span-2 md:col-span-3">
                        <span className="text-[#64748b] block text-[11px] font-medium">Azure Blob Path (castorage)</span>
                        <span className="font-mono text-[11px] text-[#0b5cad]">{inspectionInvoice.blobPath}</span>
                      </div>
                    )}
                  </div>

                  {ocrDetails?.extracted_fields && (
                    <div className="border border-[#e2e8f0] rounded-[8px] p-3.5">
                      <h4 className="font-semibold text-xs text-[#0f172a] mb-2 uppercase tracking-wide">
                        OCR Extracted Fields
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(ocrDetails.extracted_fields).map(([key, val]) => {
                          if (val === null || val === undefined || key === 'line_items') return null;
                          return (
                            <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                              <span className="text-[#64748b] capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="font-medium text-right text-[#0f172a]">{String(val)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ocrDetails?.extracted_gstins?.length > 0 && (
                    <div className="p-3 bg-[#e6f4ec] border border-[#b3ddc6] rounded-[6px] text-xs text-[#1a6e45]">
                      <strong>Detected GSTIN(s): </strong> {ocrDetails.extracted_gstins.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'raw' && (
                <div className="bg-[#1e293b] text-[#e2e8f0] p-4 rounded-[6px] font-mono text-[11px] max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {ocrDetails?.raw_text || 'Raw text is not available for this record.'}
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="flex flex-col justify-center items-center p-2 bg-[#f8fafc] rounded border border-gray-200 min-h-[300px]">
                  {!previewImgError ? (
                    <img
                      src={invoiceService.getInvoicePageImageUrl(inspectionInvoice.id, 1)}
                      alt={inspectionInvoice.fileName}
                      onError={() => setPreviewImgError(true)}
                      className="max-h-[60vh] max-w-full object-contain shadow-sm"
                    />
                  ) : inspectionInvoice.previewUrl ? (
                    <img
                      src={inspectionInvoice.previewUrl}
                      alt={inspectionInvoice.fileName}
                      className="max-h-[60vh] max-w-full object-contain shadow-sm"
                    />
                  ) : (
                    <div className="text-center text-[#5a6472] py-8">
                      <p className="font-medium mb-1">No stored image binary available for this legacy record.</p>
                      <p className="text-[11px]">Upload a new image or PDF to store it in Azure Blob Storage.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#d7dbe2] bg-[#fafbfc] flex justify-between items-center">
              {inspectionInvoice.status === 'pending_review' ? (
                <button
                  onClick={() => {
                    const id = inspectionInvoice.id;
                    setInspectionInvoice(null);
                    navigate(`/pending?invoiceId=${encodeURIComponent(id)}`);
                  }}
                  className="h-[30px] px-3 bg-[#0b5cad] text-white text-xs font-medium rounded-[6px] hover:bg-[#0a4f95] cursor-pointer"
                >
                  Go to Review
                </button>
              ) : <span />}
              <button
                onClick={() => setInspectionInvoice(null)}
                className="h-[30px] px-3 bg-white border border-[#b9c0cb] text-[#151a21] text-xs font-medium rounded-[6px] hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingDocuments;
