import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StepIndicator from '@/components/StepIndicator';
import { generateId } from '@/utils/helpers';
import { CheckCircle, Upload, X, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import TermsOfUseModal from '@/components/TermsOfUseModal';
import PrivacyPolicyModal from '@/components/Privacypolicymodal';
import { useNotification } from '@/context/NotificationContext';
import { 
  getCompanyTypes, 
  getRegions, 
  getCities, 
  getCountries, 
  getRegistrationCategories,
  generateRegistrationNumber,
  registerSupplier,
  uploadSupplierDocuments,
  uploadSupplierExperiences,
} from '@/services/api';

const steps = ['Company Info', 'Contact & Location', 'Business Category', 'Account Setup'];

interface Category {
  id: string;
  name: string;
  description: string;
}

interface UploadedFile {
  file: File;
  name: string;
  docType: string;
  progress: number;
  uploaded: boolean;
  error?: string;
  expiryDate?: string;
}

interface CompanyType {
  id: string;
  name: string;
  description: string;
  keyPrefix: string;
}

interface Region {
  id: string;
  name: string;
  description: string;
  keyPrefix: string;
}

interface City {
  id: string;
  name: string;
  description: string;
  regionId: string;
}

interface Country {
  id: string;
  name: string;
  description: string;
  keyPrefix: string;
}

interface DocumentType {
  key: string;
  name: string;
  required: boolean;
  requiresExpiry: boolean;
  expiryMonths?: number;
  helpText?: string;
}

const DOCUMENT_TYPES: DocumentType[] = [
  { key: 'companyProfile', name: 'Company Profile / Brochure', required: false, requiresExpiry: false },
  { key: 'certificateOfIncorporation', name: 'Certificate of Incorporation', required: true, requiresExpiry: false },
  { key: 'graClearance', name: 'GRA Clearance Certificate', required: true, requiresExpiry: true, expiryMonths: 12, helpText: 'Enter the expiry date shown on your GRA clearance certificate' },
  { key: 'ssnitClearance', name: 'SSNIT Clearance Certificate', required: true, requiresExpiry: true, expiryMonths: 12, helpText: 'Enter the expiry date shown on your SSNIT clearance certificate' },
  { key: 'fdaCertificate', name: 'FDA Certificate', required: false, requiresExpiry: true, expiryMonths: 12, helpText: 'Enter the expiry date shown on your FDA certificate' },
  { key: 'ppaCertificate', name: 'PPA Certificate', required: false, requiresExpiry: true, expiryMonths: 12, helpText: 'Enter the expiry date shown on your PPA certificate' },
  { key: 'introductionLetter', name: 'Introduction Letter', required: true, requiresExpiry: false },
  { key: 'auditedFinancials', name: 'Audited Financial Statements (past 2 years)', required: true, requiresExpiry: false },
  { key: 'cvDocument', name: 'CV with Past Experiences...', required: true, requiresExpiry: false }
];

interface ExperienceEntry {
  id: string;
  company: string;
  proofFile: File | null;
  proofFileName: string;
}

export default function SupplierRegister() {
  const { addToast } = useNotification();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [refId] = useState<string>(generateId('REG'));
  const [generatedSupplierId, setGeneratedSupplierId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loadingRegNumber, setLoadingRegNumber] = useState(true);

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [loadingCompanyTypes, setLoadingCompanyTypes] = useState(true);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(true);
  
  const [documentExpiries, setDocumentExpiries] = useState<Record<string, string>>({});
  
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([
    { id: Date.now().toString(), company: '', proofFile: null, proofFileName: '' }
  ]);
  
  const [files, setFiles] = useState<Record<string, UploadedFile | null>>({
    companyProfile: null,
    certificateOfIncorporation: null,
    graClearance: null,
    ssnitClearance: null,
    fdaCertificate: null,
    ppaCertificate: null,
    introductionLetter: null,
    auditedFinancials: null,
    cvDocument: null
  });
  
  const [form, setForm] = useState({
    companyName: '', 
    regNumber: '',
    tin: '', 
    dateOfIncorporation: '', 
    countryOfIncorporation: '',
    companyTypeId: '',
    contactPerson: '', 
    designation: '', 
    email: '', 
    phone: '', 
    address: '', 
    cityId: '',
    regionId: '',
    countryId: '',
    categories: [] as string[],
    password: '', 
    confirmPassword: '', 
    agreeTerms: false,
  });

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [ctRes, regionRes, countryRes, cityRes] = await Promise.all([
          getCompanyTypes(),
          getRegions(),
          getCountries(),
          getCities(),
        ]);
        setCompanyTypes(ctRes.data);
        setRegions(regionRes.data);
        setCountries(countryRes.data);
        setCities(cityRes.data);

        // Default both country fields to Ghana (users can still change them)
        const countryList: Country[] = countryRes.data || [];
        const ghana = countryList.find(c => c.name?.toLowerCase() === 'ghana')
          || countryList.find(c => c.name?.toLowerCase().includes('ghana'));
        if (ghana) {
          setForm(prev => ({
            ...prev,
            countryId: prev.countryId || ghana.id,
            countryOfIncorporation: prev.countryOfIncorporation || ghana.name,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      } finally {
        setLoadingCompanyTypes(false);
        setLoadingRegions(false);
        setLoadingCities(false);
        setLoadingCountries(false);
      }
    };
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (form.regionId) {
      const filtered = cities.filter(city => city.regionId === form.regionId);
      setFilteredCities(filtered);
      if (form.cityId && !filtered.find(city => city.id === form.cityId)) {
        update('cityId', '');
      }
    } else {
      setFilteredCities([]);
    }
  }, [form.regionId, cities]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getRegistrationCategories();
        setAvailableCategories(response.data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchRegistrationNumber = async () => {
      try {
        setLoadingRegNumber(true);
        const response = await generateRegistrationNumber();
        setForm(prev => ({ ...prev, regNumber: response.data.registrationNumber }));
      } catch (error) {
        console.error('Failed to fetch registration number:', error);
        const fallback = `Reg${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}00001`;
        setForm(prev => ({ ...prev, regNumber: fallback }));
      } finally {
        setLoadingRegNumber(false);
      }
    };
    fetchRegistrationNumber();
  }, []);

  const update = (field: string, value: any) => { 
    setForm(prev => ({ ...prev, [field]: value })); 
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; }); 
  };

  const updateDocumentExpiry = (docType: string, date: string) => {
    setDocumentExpiries(prev => ({ ...prev, [docType]: date }));
    if (errors[`${docType}Expiry`]) {
      setErrors(prev => { const n = { ...prev }; delete n[`${docType}Expiry`]; return n; });
    }
  };

  const addExperience = () => {
    setExperiences(prev => [...prev, { id: Date.now().toString(), company: '', proofFile: null, proofFileName: '' }]);
  };

  const removeExperience = (id: string) => {
    if (experiences.length > 1) {
      setExperiences(prev => prev.filter(exp => exp.id !== id));
    }
  };

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: any) => {
    setExperiences(prev => prev.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };

  const handleExperienceProofSelect = (expId: string, file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Invalid file type. Please upload PDF, JPEG, or PNG files for proof.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('File size must be less than 5MB.', 'error');
      return;
    }
    updateExperience(expId, 'proofFile', file);
    updateExperience(expId, 'proofFileName', file.name);
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      addToast('Invalid file type. Please upload PDF, JPEG, PNG, or DOC files.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('File size must be less than 5MB.', 'error');
      return;
    }
    const docTypeInfo = DOCUMENT_TYPES.find(d => d.key === docType);
    setFiles(prev => ({
      ...prev,
      [docType]: { file, name: docTypeInfo?.name || docType, docType, progress: 0, uploaded: false }
    }));
    // Clear any prior error for this doc
    setErrors(prev => { const n = { ...prev }; delete n['documents']; return n; });
  };

  const removeFile = (docType: string) => {
    setFiles(prev => ({ ...prev, [docType]: null }));
    if (documentExpiries[docType]) {
      setDocumentExpiries(prev => { const n = { ...prev }; delete n[docType]; return n; });
    }
  };

  const uploadFiles = async (supplierId: string, uploadToken: string): Promise<boolean> => {
    setUploadingFiles(true);
    try {
      const docFormData = new FormData();
      let hasFiles = false;
      for (const [docType, fileData] of Object.entries(files)) {
        if (fileData?.file) { docFormData.append(docType, fileData.file); hasFiles = true; }
      }
      for (const [docType, expiryDate] of Object.entries(documentExpiries)) {
        if (expiryDate) docFormData.append(`${docType}Expiry`, expiryDate);
      }
      if (hasFiles) await uploadSupplierDocuments(supplierId, docFormData, uploadToken);

      const validExperiences = experiences.filter(exp => exp.company && exp.proofFile);
      if (validExperiences.length > 0) {
        const expFormData = new FormData();
        let expIndex = 0;
        for (const exp of validExperiences) {
          expFormData.append(`experienceProof${expIndex}`, exp.proofFile!);
          expFormData.append(`experienceCompany${expIndex}`, exp.company);
          expIndex++;
        }
        expFormData.append('experienceCount', expIndex.toString());
        await uploadSupplierExperiences(supplierId, expFormData, uploadToken);
      }
      return true;
    } catch (error) {
      console.error('Error uploading files:', error);
      return false;
    } finally {
      setUploadingFiles(false);
    }
  };
  
  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.companyName) e.companyName = 'Required';
      if (!form.regNumber) e.regNumber = 'Required';
      if (!form.companyTypeId) e.companyTypeId = 'Required';
      if (!form.countryOfIncorporation) e.countryOfIncorporation = 'Required';
    } else if (step === 1) {
      if (!form.contactPerson) e.contactPerson = 'Required';
      if (!form.designation) e.designation = 'Required';
      if (!form.email) e.email = 'Required';
      if (!form.phone) e.phone = 'Required';
      if (!form.address) e.address = 'Required';
      if (!form.regionId) e.regionId = 'Please select a region';
      if (!form.cityId) e.cityId = 'Please select a city';
      if (!form.countryId) e.countryId = 'Please select a country';
    } else if (step === 2) {
      if (form.categories.length === 0) e.categories = 'Select at least one category';

      const requiredDocs = DOCUMENT_TYPES.filter(doc => doc.required);
      const missingRequired = requiredDocs.filter(doc => !files[doc.key]?.file);
      if (missingRequired.length > 0) {
        e.documents = `Missing required documents: ${missingRequired.map(d => d.name).join(', ')}`;
      }

      const docsRequiringExpiry = DOCUMENT_TYPES.filter(doc => doc.requiresExpiry && files[doc.key]?.file);
      for (const doc of docsRequiringExpiry) {
        const expiryDate = documentExpiries[doc.key];
        if (!expiryDate) {
          e[`${doc.key}Expiry`] = `Please enter the expiry date for ${doc.name}`;
        } else if (new Date(expiryDate) < new Date()) {
          e[`${doc.key}Expiry`] = `The expiry date for ${doc.name} is in the past — please upload a valid, current document`;
        }
      }

      const validExperiences = experiences.filter(exp => exp.company && exp.proofFile);
      if (validExperiences.length < 3) {
        e.experiences = `Please add at least 3 work experiences with company name and proof documents (${validExperiences.length}/3 completed)`;
      }
    } else if (step === 3) {
      if (!form.password || form.password.length < 8) e.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!form.agreeTerms) e.agreeTerms = 'You must agree to the Terms & Conditions and Privacy Policy to continue';
    }
    setErrors(e);

    // Show a toast summary if there are errors so it's hard to miss
    const errorCount = Object.keys(e).length;
    if (errorCount > 0) {
      addToast(
        errorCount === 1
          ? 'Please fix the error below before continuing.'
          : `Please fix ${errorCount} errors below before continuing.`,
        'error'
      );
    }

    return errorCount === 0;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 3)); };
  const back = () => setStep(s => Math.max(s - 1, 0));
  
  const submit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const response = await registerSupplier({
        companyName: form.companyName,
        tin: form.tin,
        dateOfIncorporation: form.dateOfIncorporation,
        countryOfIncorporation: form.countryOfIncorporation,
        companyTypeId: form.companyTypeId,
        contactPerson: form.contactPerson,
        designation: form.designation,
        email: form.email,
        phone: form.phone,
        address: form.address,
        cityId: form.cityId,
        regionId: form.regionId,
        countryId: form.countryId,
        categories: form.categories,
        password: form.password,
        experiences: experiences.filter(exp => exp.company && exp.proofFile).map(exp => ({ company: exp.company }))
      });

      const data = response.data;
        if (response.status === 201) {
          setGeneratedSupplierId(data.supplierId);
          if (data.supplierId) {
            const uploadSuccess = await uploadFiles(data.supplierId, data.uploadToken);
          if (!uploadSuccess) {
            addToast('Registration successful but some documents failed to upload. You can upload them later from your profile.', 'error');
          }
        }
        addToast('Registration submitted successfully!', 'success');
        setSubmitted(true);
      } else {
        const msg = data.message || 'Registration failed. Please try again.';
        setSubmitError(msg);
        addToast(msg, 'error');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Network error. Please check if the server is running.';
      setSubmitError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    update('categories', 
      form.categories.includes(categoryId) 
        ? form.categories.filter(id => id !== categoryId) 
        : [...form.categories, categoryId]
    );
  };

  const getRemainingValidity = (expiryDate: string) => {
    if (!expiryDate) return null;
    const daysRemaining = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0)   return { text: 'EXPIRED — please upload a current document', color: 'text-destructive', icon: 'error' };
    if (daysRemaining <= 30) return { text: `Expires in ${daysRemaining} days — expiring very soon`, color: 'text-destructive', icon: 'warning' };
    if (daysRemaining <= 90) return { text: `Expires in ${Math.floor(daysRemaining / 30)} month(s)`, color: 'text-yellow-500', icon: 'warning' };
    return { text: `Valid for ${Math.floor(daysRemaining / 30)} month(s)`, color: 'text-success', icon: 'ok' };
  };

  const inputClass  = (field: string) => `w-full px-3 py-2.5 bg-muted/50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all ${errors[field] ? 'border-destructive' : 'border-border'}`;
  const selectClass = (field: string) => `w-full px-3 py-2.5 bg-muted/50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all ${errors[field] ? 'border-destructive' : 'border-border'}`;
  const disabledInputClass = () => `w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed`;

  const fileInputRef = (docType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(docType, file);
    };
    input.click();
  };

  // Reusable inline error banner
  const ErrorBanner = ({ message }: { message: string }) => (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle size={72} className="text-success mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">Registration Submitted!</h1>
          <p className="text-muted-foreground mb-2">Your application is under review.</p>
          <p className="text-muted-foreground mb-6">You will receive an email once approved.</p>
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <p className="text-sm text-muted-foreground">Registration Number</p>
            <p className="text-xl font-bold text-primary">{form.regNumber}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">Supplier ID</p>
            <p className="text-md font-mono text-muted-foreground">{generatedSupplierId || refId}</p>
          </div>
          <Link to="/supplier/login" className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Supplier Registration</h1>
          <p className="text-sm text-muted-foreground">TTH Procurement Portal</p>
        </div>

        {submitError && <ErrorBanner message={submitError} />}

        <StepIndicator steps={steps} currentStep={step} />

        <div className="bg-card border border-border rounded-xl p-6">

          {/* ── Step 0: Company Info ── */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Company Information</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">Company Name <span className="text-destructive">*</span></label>
                <input value={form.companyName} onChange={e => update('companyName', e.target.value)} className={inputClass('companyName')} />
                {errors.companyName && <ErrorBanner message={errors.companyName} />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Registration Number <span className="text-destructive">*</span></label>
                  {loadingRegNumber ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border border-border rounded-lg">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm text-muted-foreground">Generating...</span>
                    </div>
                  ) : (
                    <>
                      <input value={form.regNumber} disabled className={disabledInputClass()} />
                      <p className="text-xs text-muted-foreground mt-1">Auto-generated — cannot be edited</p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tax ID (TIN)</label>
                  <input value={form.tin} onChange={e => update('tin', e.target.value)} className={inputClass('tin')} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date of Incorporation</label>
                  <input type="date" value={form.dateOfIncorporation} onChange={e => update('dateOfIncorporation', e.target.value)} className={inputClass('')} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Company Type <span className="text-destructive">*</span></label>
                  <select value={form.companyTypeId} onChange={e => update('companyTypeId', e.target.value)} className={selectClass('companyTypeId')} disabled={loadingCompanyTypes}>
                    <option value="">Select company type</option>
                    {companyTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                  {errors.companyTypeId && <ErrorBanner message={errors.companyTypeId} />}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Country of Incorporation <span className="text-destructive">*</span></label>
                <select value={form.countryOfIncorporation} onChange={e => update('countryOfIncorporation', e.target.value)} className={selectClass('countryOfIncorporation')} disabled={loadingCountries}>
                  <option value="">Select country</option>
                  {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                {errors.countryOfIncorporation && <ErrorBanner message={errors.countryOfIncorporation} />}
              </div>
            </div>
          )}

          {/* ── Step 1: Contact & Location ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Contact & Location</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Contact Person <span className="text-destructive">*</span></label>
                  <input value={form.contactPerson} onChange={e => update('contactPerson', e.target.value)} className={inputClass('contactPerson')} />
                  {errors.contactPerson && <ErrorBanner message={errors.contactPerson} />}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Designation <span className="text-destructive">*</span></label>
                  <input value={form.designation} onChange={e => update('designation', e.target.value)} className={inputClass('designation')} />
                  {errors.designation && <ErrorBanner message={errors.designation} />}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email <span className="text-destructive">*</span></label>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputClass('email')} />
                  {errors.email && <ErrorBanner message={errors.email} />}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone <span className="text-destructive">*</span></label>
                  <input value={form.phone} onChange={e => update('phone', e.target.value)} className={inputClass('phone')} />
                  {errors.phone && <ErrorBanner message={errors.phone} />}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Office Address <span className="text-destructive">*</span></label>
                <input value={form.address} onChange={e => update('address', e.target.value)} className={inputClass('address')} />
                {errors.address && <ErrorBanner message={errors.address} />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Country <span className="text-destructive">*</span></label>
                  <select value={form.countryId} onChange={e => update('countryId', e.target.value)} className={selectClass('countryId')} disabled={loadingCountries}>
                    <option value="">Select country</option>
                    {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.countryId && <ErrorBanner message={errors.countryId} />}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Region <span className="text-destructive">*</span></label>
                  <select value={form.regionId} onChange={e => update('regionId', e.target.value)} className={selectClass('regionId')} disabled={loadingRegions}>
                    <option value="">Select region</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {errors.regionId && <ErrorBanner message={errors.regionId} />}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">City <span className="text-destructive">*</span></label>
                  <select value={form.cityId} onChange={e => update('cityId', e.target.value)} className={selectClass('cityId')} disabled={!form.regionId || loadingCities}>
                    <option value="">{!form.regionId ? 'Select region first' : 'Select city'}</option>
                    {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.cityId && <ErrorBanner message={errors.cityId} />}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Business Category & Documents ── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold mb-4">Business Category & Documents</h2>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium mb-3">Supply Categories <span className="text-destructive">*</span></label>
                {loadingCategories ? (
                  <div className="text-center py-4 text-muted-foreground">Loading categories...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableCategories.map(cat => (
                      <label key={cat.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm ${form.categories.includes(cat.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'}`}>
                        <input type="checkbox" checked={form.categories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} className="sr-only" />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${form.categories.includes(cat.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                          {form.categories.includes(cat.id) && <CheckCircle size={12} className="text-primary-foreground" />}
                        </div>
                        <div>
                          <div className="font-medium">{cat.name}</div>
                          {cat.description && <div className="text-xs text-muted-foreground">{cat.description}</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.categories && <ErrorBanner message={errors.categories} />}
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <label className="block text-sm font-medium">Required Documents <span className="text-destructive">*</span></label>
                <p className="text-xs text-muted-foreground -mt-1">PDF, JPEG, PNG, or DOC — max 5 MB each</p>

                {errors.documents && <ErrorBanner message={errors.documents} />}

                {DOCUMENT_TYPES.map(doc => {
                  const fileData    = files[doc.key];
                  const expiryDate  = documentExpiries[doc.key];
                  const validity    = expiryDate ? getRemainingValidity(expiryDate) : null;

                  return (
                    <div key={doc.key} className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <Upload size={16} className="text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1">
                          {doc.name}
                          {doc.required && <span className="text-destructive ml-1">*</span>}
                          {doc.requiresExpiry && <span className="text-xs text-muted-foreground ml-2">(Requires expiry date)</span>}
                        </span>
                        {fileData ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-success">✓ {fileData.file.name}</span>
                            <button onClick={() => removeFile(doc.key)} className="text-destructive hover:text-destructive/80"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => fileInputRef(doc.key)} className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg hover:bg-primary/20 transition-colors">
                            Choose File
                          </button>
                        )}
                      </div>

                      {doc.requiresExpiry && fileData && (
                        <div className="ml-8 pl-4 border-l-2 border-primary/30 space-y-1.5">
                          <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1 text-muted-foreground">
                                Expiry Date <span className="text-destructive">*</span>
                              </label>
                              <input
                                type="date"
                                value={expiryDate || ''}
                                onChange={e => updateDocumentExpiry(doc.key, e.target.value)}
                                className={`w-64 px-3 py-1.5 bg-muted/50 border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 ${errors[`${doc.key}Expiry`] ? 'border-destructive' : 'border-border'}`}
                              />
                              {doc.helpText && <p className="text-xs text-muted-foreground mt-1">{doc.helpText}</p>}
                              {validity && (
                                <p className={`text-xs mt-1 font-medium ${validity.color}`}>{validity.text}</p>
                              )}
                            </div>
                          </div>
                          {errors[`${doc.key}Expiry`] && <ErrorBanner message={errors[`${doc.key}Expiry`]} />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Experiences */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium">Past Work Experience <span className="text-destructive">*</span></label>
                  <button type="button" onClick={addExperience} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors">
                    + Add Experience
                  </button>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">Minimum 3 experiences required with proof (e.g., LPO, contract)</p>

                {errors.experiences && <ErrorBanner message={errors.experiences} />}

                {experiences.map((exp, index) => (
                  <div key={exp.id} className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Experience #{index + 1}</span>
                      {experiences.length > 1 && (
                        <button onClick={() => removeExperience(exp.id)} className="text-destructive text-xs hover:text-destructive/80">Remove</button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Company Name <span className="text-destructive">*</span></label>
                      <input type="text" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded text-sm" placeholder="e.g., ABC Logistics" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Proof Document (LPO, Contract, etc.) <span className="text-destructive">*</span></label>
                      <div className="flex items-center gap-2">
                        {exp.proofFile ? (
                          <>
                            <span className="text-xs text-success">✓ {exp.proofFileName}</span>
                            <button onClick={() => updateExperience(exp.id, 'proofFile', null)} className="text-destructive text-xs">Remove</button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.pdf,.jpg,.jpeg,.png';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleExperienceProofSelect(exp.id, file);
                              };
                              input.click();
                            }}
                            className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            Upload Proof
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Account Setup ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold mb-4">Account Setup</h2>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email (from Step 2)</label>
                <input value={form.email} disabled className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Password <span className="text-destructive">*</span></label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Min 8 characters" className={inputClass('password')} />
                {errors.password && <ErrorBanner message={errors.password} />}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm Password <span className="text-destructive">*</span></label>
                <input type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} className={inputClass('confirmPassword')} />
                {errors.confirmPassword && <ErrorBanner message={errors.confirmPassword} />}
              </div>

              {/* Summary */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <h3 className="font-semibold text-sm mb-3">Registration Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Company:</span><span>{form.companyName || '—'}</span>
                  <span className="text-muted-foreground">Reg No:</span><span className="font-mono">{form.regNumber || '—'}</span>
                  <span className="text-muted-foreground">Company Type:</span><span>{companyTypes.find(c => c.id === form.companyTypeId)?.name || '—'}</span>
                  <span className="text-muted-foreground">Contact:</span><span>{form.contactPerson || '—'}</span>
                  <span className="text-muted-foreground">Email:</span><span>{form.email || '—'}</span>
                  <span className="text-muted-foreground">Location:</span>
                  <span>{regions.find(r => r.id === form.regionId)?.name || '—'}, {cities.find(c => c.id === form.cityId)?.name || '—'}</span>
                  <span className="text-muted-foreground">Categories:</span>
                  <span>{form.categories.map(id => availableCategories.find(c => c.id === id)?.name).filter(Boolean).join(', ') || '—'}</span>
                  <span className="text-muted-foreground">Documents:</span>
                  <span>{Object.values(files).filter(f => f?.file).map(f => f?.name).join(', ') || 'None'}</span>
                </div>
              </div>

              {/* Terms & Privacy checkbox */}
              <div className={`p-3 rounded-lg border transition-colors ${errors.agreeTerms ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                <label className="flex items-start gap-2.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={form.agreeTerms}
                    onChange={e => update('agreeTerms', e.target.checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Terms &amp; Conditions
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => setShowPrivacy(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
              </div>
              {errors.agreeTerms && <ErrorBanner message={errors.agreeTerms} />}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            {step > 0 ? (
              <button onClick={back} className="px-4 py-2 bg-muted text-sm rounded-lg hover:bg-muted/80 transition-colors">Back</button>
            ) : (
              <Link to="/" className="px-4 py-2 bg-muted text-sm rounded-lg hover:bg-muted/80 transition-colors">Cancel</Link>
            )}
            {step < 3 ? (
              <button onClick={next} className="px-6 py-2 bg-primary text-primary-foreground text-sm rounded-lg font-medium hover:bg-primary/80 transition-colors">Next</button>
            ) : (
              <button onClick={submit} disabled={isSubmitting || uploadingFiles} className="px-6 py-2 bg-success text-success-foreground text-sm rounded-lg font-medium hover:bg-success/80 disabled:opacity-50 flex items-center gap-2 transition-colors">
                {(isSubmitting || uploadingFiles) && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Submitting...' : uploadingFiles ? 'Uploading files...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already registered? <Link to="/supplier/login" className="text-primary hover:underline">Login here</Link>
        </p>
      </div>

      {/* Modals */}
      <TermsOfUseModal open={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
