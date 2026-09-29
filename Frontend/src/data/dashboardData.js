export const CLIENTS = [
  { id:'cl_apex', name:'Apex Industrial Supply', code:'APEX', industry:'Manufacturing', docs:312, stp:74.1, exceptions:9, erp:'NetSuite', assigned:true },
  { id:'cl_northwind', name:'Northwind Paper Co.', code:'NWPC', industry:'Wholesale', docs:188, stp:66.8, exceptions:6, erp:'QuickBooks', assigned:true },
  { id:'cl_meridian', name:'Meridian Logistics', code:'MRDN', industry:'Transport', docs:421, stp:59.2, exceptions:14, erp:'Sage', assigned:true },
];

export function seedFor(str) {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(x);
}

export function clientData(clientId) {
  const c = CLIENTS.find(x => x.id === clientId) || CLIENTS[0];
  const s = seedFor(clientId);
  
  return {
    client: c,
    statusCounts: {
      auto_erp: Math.round(c.docs * c.stp / 100),
      pending_review: 22 + (s % 20),
      correction: 12 + (s % 11),
      flagged: c.exceptions,
      erp_pending: 18 + (s % 14),
      erp_failed: 6 + (s % 8),
      reviewed_erp: 41 + (s % 25)
    }
  };
}