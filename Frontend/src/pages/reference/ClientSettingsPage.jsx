import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Table from '../../components/ui/Table';

const PRACTICE_MASTER = {
  'Firm-wide templates': {
    head: [
      { label: 'Template' }, { label: 'Type' }, { label: 'Used by' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['Standard GL chart', 'GL codes', '6 clients', 'active'],
      ['Standard tax codes', 'Tax codes', '6 clients', 'active'],
      ['Default policy rules', 'Policy', '6 clients', 'active'],
      ['Confidence thresholds', 'Routing', '4 clients', 'active']
    ]
  },
  'Practice users & roles': {
    head: [
      { label: 'User' }, { label: 'Role' }, { label: 'Clients assigned' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['m.chen', 'Practice Administrator', 'All', 'active'],
      ['r.patel', 'Engagement Manager', '4 clients', 'active'],
      ['j.okafor', 'Accountant', '3 clients', 'active'],
      ['s.nguyen', 'Auditor', 'All (read-only)', 'active']
    ]
  },
  'Global ERP patterns': {
    head: [
      { label: 'Pattern' }, { label: 'Systems' }, { label: 'Clients' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['NetSuite OAuth', 'NetSuite', '2 clients', 'active'],
      ['QuickBooks API key', 'QuickBooks', '2 clients', 'active'],
      ['Sage service account', 'Sage', '1 client', 'active'],
      ['Xero OAuth', 'Xero', '1 client', 'active']
    ]
  },
  'Retention policies': {
    head: [
      { label: 'Policy' }, { label: 'Scope' }, { label: 'Duration' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['Default document retention', 'All clients', '7 years', 'active'],
      ['Audit log retention', 'All clients', '10 years', 'active']
    ]
  }
};

const CLIENT_MASTER = {
  'Vendors': {
    head: [
      { label: 'Vendor code' }, { label: 'Vendor name' }, { label: 'Aliases (OCR variants)' }, { label: 'Tax ID' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['V-10021', 'Apex Industrial Supply', 'APEX IND SUPPLY · Apex Industrial', 'US-88-1029384', 'active'],
      ['V-10044', 'Northwind Paper Co.', 'NORTHWIND PAPER · NW Paper', 'US-91-2211004', 'active'],
      ['V-10078', 'Meridian Logistics', 'MERIDIAN LOG · Meridian Frt', 'US-74-5560012', 'active'],
      ['V-10102', 'Vertex Components', 'VERTEX COMP · Vertex Comp.', 'US-62-9987110', 'active'],
      ['V-10119', 'Orion Freight', 'ORION FRT', '—', 'inactive'],
      ['V-10140', 'Kestrel Office Supplies', 'KESTREL OFF SUPPLY', 'US-45-3320088', 'blocked']
    ]
  },
  'GL codes': {
    head: [
      { label: 'GL code' }, { label: 'Description' }, { label: 'Type' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['6200-100', 'Maintenance — mechanical', 'Expense', 'active'],
      ['6100-200', 'Office consumables', 'Expense', 'active'],
      ['6300-400', 'Freight & logistics', 'Expense', 'active'],
      ['6400-010', 'Professional services', 'Expense', 'active']
    ]
  },
  'Cost centres': {
    head: [
      { label: 'Cost centre' }, { label: 'Name' }, { label: 'Owner' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['CC-OPS-04', 'Foundry Operations', 'r.patel', 'active'],
      ['CC-ADM-01', 'Administration', 'm.chen', 'active'],
      ['CC-LOG-02', 'Logistics', 'j.okafor', 'active']
    ]
  },
  'Tax codes': {
    head: [
      { label: 'Tax code' }, { label: 'Rate' }, { label: 'Jurisdiction' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['TX-STD-8.25', '8.25%', 'US-IL', 'active'],
      ['TX-EXEMPT', '0%', 'US', 'active'],
      ['TX-EU-20', '20%', 'EU', 'active']
    ]
  },
  'Expense categories': {
    head: [
      { label: 'Category' }, { label: 'Maps to GL' }, { label: 'Receipt required' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['Ground transport', '6300-400', 'over $25', 'active'],
      ['Lodging', '6400-010', 'always', 'active'],
      ['Office supplies', '6100-200', 'over $75', 'active']
    ]
  },
  'Mapping & policy rules': {
    head: [
      { label: 'Rule set' }, { label: 'Level' }, { label: 'Status' }, { label: 'Actions', className: 'text-right' }
    ],
    rows: [
      ['Mapping rules', 'Inherited from practice template', 'active'],
      ['Mapping rules — cost centre overrides', 'Overridden at client level', 'active'],
      ['Policy rules', 'Inherited from practice template', 'active'],
      ['Confidence-routing thresholds', 'Overridden at client level (per document type & legal entity)', 'active']
    ]
  }
};

const getStatusChip = (status) => {
  const s = String(status).toLowerCase();
  
  // Map raw status to display variants exactly as the HTML does
  let config = { label: status, variant: 'neutral' };
  if (s === 'active') config = { label: 'Active', variant: 'success' };
  else if (s === 'inactive') config = { label: 'Inactive', variant: 'info' };
  else if (s === 'blocked') config = { label: 'Blocked', variant: 'danger' };
  else if (s === 'inherited') config = { label: 'Inherited', variant: 'practice' };
  else if (s === 'overridden') config = { label: 'Overridden here', variant: 'info' };
  else if (s === 'valid') config = { label: 'Valid', variant: 'success' };
  else if (s === 'missing tax id') config = { label: 'Missing tax ID', variant: 'warning' };
  else if (s === 'duplicate vendor code') config = { label: 'Duplicate vendor code', variant: 'danger' };

  const variants = {
    success: 'bg-[#e6f4ec] text-[#1a6e45] border-[#b3ddc6]',
    info: 'bg-[#e7f0fa] text-[#0b5cad] border-[#b6d2ee]',
    warning: 'bg-[#fdf1de] text-[#8a5300] border-[#f0d5a5]',
    danger: 'bg-[#fbeae9] text-[#a5231c] border-[#efc0bd]',
    neutral: 'bg-[#eef0f3] text-[#4e5867] border-[#d3d8e0]',
    practice: 'bg-[#efeafc] text-[#5a3fb5] border-[#cec1f0]'
  };
  
  const activeClass = variants[config.variant] || variants.neutral;

  return (
    <span className={`inline-flex items-center gap-1.5 px-[9px] py-[2px] rounded-[20px] border text-[11.5px] font-semibold whitespace-nowrap leading-[1.6] ${activeClass}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0" aria-hidden="true"></span>
      {config.label.charAt(0).toUpperCase() + config.label.slice(1)}
    </span>
  );
};

const ClientSettingsPage = () => {
  const { activeClient } = useAppContext();
  const isPractice = !activeClient;
  const currentMasterMap = isPractice ? PRACTICE_MASTER : CLIENT_MASTER;
  const sections = Object.keys(currentMasterMap);

  const [activeMaster, setActiveMaster] = useState(sections[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset active tab if switching between practice and client scope
  useEffect(() => {
    setActiveMaster(Object.keys(currentMasterMap)[0]);
    setCurrentPage(1);
  }, [isPractice]);

  const currentData = currentMasterMap[activeMaster] || currentMasterMap[sections[0]];
  
  // Theme colors based on scope
  const primaryBtnClass = isPractice 
    ? 'border-[#5a3fb5] bg-[#5a3fb5] hover:bg-[#4a2fa0]' 
    : 'border-[#0b5cad] bg-[#0b5cad] hover:bg-[#0a4f95]';
    
  const activeNavClass = isPractice
    ? 'bg-[#efeafc] text-[#4a2fa0] font-semibold'
    : 'bg-[#e7f0fa] text-[#0b4f96] font-semibold';

  return (
    <div className="flex-1 overflow-auto p-5 pb-10 flex flex-col bg-[#f4f5f7]">
      {/* Page Header */}
      <div className="flex items-start gap-4 mb-4 flex-wrap">
        <div className="min-w-[220px]">
          <h1 className="text-[20px] font-semibold leading-tight text-[#151a21]">Settings & Master Data</h1>
          <p className="text-[#5a6472] text-[12.5px] mt-[3px] max-w-[74ch]">
            {isPractice 
              ? 'Practice-level configuration and client-specific configuration are different audiences with different permission scopes.'
              : 'Scoped to the active client. Practice-level roles can switch scope in the Client Switcher to configure practice templates.'}
          </p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button className="h-[32px] px-3 rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[13px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors">
            Download import template
          </button>
          <button className={`h-[32px] px-3 rounded-[6px] border text-white text-[13px] font-medium transition-colors ${primaryBtnClass}`}>
            Import CSV / XLSX
          </button>
        </div>
      </div>

      {/* Tier Banner */}
      {isPractice ? (
        <div className="flex items-center gap-2.5 p-[10px_13px] rounded-[6px] text-[12.5px] mb-[14px] bg-[#efeafc] border border-[#cec1f0] text-[#4a2fa0]">
          <span aria-hidden="true">◆</span>
          <span>
            <strong>Practice-level settings.</strong> Firm-wide templates, practice users, global ERP patterns and retention. Visible to practice administrators and finance leads.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-[10px_13px] rounded-[6px] text-[12.5px] mb-[14px] bg-[#e7f0fa] border border-[#b6d2ee] text-[#0b4f96]">
          <span aria-hidden="true">●</span>
          <span>
            <strong>Client-level settings — {activeClient?.name || 'Active Client'}.</strong> This client's vendors, GL codes, cost centres, tax codes, employees and rule overrides. Never shared with another client unless explicitly configured as a shared practice template.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[226px_1fr] gap-4">
        {/* Sidebar Nav */}
        <div className="flex flex-col gap-[2px] bg-white border border-[#d7dbe2] rounded-[10px] p-[7px] h-max">
          <div className="text-[10px] uppercase tracking-[.08em] text-[#7b8494] font-bold px-[10px] pt-[8px] pb-[3px]">
            {isPractice ? 'Practice Settings' : 'Master Data'}
          </div>
          {sections.map(section => (
            <button
              key={section}
              onClick={() => {
                setActiveMaster(section);
                setCurrentPage(1);
              }}
              className={`text-left border-0 font-inherit text-[12.5px] px-[10px] py-[7px] rounded-[6px] cursor-pointer transition-colors ${
                activeMaster === section
                  ? activeNavClass
                  : 'bg-transparent text-[#151a21] hover:bg-[#eef0f3]'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Main Content Area - Stack */}
        <div className="flex flex-col gap-4">
          
          {/* 1. Primary Table Panel */}
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,.06),0_1px_3px_rgba(16,24,40,.1)] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2.5 px-3.5 py-[11px] border-b border-[#d7dbe2]">
              <h3 className="text-[13px] font-semibold text-[#151a21]">{activeMaster}</h3>
              <span className="ml-auto"></span>
              <button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc] transition-colors">
                Filter
              </button>
              <button className={`h-[27px] px-[9px] text-[12px] rounded-[6px] border text-white font-medium transition-colors ${primaryBtnClass}`}>
                + New record
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <Table
                columns={currentData.head}
                data={currentData.rows}
                pagination={true}
                totalItems={currentData.rows.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                renderRow={(row, idx) => {
                  const statusIdx = row.length - 1; // Assuming status is always the last data column
                  return (
                    <tr key={idx} className="hover:bg-[#f8fafc] border-b border-[#d7dbe2] text-[13px]">
                      {row.map((cell, i) => (
                        <td key={i} className={`py-[9px] px-3.5 align-middle ${i === statusIdx ? 'whitespace-nowrap' : ''}`}>
                          {i === statusIdx ? getStatusChip(cell) : cell}
                        </td>
                      ))}
                      <td className="py-[9px] px-3.5 text-right align-middle">
                        <div className="flex gap-1.5 justify-end">
                          <button 
                            onClick={() => alert('Record opened for editing')} 
                            className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc] transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => alert('Status change requires confirmation')} 
                            className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc] transition-colors"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            </div>
          </div>

          {/* 2. Import Flow Demonstration Panel (Visible for context on specific tabs or generally) */}
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,.06),0_1px_3px_rgba(16,24,40,.1)] overflow-hidden flex flex-col">
            <div className="flex items-center gap-2.5 px-3.5 py-[11px] border-b border-[#d7dbe2]">
              <h3 className="text-[13px] font-semibold text-[#151a21]">Import flow — reused across every master-data type and by Client Onboarding</h3>
            </div>
            <div className="p-3.5">
              
              {/* Stepper */}
              <div className="flex flex-wrap gap-0 mb-4">
                {[
                  { num: 1, label: 'Template', state: 'done' },
                  { num: 2, label: 'Upload', state: 'done' },
                  { num: 3, label: 'Column mapping', state: 'done' },
                  { num: 4, label: 'Preview', state: 'active' },
                  { num: 5, label: 'Validation', state: 'pending' },
                  { num: 6, label: 'Error report', state: 'pending' },
                  { num: 7, label: 'Mode & dates', state: 'pending' },
                  { num: 8, label: 'Summary', state: 'pending' },
                  { num: 9, label: 'Audit log', state: 'pending' }
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-2 py-[7px] pr-3.5 text-[12px] ${step.state === 'active' ? 'text-[#151a21] font-semibold' : 'text-[#5a6472]'} ${i !== 8 ? 'after:content-["›"] after:ml-2 after:text-[#b9c0cb]' : ''}`}>
                    <span className={`w-[22px] h-[22px] rounded-full grid place-items-center text-[11px] font-bold border ${
                      step.state === 'done' ? 'bg-[#e6f4ec] text-[#1a6e45] border-[#b3ddc6]' : 
                      step.state === 'active' ? 'bg-[#0b5cad] text-white border-[#0b5cad]' : 
                      'bg-[#eef0f3] text-[#5a6472] border-[#d7dbe2]'
                    }`}>
                      {step.state === 'done' ? '✓' : step.num}
                    </span>
                    {step.label}
                  </div>
                ))}
              </div>

              {/* Import Filters */}
              <div className="flex items-center gap-2.5 flex-wrap mb-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Import mode</label>
                  <select className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px]">
                    <option>Create only</option>
                    <option>Update only</option>
                    <option selected>Upsert</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Effective date</label>
                  <input type="date" defaultValue="2026-03-01" className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-[.05em] text-[#5a6472]">Expiry date</label>
                  <input type="date" className="h-[31px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white min-w-[135px]" />
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto border border-[#d7dbe2] rounded-[6px]">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[#fafbfc] border-b border-[#d7dbe2]">
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Row</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Name</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Alias</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Tax ID</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#d7dbe2]">
                      <td className="py-2.5 px-3">2</td>
                      <td className="py-2.5 px-3">Apex Industrial Supply</td>
                      <td className="py-2.5 px-3">APEX IND SUPPLY</td>
                      <td className="py-2.5 px-3">US-88-1029384</td>
                      <td className="py-2.5 px-3">{getStatusChip('Valid')}</td>
                    </tr>
                    <tr className="border-b border-[#d7dbe2]">
                      <td className="py-2.5 px-3">3</td>
                      <td className="py-2.5 px-3">Northwind Paper Co.</td>
                      <td className="py-2.5 px-3">NORTHWIND PAPER</td>
                      <td className="py-2.5 px-3">US-91-2211004</td>
                      <td className="py-2.5 px-3">{getStatusChip('Valid')}</td>
                    </tr>
                    <tr className="border-b border-[#d7dbe2]">
                      <td className="py-2.5 px-3">4</td>
                      <td className="py-2.5 px-3">Meridian Logistics</td>
                      <td className="py-2.5 px-3">MERIDIAN LOG</td>
                      <td className="py-2.5 px-3">—</td>
                      <td className="py-2.5 px-3">{getStatusChip('Missing tax ID')}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3">5</td>
                      <td className="py-2.5 px-3">Apex Industrial Supply</td>
                      <td className="py-2.5 px-3">APEX INDUSTRIAL</td>
                      <td className="py-2.5 px-3">US-88-1029384</td>
                      <td className="py-2.5 px-3">{getStatusChip('Duplicate vendor code')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3. Rules Configuration Inheritance (Only show for relevant scopes) */}
          {!isPractice && (
            <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,.06),0_1px_3px_rgba(16,24,40,.1)] overflow-hidden flex flex-col">
              <div className="flex items-center gap-2.5 px-3.5 py-[11px] border-b border-[#d7dbe2]">
                <h3 className="text-[13px] font-semibold text-[#151a21]">Rules configuration — inheritance is shown explicitly</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[#fafbfc] border-b border-[#d7dbe2]">
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Rule set</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Level</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap">Status</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#d7dbe2] hover:bg-[#f8fafc]">
                      <td className="py-[9px] px-3 align-middle">Mapping rules</td>
                      <td className="py-[9px] px-3 align-middle">Practice template</td>
                      <td className="py-[9px] px-3 align-middle">{getStatusChip('inherited')}</td>
                      <td className="py-[9px] px-3 align-middle text-right"><button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc]">Open builder</button></td>
                    </tr>
                    <tr className="border-b border-[#d7dbe2] hover:bg-[#f8fafc]">
                      <td className="py-[9px] px-3 align-middle">Mapping rules — cost centre overrides</td>
                      <td className="py-[9px] px-3 align-middle">Client override</td>
                      <td className="py-[9px] px-3 align-middle">{getStatusChip('overridden')}</td>
                      <td className="py-[9px] px-3 align-middle text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc]">Open builder</button>
                          <button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc]">Revert to template</button>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-[#d7dbe2] hover:bg-[#f8fafc]">
                      <td className="py-[9px] px-3 align-middle">Policy rules</td>
                      <td className="py-[9px] px-3 align-middle">Practice template</td>
                      <td className="py-[9px] px-3 align-middle">{getStatusChip('inherited')}</td>
                      <td className="py-[9px] px-3 align-middle text-right"><button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc]">Open builder</button></td>
                    </tr>
                    <tr className="hover:bg-[#f8fafc]">
                      <td className="py-[9px] px-3 align-middle">Confidence-routing thresholds</td>
                      <td className="py-[9px] px-3 align-middle">Client override (per document type & legal entity)</td>
                      <td className="py-[9px] px-3 align-middle">{getStatusChip('overridden')}</td>
                      <td className="py-[9px] px-3 align-middle text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc]">Open builder</button>
                          <button className="h-[27px] px-[9px] text-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] font-medium hover:bg-[#fafbfc]">Revert to template</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ClientSettingsPage;