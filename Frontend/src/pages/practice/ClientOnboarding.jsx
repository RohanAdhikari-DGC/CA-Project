import React, { useState } from 'react';

const WIZARD_STEPS = [
  { title: 'Client organization', desc: 'Name, code, industry, legal entities' },
  { title: 'Clone templates', desc: 'Firm-wide GL / tax / vendor / policy templates' },
  { title: 'Import master data', desc: 'CSV / XLSX via the shared import flow' },
  { title: 'ERP connection', desc: 'Accounting system and credentials' },
  { title: 'Assign team', desc: 'Engagement manager and reviewers' },
  { title: 'SLAs & notifications', desc: 'Service levels, alerts, optional branding' },
  { title: 'Review & activate', desc: 'Confirm and publish to the Client Switcher' }
];

const ClientOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Dummy state for form values to make it feel interactive
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    industry: 'Manufacturing',
    entity: '',
    currency: 'USD',
    tz: 'America/Chicago',
    templates: { gl: true, tax: true, vendor: true, policy: true, routing: false, doctype: false },
    erp: 'NetSuite',
    erpEnv: 'Sandbox',
    erpTenant: '',
    erpAuth: 'OAuth 2.0',
    em: 'm.chen',
    rev: 'r.patel',
    sla: '4 business hours',
    notif: 'Email',
    brand: '#5a3fb5',
    retention: '7 years'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (key) => {
    setFormData((prev) => ({
      ...prev,
      templates: { ...prev.templates, [key]: !prev.templates[key] }
    }));
  };

  const handleNext = () => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(currentStep);
      return next;
    });
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      alert('Client successfully onboarded and activated!');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    if (currentStep < WIZARD_STEPS.length - 1) setCurrentStep((prev) => prev + 1);
  };

  // Step-specific rendering
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzName" className="text-[11px] font-bold text-[#5a6472]">Client organization name</label>
              <input id="wzName" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Brightline Manufacturing LLC" className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzCode" className="text-[11px] font-bold text-[#5a6472]">Short code</label>
              <input id="wzCode" name="code" value={formData.code} onChange={handleInputChange} placeholder="e.g. BRTL" className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzIndustry" className="text-[11px] font-bold text-[#5a6472]">Industry</label>
              <select id="wzIndustry" name="industry" value={formData.industry} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                <option>Manufacturing</option>
                <option>Wholesale</option>
                <option>Transport</option>
                <option>Retail</option>
                <option>Professional services</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzEntity" className="text-[11px] font-bold text-[#5a6472]">Primary legal entity</label>
              <input id="wzEntity" name="entity" value={formData.entity} onChange={handleInputChange} placeholder="Brightline Manufacturing LLC" className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzCurrency" className="text-[11px] font-bold text-[#5a6472]">Base currency</label>
              <select id="wzCurrency" name="currency" value={formData.currency} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                <option>USD</option>
                <option>CAD</option>
                <option>GBP</option>
                <option>EUR</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzTz" className="text-[11px] font-bold text-[#5a6472]">Time zone</label>
              <select id="wzTz" name="tz" value={formData.tz} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                <option>America/Chicago</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
              </select>
            </div>
          </div>
        );
      case 1:
        const templatesList = [
          { key: 'gl', label: 'GL code template' },
          { key: 'tax', label: 'Tax code template' },
          { key: 'vendor', label: 'Vendor template' },
          { key: 'policy', label: 'Policy rules template' },
          { key: 'routing', label: 'Confidence-routing thresholds' },
          { key: 'doctype', label: 'Document-type catalog' },
        ];
        return (
          <div>
            <p className="text-[12px] text-[#5a6472] mb-3">Clone firm-wide templates so the client starts from practice standards. Skipping means configuring from scratch.</p>
            {templatesList.map((t) => (
              <label key={t.key} className="flex items-center gap-[9px] py-[9px] border-b border-[#d7dbe2] cursor-pointer">
                <input type="checkbox" checked={formData.templates[t.key]} onChange={() => handleCheckboxChange(t.key)} className="w-4 h-4 cursor-pointer" />
                <span className="flex-1 text-[13px]">{t.label}</span>
                <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] rounded-[20px] border border-[#cec1f0] bg-[#efeafc] text-[#5a3fb5] text-[11.5px] font-semibold">
                  <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>Practice template
                </span>
              </label>
            ))}
          </div>
        );
      case 2:
        return (
          <div>
            <p className="text-[12px] text-[#5a6472] mb-3">Uses the same import flow as client-level master data: template → upload → column mapping → preview → validation → error report → mode → summary → audit log.</p>
            <div className="flex items-center gap-[9px] flex-wrap">
              <button className="h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[12px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3]">Download CSV template</button>
              <button className="h-[27px] px-[9px] rounded-[6px] border border-[#b9c0cb] bg-white text-[12px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3]">Download XLSX template</button>
              <button className="h-[27px] px-[9px] rounded-[6px] border border-[#0b5cad] bg-[#0b5cad] text-white text-[12px] font-medium hover:bg-[#0a4f95]">Upload file</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="wzErp" className="text-[11px] font-bold text-[#5a6472]">Accounting system</label>
                <select id="wzErp" name="erp" value={formData.erp} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                  <option>NetSuite</option>
                  <option>QuickBooks</option>
                  <option>Sage</option>
                  <option>Xero</option>
                  <option>Microsoft Dynamics</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="wzErpEnv" className="text-[11px] font-bold text-[#5a6472]">Environment</label>
                <select id="wzErpEnv" name="erpEnv" value={formData.erpEnv} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                  <option>Sandbox</option>
                  <option>Production</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="wzErpTenant" className="text-[11px] font-bold text-[#5a6472]">Tenant / company ID</label>
                <input id="wzErpTenant" name="erpTenant" value={formData.erpTenant} onChange={handleInputChange} placeholder="e.g. 4471009" className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="wzErpAuth" className="text-[11px] font-bold text-[#5a6472]">Authentication</label>
                <select id="wzErpAuth" name="erpAuth" value={formData.erpAuth} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                  <option>OAuth 2.0</option>
                  <option>API key</option>
                  <option>Service account</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-[9px] p-[9px_13px] rounded-[6px] text-[12.5px] font-semibold mt-3 bg-[#fdf1de] border border-[#f0d5a5] text-[#8a5300]">
              <span aria-hidden="true">⚠</span> Credentials are stored by the backend only. The frontend never persists or logs them.
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <p className="text-[12px] text-[#5a6472] mb-3">Assignees are limited to this client. Cross-client assignment is never offered.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="wzEm" className="text-[11px] font-bold text-[#5a6472]">Engagement manager</label>
                <select id="wzEm" name="em" value={formData.em} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                  <option>m.chen</option>
                  <option>r.patel</option>
                  <option>j.okafor</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <label htmlFor="wzRev" className="text-[11px] font-bold text-[#5a6472]">Primary reviewer</label>
                <select id="wzRev" name="rev" value={formData.rev} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                  <option>r.patel</option>
                  <option>j.okafor</option>
                  <option>m.chen</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzSla" className="text-[11px] font-bold text-[#5a6472]">SLA — review turnaround</label>
              <select id="wzSla" name="sla" value={formData.sla} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                <option>4 business hours</option>
                <option>1 business day</option>
                <option>2 business days</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzNotif" className="text-[11px] font-bold text-[#5a6472]">Notification channel</label>
              <select id="wzNotif" name="notif" value={formData.notif} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                <option>Email</option>
                <option>In-app only</option>
                <option>Email + webhook</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzBrand" className="text-[11px] font-bold text-[#5a6472]">Optional branding — accent colour</label>
              <input id="wzBrand" type="color" name="brand" value={formData.brand} onChange={handleInputChange} className="h-[38px] p-[3px] border border-[#b9c0cb] rounded-[6px] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none cursor-pointer bg-white" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label htmlFor="wzRetention" className="text-[11px] font-bold text-[#5a6472]">Document retention</label>
              <select id="wzRetention" name="retention" value={formData.retention} onChange={handleInputChange} className="h-[33px] border border-[#b9c0cb] rounded-[6px] px-[9px] text-[13px] bg-white text-[#151a21] w-full focus:border-[#0b5cad] focus:shadow-[0_0_0_2px_rgba(11,92,173,.15)] outline-none">
                <option>7 years</option>
                <option>5 years</option>
                <option>10 years</option>
              </select>
            </div>
          </div>
        );
      case 6:
      default:
        return (
          <div>
            <div className="flex gap-[9px] p-[9px_10px] border border-[#b6d2ee] rounded-[6px] bg-[#e7f0fa] items-start mb-3">
              <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] rounded-[20px] border border-[#b6d2ee] bg-[#e7f0fa] text-[#0b5cad] text-[11.5px] font-semibold">
                <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>Ready
              </span>
              <div className="flex-1 min-w-0 text-[#151a21]">
                <p className="text-[12.5px] font-semibold m-0 mb-[2px]">Everything required is complete</p>
                <p className="text-[12px] text-[#5a6472] m-0">On activation the new client appears in the Client Switcher for every assigned user.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th scope="col" className="text-left py-[9px] px-[12px] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold bg-[#fafbfc] border-b border-[#d7dbe2]">Step</th>
                    <th scope="col" className="text-left py-[9px] px-[12px] text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold bg-[#fafbfc] border-b border-[#d7dbe2]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {WIZARD_STEPS.map((s, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc]">
                      <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">{s.title}</td>
                      <td className="py-[9px] px-[12px] border-b border-[#d7dbe2] align-middle">
                        {completedSteps.has(i) ? (
                          <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] rounded-[20px] border border-[#b3ddc6] bg-[#e6f4ec] text-[#1a6e45] text-[11.5px] font-semibold">
                            <span className="w-[7px] h-[7px] rounded-full bg-current shrink-0"></span>Completed
                          </span>
                        ) : (
                          <span className="text-[#5a6472] text-[12px]">Not yet completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  return (
    <section className="flex-1 min-h-0 overflow-auto p-[20px_22px_40px]">
      <div className="flex items-start gap-4 mb-4 flex-wrap">
        <div className="min-w-[220px]">
          <h1 className="text-[20px] font-semibold m-0 text-[#151a21]">Client Onboarding</h1>
          <p className="text-[#5a6472] text-[12.5px] mt-[3px] max-w-[74ch] m-0">
            Stand up a new client organization. Every step is skippable and resumable — onboarding a client is not necessarily a single sitting.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-[18px]">
        {/* Wizard Nav */}
        <div className="bg-white border border-[#d7dbe2] rounded-[10px] p-[9px] h-max flex flex-col gap-1">
          {WIZARD_STEPS.map((step, index) => {
            const isDone = completedSteps.has(index);
            const isActive = currentStep === index;

            let btnClasses = "flex gap-[10px] items-start w-full text-left p-[9px_10px] rounded-[6px] cursor-pointer outline-none ";
            if (isActive) btnClasses += "bg-[#efeafc] text-[#4a2fa0]";
            else btnClasses += "bg-transparent text-[#151a21] hover:bg-[#eef0f3]";

            let numClasses = "w-[22px] h-[22px] rounded-full grid place-items-center text-[11px] font-bold shrink-0 border ";
            if (isActive) numClasses += "bg-[#5a3fb5] text-white border-[#5a3fb5]";
            else if (isDone) numClasses += "bg-[#e6f4ec] text-[#1a6e45] border-[#b3ddc6]";
            else numClasses += "bg-[#eef0f3] text-[#5a6472] border-[#d7dbe2]";

            return (
              <button 
                key={index}
                className={btnClasses}
                onClick={() => setCurrentStep(index)}
                aria-current={isActive}
              >
                <span className={numClasses}>
                  {isDone && !isActive ? '✓' : index + 1}
                </span>
                <span className="min-w-0 flex flex-col">
                  <span className={`text-[12.5px] font-semibold ${isActive ? '' : ''}`}>{step.title}</span>
                  <span className="text-[11px] text-[#7b8494] leading-snug mt-0.5">{step.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Wizard Body & Stepper Stack */}
        <div className="flex flex-col gap-3">
          {/* Main Panel */}
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm flex flex-col">
            <div className="flex items-center gap-[10px] p-[11px_14px] border-b border-[#d7dbe2]">
              <h3 className="text-[13px] font-semibold m-0 text-[#151a21]">{WIZARD_STEPS[currentStep].title}</h3>
              <div className="ml-auto"></div>
              <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] rounded-[20px] border border-[#d3d8e0] bg-[#eef0f3] text-[#4e5867] text-[11.5px] font-semibold">
                {completedSteps.has(currentStep) ? 'Completed' : 'Draft — resumable'}
              </span>
            </div>
            
            <div className="p-[14px]">
              {renderStepContent()}
            </div>

            <div className="flex gap-[9px] justify-end border-t border-[#d7dbe2] p-[11px_14px] bg-[#fafbfc] rounded-b-[10px]">
              <button 
                onClick={handleSkip}
                className="inline-flex items-center gap-[6px] justify-center h-[32px] px-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[13px] font-medium hover:bg-[#fafbfc] hover:border-[#9aa4b3] transition-colors"
              >
                Skip this step
              </button>
              <button 
                onClick={handleBack}
                disabled={currentStep === 0}
                className={`inline-flex items-center gap-[6px] justify-center h-[32px] px-[12px] rounded-[6px] border border-[#b9c0cb] bg-white text-[#151a21] text-[13px] font-medium transition-colors ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#fafbfc] hover:border-[#9aa4b3]'}`}
              >
                ‹ Back
              </button>
              <button 
                onClick={handleNext}
                className="inline-flex items-center gap-[6px] justify-center h-[32px] px-[12px] rounded-[6px] border border-[#5a3fb5] bg-[#5a3fb5] text-white text-[13px] font-medium hover:bg-[#4a2fa0] hover:border-[#4a2fa0] transition-colors"
              >
                {currentStep === WIZARD_STEPS.length - 1 ? 'Activate client' : 'Save & continue ›'}
              </button>
            </div>
          </div>

          {/* Progress Stepper Panel */}
          <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-[10px] p-[11px_14px] border-b border-[#d7dbe2]">
              <h3 className="text-[13px] font-semibold m-0 text-[#151a21]">Progress</h3>
            </div>
            <div className="p-[14px]">
              <div className="flex flex-wrap mb-4">
                {WIZARD_STEPS.map((step, idx) => {
                  const isDone = completedSteps.has(idx);
                  const isActive = currentStep === idx;
                  
                  let stepClasses = "flex items-center gap-[8px] p-[7px_14px_7px_0] text-[12px] ";
                  if (isActive) stepClasses += "text-[#151a21] font-semibold ";
                  else stepClasses += "text-[#5a6472] ";

                  // Separator chevron logic (don't show after last item)
                  if (idx < WIZARD_STEPS.length - 1) {
                    stepClasses += "after:content-['›'] after:ml-[8px] after:text-[#b9c0cb] after:font-normal ";
                  }

                  let numClasses = "w-[22px] h-[22px] rounded-full grid place-items-center text-[11px] font-bold border shrink-0 ";
                  if (isActive) numClasses += "bg-[#0b5cad] text-white border-[#0b5cad]";
                  else if (isDone) numClasses += "bg-[#e6f4ec] text-[#1a6e45] border-[#b3ddc6]";
                  else numClasses += "bg-[#eef0f3] text-[#5a6472] border-[#d7dbe2]";

                  return (
                    <div key={idx} className={stepClasses}>
                      <span className={numClasses}>{isDone && !isActive ? '✓' : idx + 1}</span>
                      {step.title}
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] text-[#5a6472] m-0">
                Step {currentStep + 1} of {WIZARD_STEPS.length} · {completedSteps.size} of {WIZARD_STEPS.length} steps completed · Saved as draft
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientOnboarding;