import { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import { getSupplierById, getSupplierDocuments, renewDocument, fetchDocument } from '@/services/api';
import { Eye, Loader2, FileText, AlertTriangle, RefreshCw, Clock, CheckCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'valid' | 'permanent';

interface Document {
  name: string;
  fileName: string;
  docType?: string;
  status: 'Verified' | 'Pending' | 'Replaced' | 'Expired';
  uploadDate: string;
  expiryDate?: string;
  requiresExpiry?: boolean;
  canRenew?: boolean;
}

interface Supplier {
  id: string;
  companyName: string;
  documents: Document[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute expiry status purely from the document data.
 * The backend does NOT return a statusInfo object, so we derive it here.
 */
function getExpiryStatus(doc: Document): ExpiryStatus {
  if (!doc.requiresExpiry || !doc.expiryDate) return 'permanent';
  const days = Math.ceil(
    (new Date(doc.expiryDate).getTime() - Date.now()) / 86_400_000
  );
  if (days < 0)   return 'expired';
  if (days <= 7)  return 'critical';
  if (days <= 30) return 'warning';
  return 'valid';
}

function getDaysRemaining(doc: Document): number | null {
  if (!doc.requiresExpiry || !doc.expiryDate) return null;
  return Math.ceil(
    (new Date(doc.expiryDate).getTime() - Date.now()) / 86_400_000
  );
}

function getExpiryColor(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':  return 'text-red-500';
    case 'critical': return 'text-red-500';
    case 'warning':  return 'text-yellow-500';
    case 'valid':    return 'text-green-500';
    default:         return 'text-muted-foreground';
  }
}

function getExpiryIcon(status: ExpiryStatus) {
  switch (status) {
    case 'expired':  return <AlertTriangle size={14} className="text-red-500" />;
    case 'critical': return <AlertTriangle size={14} className="text-red-500" />;
    case 'warning':  return <AlertTriangle size={14} className="text-yellow-500" />;
    case 'valid':    return <CheckCircle   size={14} className="text-green-500" />;
    default:         return <Clock         size={14} className="text-muted-foreground" />;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SupplierDocuments() {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [renewingDoc, setRenewingDoc] = useState<string | null>(null);
  const [renewalFile, setRenewalFile] = useState<File | null>(null);
  const [renewalExpiryDate, setRenewalExpiryDate] = useState<string>('');
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [supplierRes, docsRes] = await Promise.all([
          getSupplierById(user.id),
          getSupplierDocuments(user.id),
        ]);
        setSupplier({
          ...supplierRes.data,
          documents: docsRes.data || [],
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user?.id]);

  // ── Refresh documents only (used after renewal) ───────────────────────────
  const refreshDocuments = async () => {
    if (!user?.id) return;
    try {
      const docsRes = await getSupplierDocuments(user.id);
      setSupplier(prev => prev ? { ...prev, documents: docsRes.data || [] } : null);
    } catch (err) {
      console.error('Error refreshing documents:', err);
    }
  };

  // ── View document ─────────────────────────────────────────────────────────
  const handleView = async (doc: Document) => {
    if (!doc.fileName) {
      addToast('Document path not found. Please contact support.', 'error');
      return;
    }
    setViewingDoc(doc.fileName);
    try {
      const cleanFileName = doc.fileName.includes('/')
        ? doc.fileName.split('/').pop()!
        : doc.fileName;

      // fetchDocument from api.ts → GET /api/suppliers/:supplierId/documents/:fileName
      const blob = await fetchDocument(user!.id, cleanFileName);
      const url  = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Error viewing document:', err);
      addToast('Could not open document. Please try again.', 'error');
    } finally {
      setViewingDoc(null);
    }
  };

  // ── Open renewal modal ────────────────────────────────────────────────────
  const handleRenew = (doc: Document) => {
    setSelectedDocument(doc);
    setRenewalFile(null);
    setRenewalExpiryDate('');
    setShowRenewalModal(true);
  };

  // ── Submit renewal ────────────────────────────────────────────────────────
  const handleRenewalSubmit = async () => {
    if (!selectedDocument || !renewalFile) {
      addToast('Please select a file to upload', 'error');
      return;
    }
    if (selectedDocument.requiresExpiry && !renewalExpiryDate) {
      addToast('Please enter the expiry date', 'error');
      return;
    }
    if (!selectedDocument.docType) {
      addToast('Document type is missing. Please contact support.', 'error');
      return;
    }

    setRenewingDoc(selectedDocument.name);
    try {
      const formData = new FormData();
      formData.append('document', renewalFile);
      if (renewalExpiryDate) formData.append('expiryDate', renewalExpiryDate);

      // renewDocument from api.ts → POST /api/suppliers/:supplierId/documents/:docType/renew
      await renewDocument(user!.id, selectedDocument.docType, formData);

      addToast('Document renewed successfully!', 'success');
      setShowRenewalModal(false);
      await refreshDocuments();
    } catch (err: any) {
      console.error('Error renewing document:', err);
      addToast(err.response?.data?.message || 'Failed to renew document. Please try again.', 'error');
    } finally {
      setRenewingDoc(null);
    }
  };

  // ── Loading / error / empty states ────────────────────────────────────────

  if (loading) {
    return (
      <PortalLayout type="supplier" title="Documents" breadcrumb={['Supplier', 'Documents']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout type="supplier" title="Documents" breadcrumb={['Supplier', 'Documents']}>
        <div className="text-center py-12 text-destructive">{error}</div>
      </PortalLayout>
    );
  }

  if (!supplier || !supplier.documents || supplier.documents.length === 0) {
    return (
      <PortalLayout type="supplier" title="Documents" breadcrumb={['Supplier', 'Documents']}>
        <div className="glass-card p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No documents uploaded yet.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Documents will appear here after you upload them during registration.
          </p>
        </div>
      </PortalLayout>
    );
  }

  // ── Categorise using computed expiry status ───────────────────────────────

  const expiredDocuments  = supplier.documents.filter(d => getExpiryStatus(d) === 'expired');
  const expiringDocuments = supplier.documents.filter(d =>
    getExpiryStatus(d) === 'critical' || getExpiryStatus(d) === 'warning'
  );
  const validDocuments    = supplier.documents.filter(d =>
    getExpiryStatus(d) === 'valid' || getExpiryStatus(d) === 'permanent'
  );

  return (
    <PortalLayout type="supplier" title="Documents" breadcrumb={['Supplier', 'Documents']}>
      <div className="space-y-6 animate-fade-in max-w-3xl">

        {/* Warning banner */}
        {(expiringDocuments.length > 0 || expiredDocuments.length > 0) && (
          <div className="p-4 rounded-xl border bg-yellow-500/10 border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <AlertTriangle size={20} />
              <span className="font-semibold">Document Renewal Required</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {expiredDocuments.length > 0 && (
                <span className="block">
                  ⚠️ {expiredDocuments.length} document(s) have EXPIRED. Please renew immediately.
                </span>
              )}
              {expiringDocuments.length > 0 && (
                <span className="block">
                  ⚠️ {expiringDocuments.length} document(s) are expiring soon. Please renew to maintain your active status.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Expired */}
        {expiredDocuments.length > 0 && (
          <div className="glass-card overflow-hidden border-red-500/30">
            <div className="p-4 border-b border-border bg-red-500/5">
              <h3 className="font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle size={16} />
                Expired Documents (Renew Immediately)
              </h3>
            </div>
            {expiredDocuments.map((doc, i) => (
              <DocumentRow
                key={i}
                doc={doc}
                viewingDoc={viewingDoc}
                renewingDoc={renewingDoc}
                onView={handleView}
                onRenew={handleRenew}
              />
            ))}
          </div>
        )}

        {/* Expiring soon */}
        {expiringDocuments.length > 0 && (
          <div className="glass-card overflow-hidden border-yellow-500/30">
            <div className="p-4 border-b border-border bg-yellow-500/5">
              <h3 className="font-bold text-yellow-600 flex items-center gap-2">
                <AlertTriangle size={16} />
                Expiring Soon (Renew Recommended)
              </h3>
            </div>
            {expiringDocuments.map((doc, i) => (
              <DocumentRow
                key={i}
                doc={doc}
                viewingDoc={viewingDoc}
                renewingDoc={renewingDoc}
                onView={handleView}
                onRenew={handleRenew}
              />
            ))}
          </div>
        )}

        {/* Valid */}
        {validDocuments.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                Valid Documents
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                These documents are currently valid
              </p>
            </div>
            {validDocuments.map((doc, i) => (
              <DocumentRow
                key={i}
                doc={doc}
                viewingDoc={viewingDoc}
                renewingDoc={renewingDoc}
                onView={handleView}
                onRenew={handleRenew}
              />
            ))}
          </div>
        )}

        {/* Renewal modal */}
        {showRenewalModal && selectedDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-bold">Renew Document</h2>
                <button
                  onClick={() => setShowRenewalModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Document: <span className="font-bold">{selectedDocument.name}</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Current version uploaded: {formatDate(selectedDocument.uploadDate)}
                  </p>
                  {selectedDocument.expiryDate && (
                    <p className="text-xs text-red-500 mt-1">
                      Current expiry date: {formatDate(selectedDocument.expiryDate)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Document File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setRenewalFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5MB. PDF, JPEG, PNG, or DOC files only.
                  </p>
                </div>

                {selectedDocument.requiresExpiry && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      New Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={renewalExpiryDate}
                      onChange={(e) => setRenewalExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the expiry date shown on the new certificate
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-border">
                <button
                  onClick={() => setShowRenewalModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenewalSubmit}
                  disabled={
                    !renewalFile ||
                    (selectedDocument.requiresExpiry && !renewalExpiryDate) ||
                    renewingDoc === selectedDocument.name
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
                >
                  {renewingDoc === selectedDocument.name ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Submit Renewal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Document Validity:</strong> Documents with expiry dates will show their remaining
            validity. You will receive notifications 30, 15, and 7 days before expiry. Please ensure
            all documents remain valid to maintain your active supplier status.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}

// ── Document Row ──────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  viewingDoc,
  renewingDoc,
  onView,
  onRenew,
}: {
  doc: Document;
  viewingDoc: string | null;
  renewingDoc: string | null;
  onView: (doc: Document) => void;
  onRenew: (doc: Document) => void;
}) {
  const expiryStatus  = getExpiryStatus(doc);
  const daysRemaining = getDaysRemaining(doc);
  const isExpired     = expiryStatus === 'expired';
  const isExpiring    = expiryStatus === 'critical' || expiryStatus === 'warning';
  const canRenew      = doc.canRenew || isExpired || isExpiring;

  return (
    <div className={`flex items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors ${isExpired ? 'bg-red-500/5' : isExpiring ? 'bg-yellow-500/5' : ''}`}>
      <div className="flex items-center gap-3 flex-1">
        <StatusBadge status={doc.status} />
        <div className="flex-1">
          <p className="text-sm font-medium">{doc.name}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground">
              Uploaded: {formatDate(doc.uploadDate)}
            </p>

            {doc.expiryDate && (
              <p className={`text-xs flex items-center gap-1 ${getExpiryColor(expiryStatus)}`}>
                {getExpiryIcon(expiryStatus)}
                <span>Expires: {formatDate(doc.expiryDate)}</span>
                {daysRemaining !== null && (
                  <span className="font-medium">
                    ({daysRemaining < 0
                      ? `Expired ${Math.abs(daysRemaining)} days ago`
                      : `${daysRemaining} days remaining`})
                  </span>
                )}
              </p>
            )}

            {doc.status === 'Replaced' && (
              <p className="text-xs text-muted-foreground">(Replaced by newer version)</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onView(doc)}
          disabled={viewingDoc === doc.fileName}
          className="p-2 rounded hover:bg-muted/50 transition-colors disabled:opacity-50"
          title="View document"
        >
          {viewingDoc === doc.fileName ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Eye size={16} />
          )}
        </button>

        {canRenew && doc.status !== 'Replaced' && (
          <button
            onClick={() => onRenew(doc)}
            disabled={renewingDoc === doc.name}
            className={`p-2 rounded transition-colors ${
              isExpired
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
            title="Renew document"
          >
            {renewingDoc === doc.name ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}