import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import { Save, Loader2, Eye, FileText, ExternalLink } from 'lucide-react';
import {
  getCompanyTypes, getRegions, getCities, getCountries, getCategories,
  getSupplierById, updateSupplier, getDocumentSignedUrl,
} from '@/services/api';

interface Document {
  name: string;
  fileName?: string;
  url?: string;
  status: 'Verified' | 'Pending';
  uploadDate: string;
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

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  companyName: string;
  registrationNumber: string;
  tin: string;
  companyType: {
    id: string;
    name: string;
    description: string;
    keyPrefix: string;
  } | null;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
  city: {
    id: string;
    name: string;
    description: string;
  } | null;
  region: {
    id: string;
    name: string;
    description: string;
    keyPrefix: string;
  } | null;
  country: {
    id: string;
    name: string;
    description: string;
    keyPrefix: string;
  } | null;
  categories: string[];
  documents: Document[];
  status: string;
  rejectionReason?: string;
  dateApplied: string;
}

export default function SupplierProfile() {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  // Dropdown data
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [ctRes, regionRes, cityRes, countryRes, catRes] = await Promise.all([
          getCompanyTypes(),
          getRegions(),
          getCities(),
          getCountries(),
          getCategories(),
        ]);

        setCompanyTypes(ctRes.data);
        setRegions(regionRes.data);
        setCities(cityRes.data);
        setCountries(countryRes.data);
        setCategories(catRes.data);
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Filter cities when region changes
  useEffect(() => {
    if (form?.regionId) {
      const filtered = cities.filter(city => city.regionId === form.regionId);
      setFilteredCities(filtered);
      if (form.cityId && !filtered.find(city => city.id === form.cityId)) {
        setForm((prev: any) => ({ ...prev, cityId: '' }));
      }
    } else {
      setFilteredCities([]);
    }
  }, [form?.regionId, cities]);

  const fetchSupplier = async () => {
    if (!user?.id) return;

    try {
      const { data } = await getSupplierById(user.id);
      setSupplier(data);
      setForm({
        ...data,
        companyTypeId: data.companyType?.id || '',
        regionId:      data.region?.id       || '',
        cityId:        data.city?.id          || '',
        countryId:     data.country?.id       || '',
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplier();
  }, [user?.id]);

  const handleSave = async () => {
    if (!form) return;

    setSaving(true);
    try {
      await updateSupplier(user?.id, {
        companyName:        form.companyName,
        registrationNumber: form.registrationNumber,
        tin:                form.tin,
        companyTypeId:      form.companyTypeId,
        contactPerson:      form.contactPerson,
        designation:        form.designation,
        phone:              form.phone,
        address:            form.address,
        cityId:             form.cityId,
        regionId:           form.regionId,
        countryId:          form.countryId,
        categories:         form.categories,
      });

      // Re-fetch to get the fully shaped response with all joined reference data
      await fetchSupplier();
      addToast('Profile updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      addToast(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadDocument = async (doc: Document) => {
    if (!doc.fileName) {
      addToast(`Download not available for ${doc.name}`, 'info');
      return;
    }

    setDownloading(doc.name);
    try {
      const { data } = await getDocumentSignedUrl(doc.fileName);
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        addToast('Failed to download document', 'error');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      addToast('Failed to download document', 'error');
    } finally {
      setDownloading(null);
    }
  };

  if (loading || loadingDropdowns) {
    return (
      <PortalLayout type="supplier" title="My Profile" breadcrumb={['Supplier', 'Profile']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error || !supplier || !form) {
    return (
      <PortalLayout type="supplier" title="My Profile" breadcrumb={['Supplier', 'Profile']}>
        <div className="text-center py-12 text-destructive">{error || 'Profile not found'}</div>
      </PortalLayout>
    );
  }

  const statusBanner: Record<string, string> = {
    Approved:    'bg-success/10 border-success/30 text-success',
    Pending:     'bg-warning/10 border-warning/30 text-warning',
    Rejected:    'bg-destructive/10 border-destructive/30 text-destructive',
    Blacklisted: 'bg-red-900/20 border-red-800/30 text-red-300',
  };

  // Only pending suppliers can edit company info, address, and categories
  const isEditable = supplier.status === 'Pending';

  return (
    <PortalLayout type="supplier" title="My Profile" breadcrumb={['Supplier', 'Profile']}>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className={`p-4 rounded-xl border ${statusBanner[supplier.status] || ''}`}>
          Account Status: <strong>{supplier.status}</strong>
          {supplier.status === 'Pending' && <span className="text-sm ml-2">— Please wait for admin review</span>}
          {supplier.rejectionReason && <p className="text-sm mt-1 opacity-80">{supplier.rejectionReason}</p>}
        </div>

        {/* Company Information */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold">Company Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Company Name</label>
              <input
                value={form.companyName || ''}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                disabled={!isEditable}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Registration Number</label>
              <input
                value={form.registrationNumber || ''}
                disabled
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">TIN</label>
              <input
                value={form.tin || ''}
                onChange={e => setForm({ ...form, tin: e.target.value })}
                disabled={!isEditable}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Company Type</label>
              <select
                value={form.companyTypeId || ''}
                onChange={e => setForm({ ...form, companyTypeId: e.target.value })}
                disabled={!isEditable}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none disabled:opacity-50"
              >
                <option value="">Select company type</option>
                {companyTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold">Contact Information</h3>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              Always editable
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Contact Person</label>
              <input
                value={form.contactPerson || ''}
                onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Designation</label>
              <input
                value={form.designation || ''}
                onChange={e => setForm({ ...form, designation: e.target.value })}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                value={form.email || ''}
                disabled
                title="Email is your login identity and cannot be changed here"
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                value={form.phone || ''}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <input
                value={form.address || ''}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Country</label>
              <select
                value={form.countryId || ''}
                onChange={e => setForm({ ...form, countryId: e.target.value })}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:border-primary"
              >
                <option value="">Select country</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Region</label>
              <select
                value={form.regionId || ''}
                onChange={e => setForm({ ...form, regionId: e.target.value })}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:border-primary"
              >
                <option value="">Select region</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">City</label>
              <select
                value={form.cityId || ''}
                onChange={e => setForm({ ...form, cityId: e.target.value })}
                disabled={!form.regionId}
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none disabled:opacity-50"
              >
                <option value="">{!form.regionId ? 'Select region first' : 'Select city'}</option>
                {filteredCities.map(city => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Business Categories */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Business Categories</h3>
            {!isEditable && (
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                Locked after approval
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => {
              const isSelected = (form.categories || []).some(
                (c: any) => (typeof c === 'object' ? c.id : c) === cat.id
              );
              return (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500 font-medium'
                      : 'border-border text-muted-foreground'
                  } ${!isEditable ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-primary/40'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      if (!isEditable) return;
                      const currentIds = (form.categories || []).map(
                        (c: any) => typeof c === 'object' ? c.id : c
                      );
                      const newIds = isSelected
                        ? currentIds.filter((id: string) => id !== cat.id)
                        : [...currentIds, cat.id];
                      setForm({ ...form, categories: newIds });
                    }}
                    disabled={!isEditable}
                    className="sr-only"
                  />
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  )}
                  {cat.name}
                </label>
              );
            })}
          </div>
          {!isEditable && (
            <p className="text-xs text-muted-foreground mt-3">
              Categories can only be changed while your account is pending review.
            </p>
          )}
        </div>

        {/* Documents — READ ONLY with link to Documents page */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Documents</h3>
            <Link
              to="/supplier/documents"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Manage Documents <ExternalLink size={12} />
            </Link>
          </div>

          {!supplier.documents || supplier.documents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents uploaded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {supplier.documents.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={d.status} />
                    <span className="text-sm">{d.name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(d.uploadDate)}</span>
                  </div>
                  <button
                    onClick={() => downloadDocument(d)}
                    className="p-1.5 rounded hover:bg-muted/50 transition-colors"
                    title="View/Download Document"
                    disabled={downloading === d.name}
                  >
                    {downloading === d.name ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Eye size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {supplier.status === 'Approved' && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              To renew expiring documents, go to the{' '}
              <Link to="/supplier/documents" className="text-primary">Documents</Link> page.
            </p>
          )}

          {supplier.status === 'Pending' && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Your documents are pending review. You can still upload new versions if needed.
            </p>
          )}
        </div>

        {/* Save Button — always visible */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </PortalLayout>
  );
}
