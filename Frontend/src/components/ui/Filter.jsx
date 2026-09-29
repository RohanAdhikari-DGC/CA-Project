import React from 'react';

const Filter = ({ filters, onFilterChange, onClear, clients }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  return (
    <form className="filters" role="search" aria-label="Filter documents across clients" onSubmit={(e) => e.preventDefault()}>
      <div className="filter">
        <label htmlFor="xfClient">Client</label>
        <select id="xfClient" name="client" value={filters.client} onChange={handleChange}>
          <option value="">All clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="filter">
        <label htmlFor="xfType">Document type</label>
        <select id="xfType" name="type" value={filters.type} onChange={handleChange}>
          <option value="">All types</option>
          <option value="Invoice">Invoice</option>
          <option value="PO">PO</option>
          <option value="Receipt">Receipt</option>
          <option value="Credit Note">Credit Note</option>
          <option value="Debit Note">Debit Note</option>
        </select>
      </div>
      <div className="filter">
        <label htmlFor="xfStatus">Status</label>
        <select id="xfStatus" name="status" value={filters.status} onChange={handleChange}>
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
      <div className="filter">
        <label htmlFor="xfConf">Confidence</label>
        <select id="xfConf" name="confidence" value={filters.confidence} onChange={handleChange}>
          <option value="">Any</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div className="filter">
        <label htmlFor="xfVendor">Vendor</label>
        <input id="xfVendor" name="vendor" type="search" placeholder="Vendor name" value={filters.vendor} onChange={handleChange} />
      </div>
      <div className="filter">
        <label htmlFor="xfMin">Amount min</label>
        <input id="xfMin" name="minAmount" type="number" placeholder="0" value={filters.minAmount} onChange={handleChange} />
      </div>
      <div className="filter">
        <label htmlFor="xfReviewer">Reviewer</label>
        <select id="xfReviewer" name="reviewer" value={filters.reviewer} onChange={handleChange}>
          <option value="">Any reviewer</option>
          <option value="m.chen">m.chen</option>
          <option value="r.patel">r.patel</option>
          <option value="j.okafor">j.okafor</option>
          <option value="unassigned">unassigned</option>
        </select>
      </div>
      <div className="filter">
        <label htmlFor="xfSort">Sort by</label>
        <select id="xfSort" name="sortBy" value={filters.sortBy} onChange={handleChange}>
          <option value="Received date">Received date</option>
          <option value="Client">Client</option>
          <option value="Last updated">Last updated</option>
          <option value="Confidence">Confidence</option>
          <option value="Amount">Amount</option>
        </select>
      </div>
      <button className="btn btn--sm" type="button" onClick={onClear}>Clear</button>
    </form>
  );
};

export default Filter;