import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { useNotification } from '@/context/NotificationContext';
import { CheckCircle, XCircle, Eye, Loader2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { getSupplierById, getSupplierDocuments, getBidsBySupplier, getTenders, updateSupplierStatus, getCategories, fetchDocument } from '@/services/api';

interface Category { id: string; name: string; description?: string; }
interface Document {
  name: string; fileName?: string; url?: string; status: string;
  uploadDate: string; expiryDate?: string; requiresExpiry?: boolean;
  isRenewal?: boolean; docType?: string;
  statusInfo?: {
    status: 'valid' | 'notice' | 'warning' | 'critical' | 'expired' | 'permanent';
    daysRemaining: number | null; label: string; color: string;
  };
}
interface CompanyType  { id: string; name: string; description: string; keyPrefix: string; }
interface Region       { id: string; name: string; description: string; keyPrefix: string; }
interface City         { id: string; name: string; description: string; }
interface Country      { id: string; name: string; description: string; keyPrefix: string; }
interface Supplier {
  id: string; companyName: string; registrationNumber: string; tin: string;
  dateOfIncorporation: string; countryOfIncorporation: string;
  companyType: CompanyType | null; contactPerson: string; designation: string;
  email: string; phone: string; address: string;
  city: City | null; region: Region | null; country: Country | null;
  categories: Category[]; documents: Document[];
  status: string; rejectionReason?: string; dateApplied: string;
}
interface Bid    { id: string; tenderId: string; supplierId: string; grandTotal: number; status: string; submittedDate: string; }
interface Tender { id: string; title: string; }

const calculateDocumentStatus = (doc: Document): Document['statusInfo'] => {
  if (!doc.expiryDate || !doc.requiresExpiry)
    return { status: 'permanent', daysRemaining: null, label: 'No Expiry', color: 'gray' };
  const daysRemaining = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000);
  if (daysRemaining < 0)   return { status: 'expired',  daysRemaining, label: 'Expired',       color: 'red'    };
  if (daysRemaining <= 7)  return { status: 'critical', daysRemaining, label: 'Expiring Soon', color: 'red'    };
  if (daysRemaining <= 30) return { status: 'warning',  daysRemaining, label: 'Expiring Soon', color: 'yellow' };
  if (daysRemaining <= 90) return { status: 'notice',   daysRemaining, label: 'Valid',         color: 'blue'   };
  return { status: 'valid', daysRemaining, label: 'Valid', color: 'green' };
};

export default function SupplierDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { addToast } = useNotification();

  const [supplier, setSupplier]         = useState<Supplier | null>(null);
  const [supplierBids, setSupplierBids] = useState<Bid[]>([]);
  const [tenders, setTenders]           = useState<Tender[]>([]);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState(false);
  const [downloading, setDownloading]   = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Reject modal state
  const [showRejectModal, setShowRejectModal]   = useState(false);
  const [rejectionReason, setRejectionReason]   = useState('');

  // Blacklist modal state
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason]       = useState('');

  useEffect(() => {
    getCategories().then(r => setAllCategories(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || allCategories.length === 0) return;
      try {
        const supplierData = (await getSupplierById(id)).data;
        let documents: Document[] = (await getSupplierDocuments(id)).data;
        documents = documents.map(doc => ({ ...doc, statusInfo: calculateDocumentStatus(doc) }));

        const [bidsData, tendersData] = await Promise.all([
          getBidsBySupplier(id).then(r => r.data),
          getTenders().then(r => r.data),
        ]);

        let categoryIds: string[] = [];
        if (typeof supplierData.categories === 'string') {
          try { categoryIds = JSON.parse(supplierData.categories); } catch { categoryIds = []; }
        } else if (Array.isArray(supplierData.categories)) {
          categoryIds = supplierData.categories.map((c: any) => c.id || c);
        }

        const mappedCategories = categoryIds.map((cid: string) => {
          const cat = allCategories.find(c => c.id === cid);
          return cat ? { id: cat.id, name: cat.name, description: cat.description } : { id: cid, name: cid, description: '' };
        });

        setSupplier({
          ...supplierData,
          contactPerson: supplierData.contactPerson || supplierData.ContactPerson,
          designation:   supplierData.designation   || supplierData.Designation,
          email:         supplierData.email         || supplierData.Email,
          phone:         supplierData.phone         || supplierData.Phone,
          address:       supplierData.address       || supplierData.Address,
          categories: mappedCategories,
          documents,
        });
        setSupplierBids(bidsData);
        setTenders(tendersData);
      } catch (error: any) {
        addToast(error.response?.data?.message || 'Failed to load supplier details', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, allCategories]);

  const handleUpdateSupplierStatus = async (newStatus: string, reason?: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      const response = await updateSupplierStatus(id, { status: newStatus, rejectionReason: reason });
      setSupplier(prev => prev ? { ...prev, ...response.data } : null);
      addToast(`Supplier ${newStatus.toLowerCase()} successfully`, 'success');
    } catch (error: any) {
      addToast(error.response?.data?.message || 'Failed to update supplier status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) return;
    await handleUpdateSupplierStatus('Rejected', rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  const handleConfirmBlacklist = async () => {
    if (!blacklistReason.trim()) return;
    await handleUpdateSupplierStatus('Blacklisted', blacklistReason);
    setShowBlacklistModal(false);
    setBlacklistReason('');
  };

  const viewDocument = async (doc: Document) => {
    if (!doc.fileName || !supplier?.id) { addToast(`View not available for ${doc.name}`, 'info'); return; }
    setDownloading(doc.name);
    try {
      const blob = await fetchDocument(supplier.id, doc.fileName);
      const url  = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      addToast(`Opening ${doc.name}...`, 'success');
    } catch {
      addToast('Failed to open document. Please try again.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const getStatusColor = (statusInfo?: Document['statusInfo']) => {
    if (!statusInfo) return 'text-muted-foreground';
    switch (statusInfo.color) {
      case 'red':    return 'text-red-500';
      case 'yellow': return 'text-yellow-500';
      case 'blue':   return 'text-blue-500';
      case 'green':  return 'text-green-500';
      default:       return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (statusInfo?: Document['statusInfo']) => {
    if (!statusInfo) return <Clock size={12} />;
    switch (statusInfo.status) {
      case 'expired': case 'critical': return <AlertTriangle size={12} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={12} className="text-yellow-500" />;
      case 'valid':   return <CheckCircle size={12} className="text-green-500" />;
      default:        return <Clock size={12} />;
    }
  };

  if (loading) return (
    <PortalLayout type="admin" title="Loading..." breadcrumb={['Admin', 'Suppliers', id || '']}>
      <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </PortalLayout>
  );

  if (!supplier) return (
    <PortalLayout type="admin" title="Not Found" breadcrumb={['Admin', 'Suppliers']}>
      <EmptyState title="Supplier Not Found" description="The supplier doesn't exist." />
    </PortalLayout>
  );

  const statusBanner: Record<string, string> = {
    Approved:    'bg-success/10 border-success/30 text-success',
    Pending:     'bg-warning/10 border-warning/30 text-warning',
    Rejected:    'bg-destructive/10 border-destructive/30 text-destructive',
    Blacklisted: 'bg-red-900/20 border-red-800/30 text-red-300',
  };

  const getDisplayValue = (obj: any, fallback = '—'): string => {
    if (!obj) return fallback;
    return obj.name || obj || fallback;
  };

  const pendingDocuments   = supplier.documents?.filter(d => d.status === 'Pending') || [];
  const expiredDocuments   = supplier.documents?.filter(d => d.statusInfo?.status === 'expired') || [];
  const expiringDocuments  = supplier.documents?.filter(d => d.statusInfo?.status === 'critical' || d.statusInfo?.status === 'warning') || [];
  const verifiedDocuments  = supplier.documents?.filter(d =>
    d.status === 'Verified' &&
    d.statusInfo?.status !== 'expired' &&
    d.statusInfo?.status !== 'critical' &&
    d.statusInfo?.status !== 'warning'
  ) || [];

  return (
    <PortalLayout type="admin" title={supplier.companyName} breadcrumb={['Admin', 'Suppliers', supplier.id]}>
      <div className="space-y-6 animate-fade-in">

        {/* Status Banner */}
        <div className={`p-4 rounded-xl border ${statusBanner[supplier.status] || 'bg-muted/30'}`}>
          <span className="font-semibold">Account Status: {supplier.status}</span>
          {supplier.rejectionReason && <p className="text-sm mt-1 opacity-80">{supplier.rejectionReason}</p>}
        </div>

        {/* Actions */}
        {supplier.status === 'Pending' && (
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleUpdateSupplierStatus('Approved')}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <CheckCircle size={16} /> {updating ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => { setRejectionReason(''); setShowRejectModal(true); }}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <XCircle size={16} /> Reject
            </button>
          </div>
        )}

        {/* Blacklist button for Approved suppliers */}
        {supplier.status === 'Approved' && (
          <div className="flex gap-3">
            <button
              onClick={() => { setBlacklistReason(''); setShowBlacklistModal(true); }}
              disabled={updating}
              className="flex items-center gap-2 px-4 py-2 bg-red-900 text-red-100 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-800 transition-colors"
            >
              <XCircle size={16} /> Blacklist Supplier
            </button>
          </div>
        )}

        {/* Document Warning Banner */}
        {(pendingDocuments.length > 0 || expiredDocuments.length > 0 || expiringDocuments.length > 0) && (
          <div className="p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <AlertTriangle size={20} />
              <span className="font-semibold">Document Attention Required</span>
            </div>
            <div className="space-y-1 text-sm">
              {pendingDocuments.length > 0  && <p>📄 {pendingDocuments.length} document(s) pending verification</p>}
              {expiredDocuments.length > 0  && <p>⚠️ {expiredDocuments.length} document(s) have EXPIRED</p>}
              {expiringDocuments.length > 0 && <p>🔔 {expiringDocuments.length} document(s) are expiring soon</p>}
            </div>
          </div>
        )}

        {/* Company & Contact Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Company Information</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Company Name',            supplier.companyName],
                ['Registration Number',     supplier.registrationNumber],
                ['TIN',                     supplier.tin],
                ['Company Type',            getDisplayValue(supplier.companyType)],
                ['Date of Incorporation',   formatDate(supplier.dateOfIncorporation)],
                ['Country of Incorporation',supplier.countryOfIncorporation],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Contact Information</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Contact Person', supplier.contactPerson],
                ['Designation',    supplier.designation],
                ['Email',          supplier.email],
                ['Phone',          supplier.phone],
                ['Address',        supplier.address],
                ['Location',       [getDisplayValue(supplier.region), getDisplayValue(supplier.country)].filter(v => v !== '—').join(', ')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Categories & Documents */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Business Categories</h3>
            <div className="flex flex-wrap gap-2">
              {supplier.categories?.length > 0 ? (
                supplier.categories.map(cat => (
                  <span key={cat.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{cat.name}</span>
                ))
              ) : (
                <span className="text-muted-foreground">No categories selected</span>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Documents</h3>
              <Link to={`/admin/suppliers/${supplier.id}/documents`} className="text-xs text-primary hover:underline">
                Manage All Documents →
              </Link>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingDocuments.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <RefreshCw size={12} className="text-yellow-500 shrink-0" />
                    <StatusBadge status={d.status} />
                    <span className="text-sm">{d.name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(d.uploadDate)}</span>
                    {d.isRenewal && <span className="text-xs text-blue-500">(Renewal)</span>}
                  </div>
                  <button onClick={() => viewDocument(d)} disabled={downloading === d.name} className="text-primary p-1.5 rounded hover:bg-muted/50 shrink-0">
                    {downloading === d.name ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  </button>
                </div>
              ))}

              {[...expiredDocuments, ...expiringDocuments].map((d, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${d.statusInfo?.status === 'expired' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    {getStatusIcon(d.statusInfo)}
                    <StatusBadge status={d.status} />
                    <span className="text-sm">{d.name}</span>
                    {d.expiryDate && (
                      <span className={`text-xs ${getStatusColor(d.statusInfo)}`}>
                        Expires: {formatDate(d.expiryDate)}
                        {d.statusInfo?.daysRemaining != null && (
                          <span> ({Math.abs(d.statusInfo.daysRemaining)} days {d.statusInfo.daysRemaining < 0 ? 'ago' : 'left'})</span>
                        )}
                      </span>
                    )}
                  </div>
                  <button onClick={() => viewDocument(d)} disabled={downloading === d.name} className="text-primary p-1.5 rounded hover:bg-muted/50 shrink-0">
                    {downloading === d.name ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  </button>
                </div>
              ))}

              {verifiedDocuments.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <StatusBadge status={d.status} />
                    <span className="text-sm">{d.name}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(d.uploadDate)}</span>
                    {d.expiryDate && <span className={`text-xs ${getStatusColor(d.statusInfo)}`}>Expires: {formatDate(d.expiryDate)}</span>}
                  </div>
                  <button onClick={() => viewDocument(d)} disabled={downloading === d.name} className="text-primary p-1.5 rounded hover:bg-muted/50 shrink-0">
                    {downloading === d.name ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  </button>
                </div>
              ))}

              {supplier.documents?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>

        {/* Bid History */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="font-bold">Bid History</h3></div>
          {supplierBids.length === 0 ? (
            <EmptyState title="No Bids" description="This supplier hasn't submitted any bids yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Bid Ref', 'Tender', 'Date', 'Amount', 'Status'].map(h => (
                      <th key={h} className={`p-3 font-medium text-muted-foreground ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierBids.map(b => {
                    const tender = tenders.find(t => t.id === b.tenderId);
                    return (
                      <tr key={b.id} className="border-b border-border/50 cursor-pointer hover:bg-muted/20" onClick={() => navigate(`/admin/tenders/${b.tenderId}`)}>
                        <td className="p-3 font-mono text-xs">{b.id}</td>
                        <td className="p-3">{tender?.title || b.tenderId}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(b.submittedDate)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(b.grandTotal)}</td>
                        <td className="p-3"><StatusBadge status={b.status as any} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">Reject Supplier</h2>
              <button onClick={() => setShowRejectModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Rejecting: <span className="font-semibold text-foreground">{supplier.companyName}</span>
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Rejection Reason <span className="text-destructive">*</span></label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Explain why this supplier is being rejected..."
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim() || updating}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold text-red-400">Blacklist Supplier</h2>
              <button onClick={() => setShowBlacklistModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 font-medium">⚠️ This action will prevent the supplier from accessing the platform.</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Blacklisting: <span className="font-semibold text-foreground">{supplier.companyName}</span>
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Reason <span className="text-destructive">*</span></label>
                <textarea
                  value={blacklistReason}
                  onChange={e => setBlacklistReason(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Explain why this supplier is being blacklisted..."
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setShowBlacklistModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
              <button
                onClick={handleConfirmBlacklist}
                disabled={!blacklistReason.trim() || updating}
                className="flex items-center gap-2 px-4 py-2 bg-red-900 text-red-100 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-800"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Blacklist
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}