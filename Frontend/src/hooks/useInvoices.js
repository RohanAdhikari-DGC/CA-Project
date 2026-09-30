import { useState, useEffect, useCallback } from 'react';
import invoiceService from '../services/invoice_service';

export const useInvoices = (initialFilters = {}, initialPageSize = 10) => {
  const [invoices, setInvoices] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState({
    dateFrom: initialFilters.dateFrom || '',
    dateTo: initialFilters.dateTo || '',
    user: initialFilters.user || '',
    source: initialFilters.source || '',
    status: initialFilters.status || '',
    search: initialFilters.search || '',
  });

  // Fetch invoices from backend
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * pageSize;
      const params = {
        skip,
        limit: pageSize,
      };

      if (filters.status && filters.status !== 'All statuses') {
        params.status = filters.status;
      }
      if (filters.source && filters.source !== 'All sources') {
        params.source = filters.source;
      }
      if (filters.user && filters.user !== 'All users') {
        params.user = filters.user;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.dateFrom) {
        params.date_from = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.date_to = filters.dateTo;
      }

      // Parallel request for invoices and total count
      const [data, count] = await Promise.all([
        invoiceService.getInvoices(params),
        invoiceService.getInvoicesCount(params).catch(() => null)
      ]);

      setInvoices(data || []);
      if (typeof count === 'number') {
        setTotalCount(count);
      } else {
        setTotalCount(data ? data.length : 0);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // Load invoices on mount or when dependencies change
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Upload new invoice through the OCR & layout backend pipeline
  const uploadInvoice = async (file, metadata = {}) => {
    setIsUploading(true);
    setUploadProgress('Uploading file to document processing engine...');
    setError(null);
    try {
      setUploadProgress('Extracting OCR layout, tokens, tables, and classification...');
      const createdInvoice = await invoiceService.uploadInvoice(file, metadata);
      
      setUploadProgress('Invoice document created successfully!');
      
      // Refresh list to show newly created invoice
      await fetchInvoices();
      setCurrentPage(1);

      return createdInvoice;
    } catch (err) {
      console.error('Invoice upload failed:', err);
      const msg = err?.response?.data?.detail || err.message || 'Invoice processing failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Update status (e.g. resolve flag, retry ERP, review)
  const updateStatus = async (invoiceId, newStatus) => {
    try {
      const updated = await invoiceService.updateStatus(invoiceId, newStatus);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: updated.status } : inv))
      );
      return updated;
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      throw err;
    }
  };

  // Delete invoice
  const deleteInvoice = async (invoiceId) => {
    try {
      await invoiceService.deleteInvoice(invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      throw err;
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to page 1 on filter change
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      user: '',
      source: '',
      status: '',
      search: '',
    });
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
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
    deleteInvoice,
    setFilters: handleFilterChange,
    clearFilters,
    setCurrentPage,
    setPageSize: handlePageSizeChange,
  };
};

export default useInvoices;
