// src/utils/helpers.ts
// UTILITY FUNCTIONS ONLY - No mock data!

// src/utils/helpers.ts

export function formatCurrency(amount: number): string {
  // Handle undefined, null, or NaN
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'GHS 0.00';
  }
  return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export const tenderCategories = [
  'Medical Supplies', 
  'Pharmaceuticals', 
  'IT & Electronics', 
  'Office Supplies',
  'Cleaning & Sanitation', 
  'Laboratory Equipment', 
  'Catering', 
  'Construction', 
  'Consultancy', 
  'Other',
];

export const defaultRequiredDocuments = [
  'Company Profile', 
  'Certificate of Incorporation', 
  'Tax Clearance Certificate',
  'Business Registration Certificate', 
  'Previous Contract References',
];

export const organizationSettings = {
  name: 'The Trust Hospital',
  contactEmail: 'info@thetrusthospital.com',
  fiscalYear: '2026',
  logo: '',
};