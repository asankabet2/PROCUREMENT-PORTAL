import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import {
  Eye, Loader2, FileText, AlertTriangle, Clock,
  XCircle, CheckCircle, ArrowLeft, RefreshCw, Briefcase, ShieldCheck
} from 'lucide-react';
import {
  getSupplierById, getSupplierDocuments, verifyDocument,
  fetchDocument, verifyExperience, getSupplierExperienceDocuments,
} from '@/services/api';

interface Document {
  name: string; fileName: string; docType: string;
  status: 'Verified' | 'Pending' | 'Replaced' | 'Expired' | 'Rejected';
  uploadDate: string; expiryDate?: string; requiresExpiry?: boolean;
  isRenewal?: boolean; replacedAt?: string;
  statusInfo?: { status: string; daysRemaining: number | null; label: string; color: string; };
}

interface ExperienceDocument {
  company: string; fileName: string; uploadDate: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  index: number;
}

interface Supplier {
  id: string; companyName: string; email: string;
  contactPerson: string; phone: string; status: string;
  documents: Document[]; experienceDocuments: ExperienceDocument[];
}

// Confirm dialog for bulk verify
interface BulkConfirmState {
  type: 'documents' | 'experiences';
  items: string[]; // names/companies to display
}

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

export default function AdminSupplierDocuments() {
  const { supplierId } = useParams();
  const navigate       = useNavigate();
  const { addToast }   = useNotification();

  const [supplier, setSupplier]                   = useState<Supplier | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');
  const [verifying, setVerifying]                 = useState<string | null>(null);
  const [bulkVerifying, setBulkVerifying]         = useState(false);
  const [rejectionReason, setRejectionReason]     = useState('');
  const [showRejectModal, setShowRejectModal]     = useState(false);
  const [selectedDoc, setSelectedDoc]             = useState<Document | null>(null);
  const [showExpRejectModal, setShowExpRejectModal] = useState(false);
  const [selectedExp, setSelectedExp]             = useState<ExperienceDocument | null>(null);
  const [bulkConfirm, setBulkConfirm]             = useState<BulkConfirmState | null>(null);

  useEffect(() => { fetchSupplierData(); }, [supplierId]);

  const fetchSupplierData = async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const supplierData = (await getSupplierById(supplierId)).data;
      let documents = (await getSupplierDocuments(supplierId)).data || [];
      documents = documents.map((doc: Document) => ({ ...doc, statusInfo: calculateDocumentStatus(doc) }));

      let expDocs: ExperienceDocument[] = [];
      try {
        const expRes = await getSupplierExperienceDocuments(supplierId);
        expDocs = expRes.data.map((exp: Omit<ExperienceDocument, 'index'>, i: number) => ({ ...exp, index: i }));
      } catch (err) {
        console.error('Error fetching experience docs:', err);
      }

      setSupplier({ ...supplierData, documents, experienceDocuments: expDocs });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (doc: Document, status: 'Verified' | 'Rejected') => {
    if (!supplierId) return;
    setVerifying(doc.docType);
    try {
      await verifyDocument(supplierId, doc.docType, {
        status, rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
      });
      addToast(`Document ${status.toLowerCase()} successfully`, 'success');
      await fetchSupplierData();
      setShowRejectModal(false); setRejectionReason(''); setSelectedDoc(null);
    } catch (error: any) {
      addToast(error.response?.data?.message || 'Failed to verify document', 'error');
    } finally {
      setVerifying(null);
    }
  };

  const handleVerifyExperience = async (exp: ExperienceDocument, status: 'Verified' | 'Rejected') => {
    if (!supplierId) return;
    setVerifying(`exp-${exp.index}`);
    try {
      await verifyExperience(supplierId, exp.index, {
        status, rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
      });
      addToast(`Experience ${status.toLowerCase()} successfully`, 'success');
      await fetchSupplierData();
      setShowExpRejectModal(false); setRejectionReason(''); setSelectedExp(null);
    } catch (error: any) {
      addToast(error.response?.data?.message || 'Failed to verify experience', 'error');
    } finally {
      setVerifying(null);
    }
  };

  // Bulk verify all pending documents
  const handleBulkVerifyDocuments = async () => {
    if (!supplierId || !supplier) return;
    const pending = supplier.documents.filter(d => d.status === 'Pending');
    setBulkConfirm({ type: 'documents', items: pending.map(d => d.name) });
  };

  const confirmBulkVerifyDocuments = async () => {
    if (!supplierId || !supplier) return;
    setBulkConfirm(null);
    setBulkVerifying(true);
    const pending = supplier.documents.filter(d => d.status === 'Pending');
    const failed: string[] = [];

    for (const doc of pending) {
      try {
        await verifyDocument(supplierId, doc.docType, { status: 'Verified' });
      } catch (error: any) {
        failed.push(doc.name);
        console.error(`Failed to verify "${doc.name}":`, error);
      }
    }

    await fetchSupplierData();
    setBulkVerifying(false);

    if (failed.length === 0) {
      addToast(`${pending.length} document(s) verified successfully`, 'success');
    } else if (failed.length === pending.length) {
      addToast('All documents failed to verify. Please try again.', 'error');
    } else {
      addToast(`${pending.length - failed.length} verified. Failed: ${failed.join(', ')}`, 'error');
    }
  };
  
  // Bulk verify all pending experiences
  const handleBulkVerifyExperiences = async () => {
    if (!supplierId || !supplier) return;
    const pending = supplier.experienceDocuments.filter(e => e.status === 'Pending');
    setBulkConfirm({ type: 'experiences', items: pending.map(e => e.company) });
  };

  const confirmBulkVerifyExperiences = async () => {
    if (!supplierId || !supplier) return;
    setBulkConfirm(null);
    setBulkVerifying(true);
    const pending = supplier.experienceDocuments.filter(e => e.status === 'Pending');
    const failed: string[] = [];

    for (const exp of pending) {
      try {
        await verifyExperience(supplierId, exp.index, { status: 'Verified' });
      } catch (error: any) {
        failed.push(exp.company);
        console.error(`Failed to verify experience "${exp.company}":`, error);
      }
    }

    await fetchSupplierData();
    setBulkVerifying(false);

    if (failed.length === 0) {
      addToast(`${pending.length} experience(s) verified successfully`, 'success');
    } else if (failed.length === pending.length) {
      addToast('All experiences failed to verify. Please try again.', 'error');
    } else {
      addToast(`${pending.length - failed.length} verified. Failed: ${failed.join(', ')}`, 'error');
    }
  };

  const viewDocument = async (fileName: string) => {
    if (!supplierId) return;
    try {
      const blob = await fetchDocument(supplierId, fileName);
      const url  = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch {
      addToast('Failed to open document', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired': case 'critical': return 'text-red-500';
      case 'warning':  return 'text-yellow-500';
      case 'valid':    return 'text-green-500';
      default:         return 'text-gray-500';
    }
  };

  const getStatusIcon = (statusInfo?: Document['statusInfo']) => {
    if (!statusInfo) return <Clock size={14} />;
    switch (statusInfo.status) {
      case 'expired': case 'critical': return <AlertTriangle size={14} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'valid':   return <CheckCircle size={14} className="text-green-500" />;
      default:        return <Clock size={14} />;
    }
  };

  if (loading) return (
    <PortalLayout type="admin" title="Supplier Documents" breadcrumb={['Admin', 'Suppliers', supplierId || '', 'Documents']}>
      <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </PortalLayout>
  );

  if (error || !supplier) return (
    <PortalLayout type="admin" title="Supplier Documents" breadcrumb={['Admin', 'Suppliers', supplierId || '', 'Documents']}>
      <div className="text-center py-12 text-destructive">{error || 'Supplier not found'}</div>
    </PortalLayout>
  );

  const pendingDocuments    = supplier.documents.filter(d => d.status === 'Pending');
  const verifiedDocuments   = supplier.documents.filter(d => d.status === 'Verified');
  const replacedDocuments   = supplier.documents.filter(d => d.status === 'Replaced');
  const pendingExperiences  = supplier.experienceDocuments.filter(e => e.status === 'Pending');
  const verifiedExperiences = supplier.experienceDocuments.filter(e => e.status === 'Verified');

  return (
    <PortalLayout
      type="admin"
      title={`Documents - ${supplier.companyName}`}
      breadcrumb={['Admin', 'Suppliers', supplier.companyName, 'Documents']}
    >
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <button onClick={() => navigate('/admin/suppliers')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to Suppliers
        </button>

        {/* Supplier Summary */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-2">{supplier.companyName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Contact Person</p><p>{supplier.contactPerson || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Email</p><p>{supplier.email}</p></div>
            <div><p className="text-xs text-muted-foreground">Phone</p><p>{supplier.phone || '—'}</p></div>
          </div>
        </div>

        {/* Pending Documents */}
        {pendingDocuments.length > 0 && (
          <div className="glass-card overflow-hidden border-yellow-500/30">
            <div className="p-4 border-b border-border bg-yellow-500/5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-yellow-600 flex items-center gap-2"><Clock size={16} />Pending Verification ({pendingDocuments.length})</h3>
                <p className="text-xs text-muted-foreground mt-1">Review these documents and verify or reject them</p>
              </div>
              {/* Verify All — only show when 2+ pending */}
              {pendingDocuments.length >= 2 && (
                <button
                  onClick={handleBulkVerifyDocuments}
                  disabled={bulkVerifying}
                  className="flex items-center gap-2 px-3 py-1.5 bg-success text-success-foreground text-sm rounded-lg hover:bg-success/80 disabled:opacity-50 transition-colors"
                >
                  {bulkVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Verify All ({pendingDocuments.length})
                </button>
              )}
            </div>
            {pendingDocuments.map((doc, idx) => (
              <DocumentReviewRow
                key={`${doc.docType}-${idx}`}
                doc={doc} verifying={verifying}
                onView={viewDocument}
                onVerify={() => handleVerifyDocument(doc, 'Verified')}
                onReject={() => { setSelectedDoc(doc); setShowRejectModal(true); }}
                getStatusColor={getStatusColor} getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        )}

        {/* Verified Documents */}
        {verifiedDocuments.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold flex items-center gap-2 text-green-600"><CheckCircle size={16} />Verified Documents ({verifiedDocuments.length})</h3>
            </div>
            {verifiedDocuments.map((doc, idx) => (
              <DocumentViewRow key={`${doc.docType}-${idx}`} doc={doc} onView={viewDocument} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            ))}
          </div>
        )}

        {/* Replaced Documents */}
        {replacedDocuments.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold flex items-center gap-2 text-muted-foreground"><RefreshCw size={16} />Replaced Documents (History)</h3>
              <p className="text-xs text-muted-foreground mt-1">These documents have been replaced by newer versions</p>
            </div>
            {replacedDocuments.map((doc, idx) => (
              <DocumentViewRow key={`${doc.docType}-${idx}`} doc={doc} onView={viewDocument} getStatusColor={getStatusColor} getStatusIcon={getStatusIcon} />
            ))}
          </div>
        )}

        {/* Pending Experience Proofs */}
        {pendingExperiences.length > 0 && (
          <div className="glass-card overflow-hidden border-yellow-500/30">
            <div className="p-4 border-b border-border bg-yellow-500/5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-yellow-600 flex items-center gap-2"><Briefcase size={16} />Experience Proofs Pending ({pendingExperiences.length})</h3>
                <p className="text-xs text-muted-foreground mt-1">Verify or reject submitted experience proof documents</p>
              </div>
              {/* Verify All experiences — only show when 2+ pending */}
              {pendingExperiences.length >= 2 && (
                <button
                  onClick={handleBulkVerifyExperiences}
                  disabled={bulkVerifying}
                  className="flex items-center gap-2 px-3 py-1.5 bg-success text-success-foreground text-sm rounded-lg hover:bg-success/80 disabled:opacity-50 transition-colors"
                >
                  {bulkVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Verify All ({pendingExperiences.length})
                </button>
              )}
            </div>
            {pendingExperiences.map(exp => (
              <ExperienceDocRow
                key={exp.index} exp={exp} verifying={verifying}
                onView={viewDocument}
                onVerify={() => handleVerifyExperience(exp, 'Verified')}
                onReject={() => { setSelectedExp(exp); setShowExpRejectModal(true); }}
              />
            ))}
          </div>
        )}

        {/* Verified Experience Proofs */}
        {verifiedExperiences.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold flex items-center gap-2 text-green-600"><Briefcase size={16} />Verified Experience Proofs ({verifiedExperiences.length})</h3>
            </div>
            {verifiedExperiences.map(exp => (
              <ExperienceDocRow key={exp.index} exp={exp} verifying={null} onView={viewDocument} />
            ))}
          </div>
        )}

        {/* No Documents */}
        {supplier.documents.length === 0 && supplier.experienceDocuments.length === 0 && (
          <div className="glass-card p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No documents uploaded by this supplier.</p>
          </div>
        )}
      </div>

      {/* Bulk Confirm Dialog */}
      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShieldCheck size={18} className="text-success" />
                Verify All {bulkConfirm.type === 'documents' ? 'Documents' : 'Experiences'}
              </h2>
              <button onClick={() => setBulkConfirm(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                The following {bulkConfirm.items.length} item(s) will be marked as <span className="text-success font-medium">Verified</span>:
              </p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {bulkConfirm.items.map((name, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={13} className="text-success shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">This action cannot be undone. Documents that need rejection should be handled individually.</p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button onClick={() => setBulkConfirm(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
              <button
                onClick={bulkConfirm.type === 'documents' ? confirmBulkVerifyDocuments : confirmBulkVerifyExperiences}
                className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium"
              >
                <ShieldCheck size={14} /> Confirm Verify All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Reject Modal */}
      {showRejectModal && selectedDoc && (
        <RejectModal
          title="Reject Document" subject={selectedDoc.name}
          reason={rejectionReason} onReasonChange={setRejectionReason}
          onCancel={() => { setShowRejectModal(false); setSelectedDoc(null); setRejectionReason(''); }}
          onConfirm={() => handleVerifyDocument(selectedDoc, 'Rejected')}
        />
      )}

      {/* Experience Reject Modal */}
      {showExpRejectModal && selectedExp && (
        <RejectModal
          title="Reject Experience Proof" subject={selectedExp.company}
          reason={rejectionReason} onReasonChange={setRejectionReason}
          onCancel={() => { setShowExpRejectModal(false); setSelectedExp(null); setRejectionReason(''); }}
          onConfirm={() => handleVerifyExperience(selectedExp, 'Rejected')}
        />
      )}
    </PortalLayout>
  );
}

// ── Shared Reject Modal ───────────────────────────────────────────────────────
function RejectModal({ title, subject, reason, onReasonChange, onCancel, onConfirm }: {
  title: string; subject: string; reason: string;
  onReasonChange: (v: string) => void; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm">Rejecting: <span className="font-bold">{subject}</span></p>
          <div>
            <label className="block text-sm font-medium mb-2">Rejection Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => onReasonChange(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary"
              placeholder="Explain why this is being rejected..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
          <button onClick={onConfirm} disabled={!reason.trim()} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm disabled:opacity-50">Confirm Rejection</button>
        </div>
      </div>
    </div>
  );
}

// ── Document Review Row ───────────────────────────────────────────────────────
function DocumentReviewRow({ doc, verifying, onView, onVerify, onReject, getStatusColor, getStatusIcon }: {
  doc: Document; verifying: string | null;
  onView: (f: string) => void; onVerify: () => void; onReject: () => void;
  getStatusColor: (s: string) => string; getStatusIcon: (s?: Document['statusInfo']) => React.ReactNode;
}) {
  const isVerifying = verifying === doc.docType;
  return (
    <div className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status="Pending" />
            {doc.isRenewal && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded-full flex items-center gap-1"><RefreshCw size={10} /> Renewal</span>}
          </div>
          <p className="font-medium">{doc.name}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span>Uploaded: {formatDate(doc.uploadDate)}</span>
            {doc.expiryDate && (
              <span className={`flex items-center gap-1 ${getStatusColor(doc.statusInfo?.status || '')}`}>
                {getStatusIcon(doc.statusInfo)} Expires: {formatDate(doc.expiryDate)}
                {doc.statusInfo?.daysRemaining != null && <span>({doc.statusInfo.daysRemaining} days remaining)</span>}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onView(doc.fileName)} className="flex items-center gap-1 px-3 py-1.5 bg-muted/50 hover:bg-muted text-sm rounded-lg transition-colors"><Eye size={14} /> View</button>
          <button onClick={onVerify} disabled={isVerifying} className="flex items-center gap-1 px-3 py-1.5 bg-success text-success-foreground text-sm rounded-lg hover:bg-success/80 disabled:opacity-50">
            {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Verify
          </button>
          <button onClick={onReject} disabled={isVerifying} className="flex items-center gap-1 px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/80 disabled:opacity-50">
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document View Row ─────────────────────────────────────────────────────────
function DocumentViewRow({ doc, onView, getStatusColor, getStatusIcon }: {
  doc: Document; onView: (f: string) => void;
  getStatusColor: (s: string) => string; getStatusIcon: (s?: Document['statusInfo']) => React.ReactNode;
}) {
  const isExpired  = doc.statusInfo?.status === 'expired';
  const isExpiring = doc.statusInfo?.status === 'critical' || doc.statusInfo?.status === 'warning';
  return (
    <div className={`p-4 border-b border-border/50 last:border-0 ${isExpired ? 'bg-red-500/5' : isExpiring ? 'bg-yellow-500/5' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={doc.status} />
            {doc.isRenewal && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded-full flex items-center gap-1"><RefreshCw size={10} /> Renewal</span>}
          </div>
          <p className="font-medium">{doc.name}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span>Uploaded: {formatDate(doc.uploadDate)}</span>
            {doc.expiryDate && (
              <span className={`flex items-center gap-1 ${getStatusColor(doc.statusInfo?.status || '')}`}>
                {getStatusIcon(doc.statusInfo)} Expires: {formatDate(doc.expiryDate)}
                {doc.statusInfo?.daysRemaining != null && (
                  <span className="font-medium">
                    ({doc.statusInfo.daysRemaining < 0 ? `Expired ${Math.abs(doc.statusInfo.daysRemaining)} days ago` : `${doc.statusInfo.daysRemaining} days remaining`})
                  </span>
                )}
              </span>
            )}
            {doc.replacedAt && <span>Replaced on: {formatDate(doc.replacedAt)}</span>}
          </div>
        </div>
        <button onClick={() => onView(doc.fileName)} className="flex items-center gap-1 px-3 py-1.5 bg-muted/50 hover:bg-muted text-sm rounded-lg transition-colors"><Eye size={14} /> View</button>
      </div>
    </div>
  );
}

// ── Experience Doc Row ────────────────────────────────────────────────────────
function ExperienceDocRow({ exp, verifying, onView, onVerify, onReject }: {
  exp: ExperienceDocument; verifying: string | null;
  onView: (f: string) => void; onVerify?: () => void; onReject?: () => void;
}) {
  const isPending   = exp.status === 'Pending';
  const isVerifying = verifying === `exp-${exp.index}`;
  return (
    <div className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1"><StatusBadge status={exp.status} /></div>
          <p className="font-medium">{exp.company}</p>
          <p className="text-xs text-muted-foreground mt-1">Uploaded: {formatDate(exp.uploadDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onView(exp.fileName)} className="flex items-center gap-1 px-3 py-1.5 bg-muted/50 hover:bg-muted text-sm rounded-lg transition-colors"><Eye size={14} /> View proof</button>
          {isPending && onVerify && (
            <button onClick={onVerify} disabled={isVerifying} className="flex items-center gap-1 px-3 py-1.5 bg-success text-success-foreground text-sm rounded-lg hover:bg-success/80 disabled:opacity-50">
              {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Verify
            </button>
          )}
          {isPending && onReject && (
            <button onClick={onReject} disabled={isVerifying} className="flex items-center gap-1 px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/80 disabled:opacity-50">
              <XCircle size={14} /> Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}