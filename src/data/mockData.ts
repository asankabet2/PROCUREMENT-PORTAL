// export interface TenderItem {
//   itemNo: number;
//   description: string;
//   unit: string;
//   quantity: number;
//   estimatedUnitPrice: number;
// }

// export interface Tender {
//   id: string;
//   title: string;
//   category: string;
//   description: string;
//   status: 'Open' | 'Closed' | 'Draft' | 'Awarded';
//   publishedDate: string;
//   openingDate: string;
//   closingDate: string;
//   estimatedBudget: number;
//   requiredDocuments: string[];
//   items: TenderItem[];
// }

// export interface Supplier {
//   id: string;
//   companyName: string;
//   registrationNumber: string;
//   tin: string;
//   dateOfIncorporation: string;
//   countryOfIncorporation: string;
//   companyType: string;
//   contactPerson: string;
//   designation: string;
//   email: string;
//   phone: string;
//   address: string;
//   city: string;
//   region: string;
//   country: string;
//   categories: string[];
//   documents: { name: string; status: 'Verified' | 'Pending'; uploadDate: string }[];
//   status: 'Approved' | 'Pending' | 'Rejected' | 'Blacklisted';
//   rejectionReason?: string;
//   dateApplied: string;
//   password: string;
// }

// export interface Bid {
//   id: string;
//   tenderId: string;
//   supplierId: string;
//   submittedDate: string;
//   items: { itemNo: number; description: string; unit: string; quantity: number; unitPrice: number; total: number }[];
//   grandTotal: number;
//   status: 'Submitted' | 'Under Review' | 'Shortlisted' | 'Awarded' | 'Rejected' | 'Unsuccessful';
//   documents: { name: string; uploaded: boolean }[];
//   complianceScore?: number;
//   evaluationScore?: number;
// }

// export interface AdminUser {
//   id: string;
//   name: string;
//   email: string;
//   role: 'Super Admin' | 'Procurement Officer' | 'Evaluator' | 'Viewer';
//   lastLogin: string;
//   status: 'Active' | 'Inactive';
//   password: string;
// }

// export interface Notification {
//   id: string;
//   userId: string;
//   userType: 'admin' | 'supplier';
//   message: string;
//   type: 'info' | 'success' | 'warning' | 'error';
//   read: boolean;
//   timestamp: string;
//   link?: string;
// }

// export interface AuditEntry {
//   id: string;
//   user: string;
//   action: string;
//   entity: string;
//   timestamp: string;
// }

// export interface ExpressedInterest {
//   tenderId: string;
//   supplierId: string;
//   date: string;
// }

// // --- SEED DATA ---

// export const tenders: Tender[] = [
//   {
//     id: 'T-001',
//     title: 'Supply of Surgical Equipment',
//     category: 'Medical Supplies',
//     description: 'Procurement of surgical instruments including scalpels, forceps, retractors, sutures, and surgical trays for the General Surgery Department. All items must meet ISO 13485 standards and come with manufacturer warranties of at least 2 years.',
//     status: 'Open',
//     publishedDate: '2026-03-15',
//     openingDate: '2026-03-20',
//     closingDate: '2026-04-09',
//     estimatedBudget: 120000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance Certificate', 'ISO Certification', 'Product Catalogs', 'Warranty Terms'],
//     items: [
//       { itemNo: 1, description: 'Surgical Scalpel Set (10 pcs)', unit: 'Set', quantity: 50, estimatedUnitPrice: 450 },
//       { itemNo: 2, description: 'Surgical Forceps (Assorted)', unit: 'Set', quantity: 30, estimatedUnitPrice: 680 },
//       { itemNo: 3, description: 'Retractor Set', unit: 'Set', quantity: 20, estimatedUnitPrice: 1200 },
//       { itemNo: 4, description: 'Suture Kit (Absorbable)', unit: 'Box', quantity: 200, estimatedUnitPrice: 85 },
//       { itemNo: 5, description: 'Surgical Tray (Stainless Steel)', unit: 'Piece', quantity: 40, estimatedUnitPrice: 320 },
//     ],
//   },
//   {
//     id: 'T-002',
//     title: 'ICT Infrastructure Upgrade',
//     category: 'IT & Electronics',
//     description: 'Complete upgrade of network infrastructure including switches, routers, fiber optic cabling, server hardware, and UPS systems for the hospital main building and annex.',
//     status: 'Open',
//     publishedDate: '2026-03-10',
//     openingDate: '2026-03-15',
//     closingDate: '2026-04-02',
//     estimatedBudget: 250000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance Certificate', 'Manufacturer Authorization Letters', 'Previous Project References'],
//     items: [
//       { itemNo: 1, description: 'Managed Network Switch 48-Port', unit: 'Piece', quantity: 10, estimatedUnitPrice: 4500 },
//       { itemNo: 2, description: 'Enterprise Router', unit: 'Piece', quantity: 3, estimatedUnitPrice: 12000 },
//       { itemNo: 3, description: 'Fiber Optic Cable (per meter)', unit: 'Meter', quantity: 5000, estimatedUnitPrice: 15 },
//       { itemNo: 4, description: 'Server Rack (42U)', unit: 'Piece', quantity: 2, estimatedUnitPrice: 8500 },
//       { itemNo: 5, description: 'UPS System 10KVA', unit: 'Piece', quantity: 4, estimatedUnitPrice: 15000 },
//     ],
//   },
//   {
//     id: 'T-003',
//     title: 'Pharmaceutical Supplies Q2',
//     category: 'Pharmaceuticals',
//     description: 'Quarterly supply of essential medicines and pharmaceutical products for all hospital departments. All products must have FDA approval and minimum 18-month shelf life at delivery.',
//     status: 'Awarded',
//     publishedDate: '2026-01-10',
//     openingDate: '2026-01-15',
//     closingDate: '2026-02-15',
//     estimatedBudget: 450000,
//     requiredDocuments: ['Company Profile', 'FDA License', 'Tax Clearance', 'Drug Import Permit', 'Quality Assurance Certificates'],
//     items: [
//       { itemNo: 1, description: 'Paracetamol 500mg (1000 tabs)', unit: 'Box', quantity: 500, estimatedUnitPrice: 45 },
//       { itemNo: 2, description: 'Amoxicillin 250mg (100 caps)', unit: 'Box', quantity: 300, estimatedUnitPrice: 120 },
//       { itemNo: 3, description: 'Normal Saline 0.9% (500ml)', unit: 'Carton', quantity: 200, estimatedUnitPrice: 280 },
//       { itemNo: 4, description: 'Insulin (100 IU/ml)', unit: 'Box', quantity: 100, estimatedUnitPrice: 850 },
//     ],
//   },
//   {
//     id: 'T-004',
//     title: 'Office Furniture Supply',
//     category: 'Office Supplies',
//     description: 'Supply and installation of office furniture for the new administrative wing including executive desks, ergonomic chairs, filing cabinets, and conference tables.',
//     status: 'Closed',
//     publishedDate: '2026-01-05',
//     openingDate: '2026-01-10',
//     closingDate: '2026-02-10',
//     estimatedBudget: 85000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance', 'Product Catalogs', 'Delivery Timeline'],
//     items: [
//       { itemNo: 1, description: 'Executive Desk', unit: 'Piece', quantity: 15, estimatedUnitPrice: 2800 },
//       { itemNo: 2, description: 'Ergonomic Office Chair', unit: 'Piece', quantity: 50, estimatedUnitPrice: 650 },
//       { itemNo: 3, description: 'Filing Cabinet (4-drawer)', unit: 'Piece', quantity: 20, estimatedUnitPrice: 480 },
//     ],
//   },
//   {
//     id: 'T-005',
//     title: 'Ambulance Maintenance Services',
//     category: 'Consultancy',
//     description: 'Annual maintenance contract for the hospital fleet of 8 ambulances including regular servicing, emergency repairs, and spare parts supply.',
//     status: 'Draft',
//     publishedDate: '',
//     openingDate: '',
//     closingDate: '2026-05-01',
//     estimatedBudget: 95000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance', 'Mechanic Certifications', 'Previous Contracts'],
//     items: [
//       { itemNo: 1, description: 'Quarterly Service (per ambulance)', unit: 'Service', quantity: 32, estimatedUnitPrice: 1500 },
//       { itemNo: 2, description: 'Emergency Repair Package', unit: 'Package', quantity: 8, estimatedUnitPrice: 3000 },
//       { itemNo: 3, description: 'Spare Parts Supply', unit: 'Lot', quantity: 4, estimatedUnitPrice: 5000 },
//     ],
//   },
//   {
//     id: 'T-006',
//     title: 'Lab Reagents & Consumables',
//     category: 'Laboratory Equipment',
//     description: 'Supply of laboratory reagents, consumables, and diagnostic kits for the hospital pathology and microbiology departments.',
//     status: 'Open',
//     publishedDate: '2026-03-18',
//     openingDate: '2026-03-20',
//     closingDate: '2026-04-19',
//     estimatedBudget: 180000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance', 'FDA Registration', 'Material Safety Data Sheets'],
//     items: [
//       { itemNo: 1, description: 'Complete Blood Count Reagent', unit: 'Pack', quantity: 100, estimatedUnitPrice: 350 },
//       { itemNo: 2, description: 'Chemistry Analyzer Reagents Set', unit: 'Set', quantity: 50, estimatedUnitPrice: 1200 },
//       { itemNo: 3, description: 'Microscope Slides (72 pcs)', unit: 'Box', quantity: 200, estimatedUnitPrice: 25 },
//       { itemNo: 4, description: 'Pipette Tips (1000 pcs)', unit: 'Pack', quantity: 150, estimatedUnitPrice: 45 },
//     ],
//   },
//   {
//     id: 'T-007',
//     title: 'Catering Services — Staff Canteen',
//     category: 'Catering',
//     description: 'Provision of daily catering services for hospital staff canteen serving approximately 500 staff members. Includes breakfast, lunch, and dinner service.',
//     status: 'Open',
//     publishedDate: '2026-03-12',
//     openingDate: '2026-03-15',
//     closingDate: '2026-04-14',
//     estimatedBudget: 320000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance', 'Food Safety Certificate', 'Menu Proposals', 'Health Inspection Report'],
//     items: [
//       { itemNo: 1, description: 'Breakfast Service (per day)', unit: 'Day', quantity: 365, estimatedUnitPrice: 250 },
//       { itemNo: 2, description: 'Lunch Service (per day)', unit: 'Day', quantity: 365, estimatedUnitPrice: 450 },
//       { itemNo: 3, description: 'Dinner Service (per day)', unit: 'Day', quantity: 365, estimatedUnitPrice: 350 },
//     ],
//   },
//   {
//     id: 'T-008',
//     title: 'Hospital Bed Linen Supply',
//     category: 'Medical Supplies',
//     description: 'Supply of hospital bed linen including bed sheets, pillowcases, blankets, and mattress protectors meeting hospital infection control standards.',
//     status: 'Closed',
//     publishedDate: '2025-12-01',
//     openingDate: '2025-12-05',
//     closingDate: '2026-01-05',
//     estimatedBudget: 65000,
//     requiredDocuments: ['Company Profile', 'Tax Clearance', 'Product Samples', 'Quality Test Reports'],
//     items: [
//       { itemNo: 1, description: 'Hospital Bed Sheet (White)', unit: 'Piece', quantity: 500, estimatedUnitPrice: 35 },
//       { itemNo: 2, description: 'Pillowcase (White)', unit: 'Piece', quantity: 500, estimatedUnitPrice: 15 },
//       { itemNo: 3, description: 'Hospital Blanket', unit: 'Piece', quantity: 200, estimatedUnitPrice: 85 },
//       { itemNo: 4, description: 'Mattress Protector', unit: 'Piece', quantity: 200, estimatedUnitPrice: 65 },
//     ],
//   },
// ];

// export const suppliers: Supplier[] = [
//   {
//     id: 'SUP-001',
//     companyName: 'MedTech Ghana Ltd',
//     registrationNumber: 'BN-2019-045672',
//     tin: 'TIN-GH-00123456',
//     dateOfIncorporation: '2019-03-15',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Kwame Asante',
//     designation: 'Managing Director',
//     email: 'supplier1@medtech.com',
//     phone: '+233-24-123-4567',
//     address: '14 Industrial Area, Tema',
//     city: 'Tema',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['Medical Supplies', 'Laboratory Equipment'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2026-01-10' },
//       { name: 'Certificate of Incorporation', status: 'Verified', uploadDate: '2026-01-10' },
//       { name: 'Tax Clearance Certificate', status: 'Verified', uploadDate: '2026-01-10' },
//     ],
//     status: 'Approved',
//     dateApplied: '2026-01-08',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-002',
//     companyName: 'Global Pharma Co.',
//     registrationNumber: 'BN-2017-089231',
//     tin: 'TIN-GH-00234567',
//     dateOfIncorporation: '2017-07-20',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Akua Mensah',
//     designation: 'Sales Director',
//     email: 'supplier2@globalph.com',
//     phone: '+233-20-234-5678',
//     address: '25 Liberation Road, Accra',
//     city: 'Accra',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['Pharmaceuticals', 'Medical Supplies'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2026-01-15' },
//       { name: 'FDA License', status: 'Verified', uploadDate: '2026-01-15' },
//       { name: 'Tax Clearance Certificate', status: 'Verified', uploadDate: '2026-01-15' },
//     ],
//     status: 'Approved',
//     dateApplied: '2026-01-12',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-003',
//     companyName: 'TechVision Solutions',
//     registrationNumber: 'BN-2020-112345',
//     tin: 'TIN-GH-00345678',
//     dateOfIncorporation: '2020-01-10',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Yaw Boateng',
//     designation: 'CEO',
//     email: 'info@techvision.gh',
//     phone: '+233-26-345-6789',
//     address: '7 Oxford Street, Osu',
//     city: 'Accra',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['IT & Electronics', 'Consultancy'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2026-02-01' },
//       { name: 'Certificate of Incorporation', status: 'Verified', uploadDate: '2026-02-01' },
//       { name: 'Tax Clearance Certificate', status: 'Verified', uploadDate: '2026-02-01' },
//     ],
//     status: 'Approved',
//     dateApplied: '2026-01-28',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-004',
//     companyName: 'CleanPro Services Ltd',
//     registrationNumber: 'BN-2021-567890',
//     tin: 'TIN-GH-00456789',
//     dateOfIncorporation: '2021-05-22',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Ama Darko',
//     designation: 'Operations Manager',
//     email: 'contact@cleanpro.gh',
//     phone: '+233-27-456-7890',
//     address: '33 Ring Road, Kumasi',
//     city: 'Kumasi',
//     region: 'Ashanti',
//     country: 'Ghana',
//     categories: ['Cleaning & Sanitation', 'Catering'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2026-02-15' },
//       { name: 'Certificate of Incorporation', status: 'Verified', uploadDate: '2026-02-15' },
//       { name: 'Tax Clearance Certificate', status: 'Pending', uploadDate: '2026-02-15' },
//     ],
//     status: 'Approved',
//     dateApplied: '2026-02-10',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-005',
//     companyName: 'Savanna Office Supplies',
//     registrationNumber: 'BN-2022-334455',
//     tin: 'TIN-GH-00567890',
//     dateOfIncorporation: '2022-09-14',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Sole Proprietor',
//     contactPerson: 'Ibrahim Yakubu',
//     designation: 'Owner',
//     email: 'ibrahim@savannaoffice.gh',
//     phone: '+233-23-567-8901',
//     address: '12 Bolgatanga Road, Tamale',
//     city: 'Tamale',
//     region: 'Northern',
//     country: 'Ghana',
//     categories: ['Office Supplies', 'Construction'],
//     documents: [
//       { name: 'Company Profile', status: 'Pending', uploadDate: '2026-03-20' },
//       { name: 'Certificate of Incorporation', status: 'Pending', uploadDate: '2026-03-20' },
//     ],
//     status: 'Pending',
//     dateApplied: '2026-03-18',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-006',
//     companyName: 'BioLab Instruments Int.',
//     registrationNumber: 'BN-2018-776655',
//     tin: 'TIN-GH-00678901',
//     dateOfIncorporation: '2018-11-30',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Nana Agyeman',
//     designation: 'Business Development Manager',
//     email: 'nana@biolab.gh',
//     phone: '+233-50-678-9012',
//     address: '5 Research Avenue, East Legon',
//     city: 'Accra',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['Laboratory Equipment', 'Medical Supplies'],
//     documents: [
//       { name: 'Company Profile', status: 'Pending', uploadDate: '2026-03-22' },
//       { name: 'Certificate of Incorporation', status: 'Pending', uploadDate: '2026-03-22' },
//       { name: 'Tax Clearance Certificate', status: 'Pending', uploadDate: '2026-03-22' },
//     ],
//     status: 'Pending',
//     dateApplied: '2026-03-20',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-007',
//     companyName: 'FreshMeals Catering Co.',
//     registrationNumber: 'BN-2023-998877',
//     tin: 'TIN-GH-00789012',
//     dateOfIncorporation: '2023-02-01',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Partnership',
//     contactPerson: 'Efua Owusu',
//     designation: 'Partner',
//     email: 'efua@freshmeals.gh',
//     phone: '+233-55-789-0123',
//     address: '8 Cantonments Road, Accra',
//     city: 'Accra',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['Catering'],
//     documents: [
//       { name: 'Company Profile', status: 'Pending', uploadDate: '2026-03-25' },
//     ],
//     status: 'Pending',
//     dateApplied: '2026-03-24',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-008',
//     companyName: 'QuickFix Motors Ltd',
//     registrationNumber: 'BN-2016-445566',
//     tin: 'TIN-GH-00890123',
//     dateOfIncorporation: '2016-04-18',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Kofi Mensah',
//     designation: 'General Manager',
//     email: 'kofi@quickfix.gh',
//     phone: '+233-24-890-1234',
//     address: '21 Spintex Road, Accra',
//     city: 'Accra',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['Consultancy', 'Construction'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2026-01-05' },
//       { name: 'Tax Clearance Certificate', status: 'Verified', uploadDate: '2026-01-05' },
//     ],
//     status: 'Rejected',
//     rejectionReason: 'Incomplete documentation. Tax clearance certificate expired. Please resubmit with updated documents.',
//     dateApplied: '2025-12-20',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-009',
//     companyName: 'ShadowMed Enterprises',
//     registrationNumber: 'BN-2015-112233',
//     tin: 'TIN-GH-00901234',
//     dateOfIncorporation: '2015-08-25',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Peter Adjei',
//     designation: 'Director',
//     email: 'peter@shadowmed.gh',
//     phone: '+233-20-901-2345',
//     address: '45 Airport Residential, Accra',
//     city: 'Accra',
//     region: 'Greater Accra',
//     country: 'Ghana',
//     categories: ['Pharmaceuticals', 'Medical Supplies'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2025-06-01' },
//       { name: 'FDA License', status: 'Verified', uploadDate: '2025-06-01' },
//     ],
//     status: 'Blacklisted',
//     rejectionReason: 'Fraudulent documentation submitted. Supply of counterfeit medical products confirmed by FDA investigation.',
//     dateApplied: '2025-05-15',
//     password: 'Supplier@1234',
//   },
//   {
//     id: 'SUP-010',
//     companyName: 'Sunrise Logistics Ghana',
//     registrationNumber: 'BN-2024-667788',
//     tin: 'TIN-GH-01012345',
//     dateOfIncorporation: '2024-01-15',
//     countryOfIncorporation: 'Ghana',
//     companyType: 'Limited Liability',
//     contactPerson: 'Grace Tetteh',
//     designation: 'Managing Director',
//     email: 'grace@sunriselogistics.gh',
//     phone: '+233-54-012-3456',
//     address: '16 Main Street, Takoradi',
//     city: 'Takoradi',
//     region: 'Western',
//     country: 'Ghana',
//     categories: ['Office Supplies', 'Cleaning & Sanitation'],
//     documents: [
//       { name: 'Company Profile', status: 'Verified', uploadDate: '2026-03-01' },
//       { name: 'Certificate of Incorporation', status: 'Verified', uploadDate: '2026-03-01' },
//       { name: 'Tax Clearance Certificate', status: 'Verified', uploadDate: '2026-03-01' },
//     ],
//     status: 'Approved',
//     dateApplied: '2026-02-25',
//     password: 'Supplier@1234',
//   },
// ];

// export const bids: Bid[] = [
//   // T-001 bids
//   {
//     id: 'BID-2026-001',
//     tenderId: 'T-001',
//     supplierId: 'SUP-001',
//     submittedDate: '2026-03-25',
//     items: [
//       { itemNo: 1, description: 'Surgical Scalpel Set (10 pcs)', unit: 'Set', quantity: 50, unitPrice: 420, total: 21000 },
//       { itemNo: 2, description: 'Surgical Forceps (Assorted)', unit: 'Set', quantity: 30, unitPrice: 650, total: 19500 },
//       { itemNo: 3, description: 'Retractor Set', unit: 'Set', quantity: 20, unitPrice: 1150, total: 23000 },
//       { itemNo: 4, description: 'Suture Kit (Absorbable)', unit: 'Box', quantity: 200, unitPrice: 78, total: 15600 },
//       { itemNo: 5, description: 'Surgical Tray (Stainless Steel)', unit: 'Piece', quantity: 40, unitPrice: 295, total: 11800 },
//     ],
//     grandTotal: 90900,
//     status: 'Under Review',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'Tax Clearance Certificate', uploaded: true },
//       { name: 'ISO Certification', uploaded: true },
//       { name: 'Product Catalogs', uploaded: true },
//       { name: 'Warranty Terms', uploaded: true },
//     ],
//     complianceScore: 100,
//     evaluationScore: 85,
//   },
//   {
//     id: 'BID-2026-002',
//     tenderId: 'T-001',
//     supplierId: 'SUP-002',
//     submittedDate: '2026-03-26',
//     items: [
//       { itemNo: 1, description: 'Surgical Scalpel Set (10 pcs)', unit: 'Set', quantity: 50, unitPrice: 480, total: 24000 },
//       { itemNo: 2, description: 'Surgical Forceps (Assorted)', unit: 'Set', quantity: 30, unitPrice: 720, total: 21600 },
//       { itemNo: 3, description: 'Retractor Set', unit: 'Set', quantity: 20, unitPrice: 1300, total: 26000 },
//       { itemNo: 4, description: 'Suture Kit (Absorbable)', unit: 'Box', quantity: 200, unitPrice: 90, total: 18000 },
//       { itemNo: 5, description: 'Surgical Tray (Stainless Steel)', unit: 'Piece', quantity: 40, unitPrice: 340, total: 13600 },
//     ],
//     grandTotal: 103200,
//     status: 'Submitted',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'Tax Clearance Certificate', uploaded: true },
//       { name: 'ISO Certification', uploaded: false },
//       { name: 'Product Catalogs', uploaded: true },
//       { name: 'Warranty Terms', uploaded: true },
//     ],
//     complianceScore: 80,
//     evaluationScore: 72,
//   },
//   {
//     id: 'BID-2026-003',
//     tenderId: 'T-001',
//     supplierId: 'SUP-003',
//     submittedDate: '2026-03-27',
//     items: [
//       { itemNo: 1, description: 'Surgical Scalpel Set (10 pcs)', unit: 'Set', quantity: 50, unitPrice: 440, total: 22000 },
//       { itemNo: 2, description: 'Surgical Forceps (Assorted)', unit: 'Set', quantity: 30, unitPrice: 660, total: 19800 },
//       { itemNo: 3, description: 'Retractor Set', unit: 'Set', quantity: 20, unitPrice: 1180, total: 23600 },
//       { itemNo: 4, description: 'Suture Kit (Absorbable)', unit: 'Box', quantity: 200, unitPrice: 82, total: 16400 },
//       { itemNo: 5, description: 'Surgical Tray (Stainless Steel)', unit: 'Piece', quantity: 40, unitPrice: 310, total: 12400 },
//     ],
//     grandTotal: 94200,
//     status: 'Submitted',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'Tax Clearance Certificate', uploaded: true },
//       { name: 'ISO Certification', uploaded: true },
//       { name: 'Product Catalogs', uploaded: true },
//       { name: 'Warranty Terms', uploaded: false },
//     ],
//     complianceScore: 80,
//     evaluationScore: 78,
//   },
//   // T-003 bids (awarded)
//   {
//     id: 'BID-2026-004',
//     tenderId: 'T-003',
//     supplierId: 'SUP-002',
//     submittedDate: '2026-02-01',
//     items: [
//       { itemNo: 1, description: 'Paracetamol 500mg (1000 tabs)', unit: 'Box', quantity: 500, unitPrice: 38, total: 19000 },
//       { itemNo: 2, description: 'Amoxicillin 250mg (100 caps)', unit: 'Box', quantity: 300, unitPrice: 105, total: 31500 },
//       { itemNo: 3, description: 'Normal Saline 0.9% (500ml)', unit: 'Carton', quantity: 200, unitPrice: 250, total: 50000 },
//       { itemNo: 4, description: 'Insulin (100 IU/ml)', unit: 'Box', quantity: 100, unitPrice: 780, total: 78000 },
//     ],
//     grandTotal: 178500,
//     status: 'Awarded',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'FDA License', uploaded: true },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'Drug Import Permit', uploaded: true },
//       { name: 'Quality Assurance Certificates', uploaded: true },
//     ],
//     complianceScore: 100,
//     evaluationScore: 95,
//   },
//   {
//     id: 'BID-2026-005',
//     tenderId: 'T-003',
//     supplierId: 'SUP-001',
//     submittedDate: '2026-02-03',
//     items: [
//       { itemNo: 1, description: 'Paracetamol 500mg (1000 tabs)', unit: 'Box', quantity: 500, unitPrice: 42, total: 21000 },
//       { itemNo: 2, description: 'Amoxicillin 250mg (100 caps)', unit: 'Box', quantity: 300, unitPrice: 115, total: 34500 },
//       { itemNo: 3, description: 'Normal Saline 0.9% (500ml)', unit: 'Carton', quantity: 200, unitPrice: 270, total: 54000 },
//       { itemNo: 4, description: 'Insulin (100 IU/ml)', unit: 'Box', quantity: 100, unitPrice: 820, total: 82000 },
//     ],
//     grandTotal: 191500,
//     status: 'Unsuccessful',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'FDA License', uploaded: true },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'Drug Import Permit', uploaded: true },
//       { name: 'Quality Assurance Certificates', uploaded: true },
//     ],
//     complianceScore: 100,
//     evaluationScore: 88,
//   },
//   {
//     id: 'BID-2026-006',
//     tenderId: 'T-003',
//     supplierId: 'SUP-003',
//     submittedDate: '2026-02-05',
//     items: [
//       { itemNo: 1, description: 'Paracetamol 500mg (1000 tabs)', unit: 'Box', quantity: 500, unitPrice: 44, total: 22000 },
//       { itemNo: 2, description: 'Amoxicillin 250mg (100 caps)', unit: 'Box', quantity: 300, unitPrice: 118, total: 35400 },
//       { itemNo: 3, description: 'Normal Saline 0.9% (500ml)', unit: 'Carton', quantity: 200, unitPrice: 275, total: 55000 },
//       { itemNo: 4, description: 'Insulin (100 IU/ml)', unit: 'Box', quantity: 100, unitPrice: 840, total: 84000 },
//     ],
//     grandTotal: 196400,
//     status: 'Unsuccessful',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'FDA License', uploaded: false },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'Drug Import Permit', uploaded: true },
//       { name: 'Quality Assurance Certificates', uploaded: true },
//     ],
//     complianceScore: 80,
//     evaluationScore: 70,
//   },
//   {
//     id: 'BID-2026-007',
//     tenderId: 'T-003',
//     supplierId: 'SUP-004',
//     submittedDate: '2026-02-08',
//     items: [
//       { itemNo: 1, description: 'Paracetamol 500mg (1000 tabs)', unit: 'Box', quantity: 500, unitPrice: 48, total: 24000 },
//       { itemNo: 2, description: 'Amoxicillin 250mg (100 caps)', unit: 'Box', quantity: 300, unitPrice: 125, total: 37500 },
//       { itemNo: 3, description: 'Normal Saline 0.9% (500ml)', unit: 'Carton', quantity: 200, unitPrice: 285, total: 57000 },
//       { itemNo: 4, description: 'Insulin (100 IU/ml)', unit: 'Box', quantity: 100, unitPrice: 860, total: 86000 },
//     ],
//     grandTotal: 204500,
//     status: 'Unsuccessful',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'FDA License', uploaded: true },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'Drug Import Permit', uploaded: false },
//       { name: 'Quality Assurance Certificates', uploaded: false },
//     ],
//     complianceScore: 60,
//     evaluationScore: 55,
//   },
//   // T-006 bids
//   {
//     id: 'BID-2026-008',
//     tenderId: 'T-006',
//     supplierId: 'SUP-001',
//     submittedDate: '2026-03-28',
//     items: [
//       { itemNo: 1, description: 'Complete Blood Count Reagent', unit: 'Pack', quantity: 100, unitPrice: 320, total: 32000 },
//       { itemNo: 2, description: 'Chemistry Analyzer Reagents Set', unit: 'Set', quantity: 50, unitPrice: 1100, total: 55000 },
//       { itemNo: 3, description: 'Microscope Slides (72 pcs)', unit: 'Box', quantity: 200, unitPrice: 22, total: 4400 },
//       { itemNo: 4, description: 'Pipette Tips (1000 pcs)', unit: 'Pack', quantity: 150, unitPrice: 40, total: 6000 },
//     ],
//     grandTotal: 97400,
//     status: 'Under Review',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'FDA Registration', uploaded: true },
//       { name: 'Material Safety Data Sheets', uploaded: true },
//     ],
//     complianceScore: 100,
//   },
//   {
//     id: 'BID-2026-009',
//     tenderId: 'T-006',
//     supplierId: 'SUP-003',
//     submittedDate: '2026-03-29',
//     items: [
//       { itemNo: 1, description: 'Complete Blood Count Reagent', unit: 'Pack', quantity: 100, unitPrice: 340, total: 34000 },
//       { itemNo: 2, description: 'Chemistry Analyzer Reagents Set', unit: 'Set', quantity: 50, unitPrice: 1150, total: 57500 },
//       { itemNo: 3, description: 'Microscope Slides (72 pcs)', unit: 'Box', quantity: 200, unitPrice: 24, total: 4800 },
//       { itemNo: 4, description: 'Pipette Tips (1000 pcs)', unit: 'Pack', quantity: 150, unitPrice: 42, total: 6300 },
//     ],
//     grandTotal: 102600,
//     status: 'Submitted',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'FDA Registration', uploaded: true },
//       { name: 'Material Safety Data Sheets', uploaded: false },
//     ],
//     complianceScore: 75,
//   },
//   // T-007 bid
//   {
//     id: 'BID-2026-010',
//     tenderId: 'T-007',
//     supplierId: 'SUP-004',
//     submittedDate: '2026-03-28',
//     items: [
//       { itemNo: 1, description: 'Breakfast Service (per day)', unit: 'Day', quantity: 365, unitPrice: 230, total: 83950 },
//       { itemNo: 2, description: 'Lunch Service (per day)', unit: 'Day', quantity: 365, unitPrice: 420, total: 153300 },
//       { itemNo: 3, description: 'Dinner Service (per day)', unit: 'Day', quantity: 365, unitPrice: 320, total: 116800 },
//     ],
//     grandTotal: 354050,
//     status: 'Submitted',
//     documents: [
//       { name: 'Company Profile', uploaded: true },
//       { name: 'Tax Clearance', uploaded: true },
//       { name: 'Food Safety Certificate', uploaded: true },
//       { name: 'Menu Proposals', uploaded: true },
//       { name: 'Health Inspection Report', uploaded: true },
//     ],
//     complianceScore: 100,
//   },
// ];

// export const expressedInterests: ExpressedInterest[] = [
//   { tenderId: 'T-001', supplierId: 'SUP-001', date: '2026-03-21' },
//   { tenderId: 'T-001', supplierId: 'SUP-002', date: '2026-03-22' },
//   { tenderId: 'T-001', supplierId: 'SUP-003', date: '2026-03-22' },
//   { tenderId: 'T-002', supplierId: 'SUP-003', date: '2026-03-16' },
//   { tenderId: 'T-003', supplierId: 'SUP-001', date: '2026-01-18' },
//   { tenderId: 'T-003', supplierId: 'SUP-002', date: '2026-01-17' },
//   { tenderId: 'T-003', supplierId: 'SUP-003', date: '2026-01-20' },
//   { tenderId: 'T-003', supplierId: 'SUP-004', date: '2026-01-19' },
//   { tenderId: 'T-006', supplierId: 'SUP-001', date: '2026-03-22' },
//   { tenderId: 'T-006', supplierId: 'SUP-003', date: '2026-03-23' },
//   { tenderId: 'T-007', supplierId: 'SUP-004', date: '2026-03-18' },
// ];

// export const adminUsers: AdminUser[] = [
//   { id: 'ADM-001', name: 'Dr. Samuel Owusu', email: 'admin@hms.gov.gh', role: 'Super Admin', lastLogin: '2026-03-30T08:30:00', status: 'Active', password: 'Admin@1234' },
//   { id: 'ADM-002', name: 'Janet Appiah', email: 'janet@hms.gov.gh', role: 'Procurement Officer', lastLogin: '2026-03-29T14:20:00', status: 'Active', password: 'Admin@1234' },
//   { id: 'ADM-003', name: 'Richard Osei', email: 'richard@hms.gov.gh', role: 'Evaluator', lastLogin: '2026-03-28T09:45:00', status: 'Active', password: 'Admin@1234' },
//   { id: 'ADM-004', name: 'Mary Ansah', email: 'mary@hms.gov.gh', role: 'Viewer', lastLogin: '2026-03-25T11:00:00', status: 'Inactive', password: 'Admin@1234' },
// ];

// export const notifications: Notification[] = [
//   { id: 'N-001', userId: 'ADM-001', userType: 'admin', message: 'ICT Infrastructure Upgrade tender closing in 3 days', type: 'warning', read: false, timestamp: '2026-03-30T08:00:00', link: '/admin/tenders' },
//   { id: 'N-002', userId: 'ADM-001', userType: 'admin', message: 'New supplier registration: FreshMeals Catering Co.', type: 'info', read: false, timestamp: '2026-03-29T16:00:00', link: '/admin/suppliers' },
//   { id: 'N-003', userId: 'ADM-001', userType: 'admin', message: '3 pending supplier approvals require attention', type: 'warning', read: false, timestamp: '2026-03-29T10:00:00', link: '/admin/suppliers' },
//   { id: 'N-004', userId: 'ADM-001', userType: 'admin', message: 'New bid submitted for Supply of Surgical Equipment', type: 'info', read: true, timestamp: '2026-03-27T14:30:00', link: '/admin/tenders/T-001' },
//   { id: 'N-005', userId: 'ADM-001', userType: 'admin', message: 'Pharmaceutical Supplies Q2 tender has been awarded', type: 'success', read: true, timestamp: '2026-02-20T09:00:00' },
//   { id: 'N-006', userId: 'SUP-001', userType: 'supplier', message: 'Your registration has been approved', type: 'success', read: true, timestamp: '2026-01-12T10:00:00' },
//   { id: 'N-007', userId: 'SUP-001', userType: 'supplier', message: 'New tender available: Supply of Surgical Equipment', type: 'info', read: false, timestamp: '2026-03-15T09:00:00', link: '/supplier/tenders/T-001' },
//   { id: 'N-008', userId: 'SUP-001', userType: 'supplier', message: 'Your bid BID-2026-001 is under review', type: 'info', read: false, timestamp: '2026-03-26T10:00:00', link: '/supplier/bids' },
//   { id: 'N-009', userId: 'SUP-001', userType: 'supplier', message: 'Lab Reagents & Consumables tender closing in 20 days', type: 'warning', read: false, timestamp: '2026-03-28T08:00:00' },
//   { id: 'N-010', userId: 'SUP-001', userType: 'supplier', message: 'Your bid for Pharmaceutical Supplies Q2 was unsuccessful', type: 'error', read: true, timestamp: '2026-02-20T09:30:00' },
//   { id: 'N-011', userId: 'SUP-002', userType: 'supplier', message: 'Congratulations! Your bid for Pharmaceutical Supplies Q2 has been awarded', type: 'success', read: true, timestamp: '2026-02-20T09:00:00' },
//   { id: 'N-012', userId: 'SUP-002', userType: 'supplier', message: 'New tender available: Supply of Surgical Equipment', type: 'info', read: false, timestamp: '2026-03-15T09:00:00' },
// ];

// export const auditLog: AuditEntry[] = [
//   { id: 'AU-001', user: 'Dr. Samuel Owusu', action: 'Created tender', entity: 'T-007: Catering Services', timestamp: '2026-03-12T10:00:00' },
//   { id: 'AU-002', user: 'Dr. Samuel Owusu', action: 'Approved supplier', entity: 'SUP-004: CleanPro Services Ltd', timestamp: '2026-02-18T14:30:00' },
//   { id: 'AU-003', user: 'Janet Appiah', action: 'Created tender', entity: 'T-006: Lab Reagents & Consumables', timestamp: '2026-03-18T09:00:00' },
//   { id: 'AU-004', user: 'Dr. Samuel Owusu', action: 'Awarded tender', entity: 'T-003: Pharmaceutical Supplies Q2 → Global Pharma Co.', timestamp: '2026-02-20T08:45:00' },
//   { id: 'AU-005', user: 'Dr. Samuel Owusu', action: 'Blacklisted supplier', entity: 'SUP-009: ShadowMed Enterprises', timestamp: '2025-09-15T11:00:00' },
//   { id: 'AU-006', user: 'Janet Appiah', action: 'Published tender', entity: 'T-001: Supply of Surgical Equipment', timestamp: '2026-03-15T08:00:00' },
//   { id: 'AU-007', user: 'Richard Osei', action: 'Scored bid', entity: 'BID-2026-001 for T-001', timestamp: '2026-03-28T15:00:00' },
//   { id: 'AU-008', user: 'Dr. Samuel Owusu', action: 'Rejected supplier', entity: 'SUP-008: QuickFix Motors Ltd', timestamp: '2026-01-10T16:00:00' },
// ];

// export const tenderCategories = [
//   'Medical Supplies', 'Pharmaceuticals', 'IT & Electronics', 'Office Supplies',
//   'Cleaning & Sanitation', 'Laboratory Equipment', 'Catering', 'Construction', 'Consultancy', 'Other',
// ];

// export const defaultRequiredDocuments = [
//   'Company Profile', 'Certificate of Incorporation', 'Tax Clearance Certificate',
//   'Business Registration Certificate', 'Previous Contract References',
// ];

// export const organizationSettings = {
//   name: 'Greater Accra Regional Hospital',
//   contactEmail: 'procurement@hms.gov.gh',
//   fiscalYear: '2026',
//   logo: '',
// };

// export function formatCurrency(amount: number): string {
//   return `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// }

// export function formatDate(dateStr: string): string {
//   if (!dateStr) return '—';
//   return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
// }

// export function getDaysUntil(dateStr: string): number {
//   const now = new Date();
//   const target = new Date(dateStr);
//   return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
// }

// export function generateId(prefix: string): string {
//   return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
// }
