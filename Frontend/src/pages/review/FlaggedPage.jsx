import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import invoiceService from '../../services/invoice_service';

const IssueChip = ({ severity, customLabel }) => {
  const map = { informational: 'info', warning: 'warning', blocking: 'danger', critical: 'danger', success: 'success', neutral: 'neutral' };
  const label = customLabel || severity.charAt(0).toUpperCase() + severity.slice(1);
  const colors = {
    info: 'text-[#0b5cad] bg-[#e7f0fa] border-[#b6d2ee]',
    warning: 'text-[#8a5300] bg-[#fdf1de] border-[#f0d5a5]',
    danger: 'text-[#a5231c] bg-[#fbeae9] border-[#efc0bd]',
    success: 'text-[#1a6e45] bg-[#e6f4ec] border-[#b3ddc6]',
    neutral: 'text-[#4e5867] bg-[#eef0f3] border-[#d3d8e0]',
  }[map[severity] || 'info'];

  return (
    <span className={`inline-flex items-center gap-[6px] px-[9px] py-[2px] pl-[7px] rounded-full border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] ${colors}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current"></span>
      {label}
    </span>
  );
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

const FlaggedPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedInvoiceId = searchParams.get('invoiceId') || searchParams.get('id') || '';

  const [flaggedDocs, setFlaggedDocs] = useState([]);
  const [queueCounts, setQueueCounts] = useState({ pending: 0, correction: 0, flagged: 0 });
  const [activeFlagId, setActiveFlagId] = useState(requestedInvoiceId);
  const [ocrDoc, setOcrDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolutionNote, setResolutionNote] = useState('');
  const [assignee, setAssignee] = useState('m.chen — Accountant');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [flagList, pendingCount, correctionCount, flaggedCount] = await Promise.all([
        invoiceService.getInvoices({ status: 'flagged', limit: 100 }),
        invoiceService.getInvoicesCount({ status: 'pending_review' }).catch(() => 0),
        invoiceService.getInvoicesCount({ status: 'correction' }).catch(() => 0),
        invoiceService.getInvoicesCount({ status: 'flagged' }).catch(() => 0),
      ]);

      let docs = Array.isArray(flagList) ? flagList : [];
      if (requestedInvoiceId && !docs.some((d) => d.id === requestedInvoiceId)) {
        try {
          const clicked = await invoiceService.getInvoiceById(requestedInvoiceId);
          if (clicked) docs = [clicked, ...docs];
        } catch {
          // ignore
        }
      }

      setFlaggedDocs(docs);
      setQueueCounts({
        pending: typeof pendingCount === 'number' ? pendingCount : 0,
        correction: typeof correctionCount === 'number' ? correctionCount : 0,
        flagged: typeof flaggedCount === 'number' ? flaggedCount : docs.length,
      });

      if (requestedInvoiceId && docs.some((d) => d.id === requestedInvoiceId)) {
        setActiveFlagId(requestedInvoiceId);
      } else if (docs.length > 0) {
        setActiveFlagId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0].id));
      } else {
        setActiveFlagId('');
      }
    } finally {
      setLoading(false);
    }
  }, [requestedInvoiceId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!activeFlagId) {
      setOcrDoc(null);
      return;
    }
    invoiceService
      .getOcrByInvoiceId(activeFlagId)
      .then((res) => setOcrDoc(res))
      .catch(() => setOcrDoc(null));
  }, [activeFlagId]);

  const activeFlag = flaggedDocs.find((f) => f.id === activeFlagId) || null;
  const fields = ocrDoc?.extracted_fields || {};

  const handleResolve = async () => {
    if (!activeFlag || !resolutionNote.trim()) return;
    try {
      await invoiceService.updateStatus(activeFlag.id, 'pending_review');
      setResolutionNote('');
      await loadQueue();
    } catch (err) {
      alert('Failed to resolve flag: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full p-[14px_16px] overflow-hidden bg-[#f4f5f7] text-[#151a21] font-sans">
      <div className="flex items-center mb-[11px] flex-none">
        <h1 className="text-[17px] font-semibold mr-4 m-0 leading-[1.25]">Queue</h1>
        <div className="flex border-b border-[#d7dbe2] gap-1 m-0">
          <Link to="/pending" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Pending Review ({queueCounts.pending})
          </Link>
          <Link to="/correction" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#5a6472] hover:text-[#151a21] border-b-2 border-transparent -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Correction ({queueCounts.correction})
          </Link>
          <Link to="/flagged" className="px-[13px] py-[9px] text-[13px] font-semibold text-[#0b4f96] border-b-2 border-[#0b5cad] -mb-[1px] bg-transparent cursor-pointer no-underline block">
            Flagged ({queueCounts.flagged})
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_1.35fr] gap-[12px]">
        {/* Left Pane - Flagged List */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-xs overflow-hidden">
          <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none">
            <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Flagged documents</h3>
            <span className="ml-auto"></span>
            <span className="text-[12px] text-[#5a6472]">{flaggedDocs.length} open</span>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div className="p-6 text-xs text-[#5a6472] text-center">Loading flagged documents...</div>
            ) : flaggedDocs.length === 0 ? (
              <div className="p-8 text-xs text-[#5a6472] text-center">
                No flagged documents in the database.
              </div>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead className="bg-[#fafbfc] sticky top-0 z-[2]">
                  <tr>
                    <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold">Document</th>
                    <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold">File</th>
                    <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold">Severity</th>
                    <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold">Owner</th>
                    <th className="text-[11px] uppercase tracking-[0.05em] text-[#5a6472] text-left p-[9px_12px] border-b border-[#d7dbe2] font-bold">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedDocs.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => {
                        setActiveFlagId(f.id);
                        setSearchParams({ invoiceId: f.id });
                      }}
                      className={`cursor-pointer border-b border-[#d7dbe2] hover:bg-[#f8fafc] ${
                        f.id === activeFlagId ? 'bg-[#eef4fb] shadow-[inset_0_0_0_1px_#0b5cad]' : ''
                      }`}
                    >
                      <td className="p-[9px_12px] align-middle font-mono text-xs font-semibold">{f.id}</td>
                      <td className="p-[9px_12px] align-middle truncate max-w-[160px]">{f.fileName}</td>
                      <td className="p-[9px_12px] align-middle"><IssueChip severity="warning" /></td>
                      <td className="p-[9px_12px] align-middle">{f.user}</td>
                      <td className="p-[9px_12px] align-middle">{formatRelativeAge(f.received)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Pane - Flag Detail */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] flex flex-col min-h-0 shadow-xs overflow-hidden">
          {!activeFlag ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#5a6472]">
              <div className="text-3xl mb-2">⚑</div>
              <h3 className="text-sm font-semibold text-[#151a21] mb-1">No flagged document selected</h3>
              <p className="text-xs">Select a flagged document on the left to review and resolve it.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-[8px] p-[9px_12px] border-b border-[#d7dbe2] bg-[#fafbfc] flex-none">
                <h3 className="text-[12.5px] font-semibold m-0 leading-[1.25]">Flag detail — {activeFlag.id}</h3>
                <span className="ml-auto"></span>
                <IssueChip severity="warning" customLabel="Flagged" />
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-[14px]">
                <div className="bg-white border border-[#d7dbe2] rounded-[10px] mb-[12px] p-[14px]">
                  <h4 className="text-[13px] font-semibold mb-3">Extracted Document Fields — {activeFlag.fileName}</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#5a6472] block">Vendor</span>
                      <strong>{fields.vendor_name || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[#5a6472] block">Invoice Number</span>
                      <strong>{fields.invoice_number || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[#5a6472] block">Invoice Date</span>
                      <strong>{fields.invoice_date || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[#5a6472] block">Total Amount</span>
                      <strong>{fields.total_amount ?? '—'}</strong>
                    </div>
                  </div>
                </div>

                <div className="mb-[16px]">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#7b8494] mb-[8px]">Resolution</div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <label htmlFor="flagResolution" className="text-[11px] font-bold text-[#5a6472]">
                      Resolution note (required to resolve)
                    </label>
                    <textarea
                      id="flagResolution"
                      className="min-h-[74px] border border-[#b9c0cb] rounded-[6px] p-[9px] font-sans text-[13px] resize-y w-full focus:outline-none focus:border-[#0b5cad]"
                      placeholder="Describe how this flag was resolved."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="flex items-center gap-[9px] flex-wrap mt-[9px]">
                    <div className="flex flex-col gap-[4px]">
                      <label htmlFor="flagAssignee" className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#5a6472]">
                        Assign to
                      </label>
                      <select
                        id="flagAssignee"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] font-sans text-[13px] bg-white text-[#151a21]"
                      >
                        <option>m.chen — Accountant</option>
                        <option>r.patel — AP team</option>
                        <option>j.okafor — Expense manager</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-none p-[9px_12px] border-t border-[#d7dbe2] bg-[#fafbfc] flex items-center gap-[8px] flex-wrap">
                <button
                  onClick={() => navigate(`/pending?invoiceId=${encodeURIComponent(activeFlag.id)}`)}
                  className="h-[32px] px-[12px] text-[13px] font-medium bg-white border border-[#b9c0cb] rounded-[6px] cursor-pointer"
                >
                  Open in Review
                </button>
                <span className="ml-auto"></span>
                <button
                  disabled={!resolutionNote.trim()}
                  onClick={handleResolve}
                  className="inline-flex items-center justify-center h-[32px] px-[12px] text-[13px] font-medium bg-[#0b5cad] border border-[#0b5cad] text-white rounded-[6px] hover:bg-[#0a4f95] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resolve flag
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlaggedPage;