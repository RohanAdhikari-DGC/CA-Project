import api, { API_BASE_URL } from './api';

/**
 * Invoice Service for CA-Project
 * Connects to the FastAPI backend endpoints (port 6440) for invoice management,
 * Azure Blob Storage (castorage/<client_name>/finance/<doctype>), and OCR document processing
 */

export const invoiceService = {
  /**
   * Fetch all invoices with optional filters and pagination
   * @param {Object} params - { skip, limit, status, source, user, search, date_from, date_to, client_code, client_name }
   */
  async getInvoices(params = {}) {
    const response = await api.get('/invoices/', { params });
    return response.data;
  },

  /**
   * Get total count of invoices matching filters
   * @param {Object} params - { status, source, user, search, date_from, date_to, client_code, client_name }
   */
  async getInvoicesCount(params = {}) {
    const response = await api.get('/invoices/count', { params });
    return response.data.total;
  },

  /**
   * Get single invoice details by ID
   * @param {string} id - Invoice ID
   */
  async getInvoiceById(id) {
    const response = await api.get(`/invoices/${encodeURIComponent(id)}`);
    return response.data;
  },

  /**
   * Get direct streaming URL for an uploaded invoice file (image or PDF)
   */
  getInvoiceFileUrl(id) {
    return `${API_BASE_URL}/invoices/${encodeURIComponent(id)}/file`;
  },

  /**
   * Get rendered PNG page image URL for an uploaded invoice (renders PDF pages or returns image)
   */
  getInvoicePageImageUrl(id, page = 1) {
    return `${API_BASE_URL}/invoices/${encodeURIComponent(id)}/page-image?page=${page}`;
  },

  /**
   * Check Azure Blob Storage (castorage) connection status
   */
  async getBlobStorageStatus() {
    const response = await api.get('/invoices/blob/status');
    return response.data;
  },

  /**
   * Create an invoice manually
   * @param {Object} invoiceData
   */
  async createInvoice(invoiceData) {
    const response = await api.post('/invoices/', invoiceData);
    return response.data;
  },

  /**
   * Upload an invoice file, run backend OCR & classification, and store in Azure Blob Storage
   * under <client_name>/finance/<doctype>/<filename>
   * @param {File} file - File object
   * @param {Object} metadata - { user, source, status, client_code, client_name, force_ocr, invoice_id }
   */
  async uploadInvoice(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata.user) formData.append('user', metadata.user);
    if (metadata.source) formData.append('source', metadata.source);
    if (metadata.status) formData.append('status_field', metadata.status);
    if (metadata.client_code) formData.append('client_code', metadata.client_code);
    if (metadata.client_name) formData.append('client_name', metadata.client_name);
    if (metadata.invoice_id) formData.append('invoice_id', metadata.invoice_id);
    if (metadata.force_ocr !== undefined) formData.append('force_ocr', metadata.force_ocr);
    if (metadata.my_company_gstin) formData.append('my_company_gstin', metadata.my_company_gstin);
    if (metadata.my_company_name) formData.append('my_company_name', metadata.my_company_name);

    const response = await api.post('/invoices/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Update invoice status (e.g., "auto_erp", "reviewed_erp", "pending_review", "correction", "flagged")
   * @param {string} id - Invoice ID
   * @param {string} status - New status
   */
  async updateStatus(id, status) {
    const response = await api.patch(`/invoices/${encodeURIComponent(id)}/status`, null, {
      params: { status }
    });
    return response.data;
  },

  /**
   * Delete an invoice by ID
   * @param {string} id - Invoice ID
   */
  async deleteInvoice(id) {
    const response = await api.delete(`/invoices/${encodeURIComponent(id)}`);
    return response.data;
  },

  /**
   * Get OCR & Layout extraction document by extraction ID
   * @param {string} extractionId
   */
  async getOcrExtraction(extractionId) {
    const response = await api.get(`/ocr/${encodeURIComponent(extractionId)}`);
    return response.data;
  },

  /**
   * Get OCR & Layout extraction document directly by invoice ID
   * @param {string} invoiceId
   */
  async getOcrByInvoiceId(invoiceId) {
    const response = await api.get(`/ocr/by-invoice/${encodeURIComponent(invoiceId)}`);
    return response.data;
  },

  /**
   * Update extracted OCR fields for an invoice ID
   * @param {string} invoiceId
   * @param {Object} fieldsUpdate
   */
  async updateOcrByInvoiceId(invoiceId, fieldsUpdate) {
    const response = await api.put(`/ocr/by-invoice/${encodeURIComponent(invoiceId)}`, fieldsUpdate);
    return response.data;
  },

  /**
   * Get OCR extraction documents list
   */
  async listOcrDocuments(params = {}) {
    const response = await api.get('/ocr/', { params });
    return response.data;
  }
};

export default invoiceService;
