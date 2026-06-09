export const DOCUMENT_CONFIG = {
  companyProfile: { name: 'Company Profile / Brochure', required: false, requiresExpiry: false },
  certificateOfIncorporation: { name: 'Certificate of Incorporation', required: true, requiresExpiry: false },
  graClearance: { name: 'GRA Clearance Certificate', required: true, requiresExpiry: true },
  ssnitClearance: { name: 'SSNIT Clearance Certificate', required: true, requiresExpiry: true },
  fdaCertificate: { name: 'FDA Certificate', required: false, requiresExpiry: true },
  ppaCertificate: { name: 'PPA Certificate', required: false, requiresExpiry: true },
  introductionLetter: { name: 'Introduction Letter', required: true, requiresExpiry: false },
  auditedFinancials: { name: 'Audited Financial Statements (past 2 years)', required: true, requiresExpiry: false },
  cvDocument: { name: 'CV with Past Experiences', required: true, requiresExpiry: false },
};

export const getRequiredDocumentsList = () => {
  return Object.values(DOCUMENT_CONFIG)
    .filter(doc => doc.required)
    .map(doc => doc.name);
};