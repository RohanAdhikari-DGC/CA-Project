import React from 'react';

const Table = ({ 
  columns, 
  data, 
  renderRow, 
  emptyMessage = "No data available",
  pagination = false,
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  pageSizeOptions = [5, 10, 25, 50],
  onPageChange,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const indexOfFirstRow = (currentPage - 1) * pageSize;
  const indexOfLastRow = indexOfFirstRow + pageSize;

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] text-left border-collapse">
          <thead>
            <tr className="bg-[#fafbfc] border-b text-[11px] uppercase tracking-wide text-gray-500">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`py-2.5 px-3.5 font-bold whitespace-nowrap ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data && data.length > 0 ? (
              data.map((item, idx) => renderRow(item, idx))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="sticky bottom-0 flex items-center justify-between px-3.5 py-2.5 border-t border-[#d7dbe2] bg-white text-[12.5px] text-[#5a6472] shrink-0 z-20 rounded-b-[10px]">
          <span>
            Showing {totalItems === 0 ? 0 : indexOfFirstRow + 1}–{Math.min(indexOfLastRow, totalItems)} of {totalItems}
          </span>
          
          <div className="flex items-center gap-2.5 ml-auto">
            <label className="sr-only" htmlFor="tablePageSize">Rows per page</label>
            <select 
              id="tablePageSize" 
              value={pageSize}
              onChange={(e) => onPageSizeChange && onPageSizeChange(Number(e.target.value))}
              className="h-[27px] border border-[#b9c0cb] rounded-[6px] font-inherit text-[12px] px-2 outline-none focus:border-[#0b5cad]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button 
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#fafbfc] hover:border-[#9aa4b3]'}`}
            >
              ‹ Previous
            </button>
            <button 
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`h-[27px] px-[9px] text-[12px] font-medium border border-[#b9c0cb] rounded-[6px] bg-white text-[#151a21] transition-colors ${currentPage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#fafbfc] hover:border-[#9aa4b3]'}`}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;