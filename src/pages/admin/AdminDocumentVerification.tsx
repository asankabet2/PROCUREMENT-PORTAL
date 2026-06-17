import { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import { 
  Eye, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock,
  RefreshCw,
} from 'lucide-react';
import api, { 
  getSuppliers,
  getSupplierDocuments, 
  verifyDocument,
  getDocumentUrl 
} from '@/services/api';

interface Document {
  id?: number;
  name: string;
  fileName: string;
  docType: string;
  status: 'Verified' | 'Pending' | 'Replaced' | 'Expired' | 'Rejected';
  uploadDate: string;
  expiryDate?: string;
  requiresExpiry?: boolean;
  isRenewal?: boolean;
  replacedAt?: string;
  replacedBy?: string;
  createdAt?: string;
}

interface Supplier {
  id: string;  // Note: backend returns 'id', not 'supplierid'
  supplierid?: string; // For compatibility
  companyName: string;  // Backend uses camelCase
  companyname?: string;
  email: string;
  contactPerson?: string;
  contactperson?: string;
  phone: string;
  documents: Document[];
}

export default function AdminDocumentVerification() {
  const { addToast } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState<{ supplierId: string; docName: string } | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectDocument, setRejectDocument] = useState<{ supplier: Supplier; doc: Document } | null>(null);

  // Fetch all suppliers with pending documents
  useEffect(() => {
    fetchSuppliersWithPendingDocs();
  }, []);

  const fetchSuppliersWithPendingDocs = async () => {
    setLoading(true);
    try {
      //API service to get all suppliers
      const response = await getSuppliers();
      const allSuppliers = response.data;
      
      // Fetch detailed documents for each supplier
      const suppliersWithDocs = await Promise.all(
        allSuppliers.map(async (supplier: any) => {
          try {
            const docsRes = await getSupplierDocuments(supplier.id);
            const documents = docsRes.data;
            
            // Normalize supplier data (handle both camelCase and potential variations)
            return { 
              ...supplier, 
              id: supplier.id,
              companyName: supplier.companyName || supplier.companyname,
              contactPerson: supplier.contactPerson || supplier.contactperson,
              documents 
            };
          } catch (error) {
            console.error('Error fetching documents for supplier:', supplier.id);
            return { 
              ...supplier, 
              id: supplier.id,
              companyName: supplier.companyName || supplier.companyname,
              contactPerson: supplier.contactPerson || supplier.contactperson,
              documents: [] 
            };
          }
        })
      );

      setSuppliers(suppliersWithDocs);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const verifyDocumentStatus = async (supplierId: string, doc: Document, status: 'Verified' | 'Rejected', rejectionReason?: string) => {
    setVerifying({ supplierId, docName: doc.name });

    try {
      // Use API service to verify document
      await verifyDocument(supplierId, doc.docType, { status, rejectionReason });
      
      addToast(`Document ${status.toLowerCase()} successfully`, 'success');
      
      // Refresh the list
      await fetchSuppliersWithPendingDocs();
      
      // Refresh the selected supplier if open
      if (selectedSupplier?.id === supplierId) {
        const refreshedRes = await getSupplierDocuments(supplierId);
        const refreshedDocs = refreshedRes.data;
        setSelectedSupplier(prev => prev ? { ...prev, documents: refreshedDocs } : null);
      }
    } catch (error: any) {
      console.error('Error verifying document:', error);
      addToast(error.response?.data?.message || 'Failed to verify document', 'error');
    } finally {
      setVerifying(null);
      setShowRejectModal(false);
      setRejectionReason('');
    }
  };

  const handleReject = (supplier: Supplier, doc: Document) => {
    setRejectDocument({ supplier, doc });
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const viewDocument = async (supplierId: string, fileName: string, _docName: string) => {
    try {
      const documentUrl = getDocumentUrl(supplierId, fileName);
      const response = await api.get(documentUrl, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      console.error('Error viewing document:', error);
      addToast('Failed to open document', 'error');
    }
  };

  // Get all pending documents across all suppliers (excluding renewals)
  const pendingDocuments = suppliers.flatMap(supplier =>
    (supplier.documents || [])
      .filter(doc => doc.status === 'Pending' && !doc.isRenewal)
      .map(doc => ({ ...doc, supplier }))
  );

  // Get all renewal documents
  const renewalDocuments = suppliers.flatMap(supplier =>
    (supplier.documents || [])
      .filter(doc => doc.isRenewal === true && doc.status === 'Pending')
      .map(doc => ({ ...doc, supplier }))
  );

  if (loading) {
    return (
      <PortalLayout type="admin" title="Document Verification" breadcrumb={['Admin', 'Documents', 'Verify']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout type="admin" title="Document Verification" breadcrumb={['Admin', 'Documents', 'Verify']}>
        <div className="text-center py-12 text-destructive">{error}</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="admin" title="Document Verification" breadcrumb={['Admin', 'Documents', 'Verify']}>
      <div className="space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <FileText size={32} className="text-muted-foreground opacity-50" />
            </div>
          </div>
          <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Documents</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingDocuments.length}</p>
              </div>
              <Clock size={32} className="text-yellow-500" />
            </div>
          </div>
          <div className="glass-card p-4 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Renewal Requests</p>
                <p className="text-2xl font-bold text-blue-600">{renewalDocuments.length}</p>
              </div>
              <RefreshCw size={32} className="text-blue-500" />
            </div>
          </div>
        </div>

        {/* Pending Documents Section */}
        {pendingDocuments.length === 0 && renewalDocuments.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <CheckCircle size={48} className="mx-auto text-success mb-4" />
            <h3 className="text-lg font-bold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">No pending documents require verification.</p>
          </div>
        ) : (
          <>
            {/* Renewal Requests Section */}
            {renewalDocuments.length > 0 && (
              <div className="glass-card overflow-hidden border-blue-500/30">
                <div className="p-4 border-b border-border bg-blue-500/5">
                  <h3 className="font-bold text-blue-600 flex items-center gap-2">
                    <RefreshCw size={16} />
                    Document Renewal Requests
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Suppliers have submitted renewed versions of expiring documents
                  </p>
                </div>
                {renewalDocuments.map((item, idx) => (
                  <DocumentVerificationRow
                    key={`${item.supplier.id}-${item.docType}-${idx}`}
                    supplier={item.supplier}
                    doc={item}
                    verifying={verifying}
                    onView={viewDocument}
                    onVerify={verifyDocumentStatus}
                    onReject={(supplier, doc) => handleReject(supplier, doc)}
                  />
                ))}
              </div>
            )}

            {/* New Document Uploads Section */}
            {pendingDocuments.length > 0 && (
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileText size={16} />
                    New Document Uploads
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Documents uploaded by new suppliers or as additional submissions
                  </p>
                </div>
                {pendingDocuments.map((item, idx) => (
                  <DocumentVerificationRow
                    key={`${item.supplier.id}-${item.docType}-${idx}`}
                    supplier={item.supplier}
                    doc={item}
                    verifying={verifying}
                    onView={viewDocument}
                    onVerify={verifyDocumentStatus}
                    onReject={(supplier, doc) => handleReject(supplier, doc)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && rejectDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-bold">Reject Document</h2>
              <button 
                onClick={() => setShowRejectModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm mb-2">
                  Rejecting: <span className="font-bold">{rejectDocument.doc.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Supplier: {rejectDocument.supplier.companyName || rejectDocument.supplier.companyname}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                  placeholder="Explain why the document is being rejected..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30"
              >
                Cancel
              </button>
              <button
                onClick={() => verifyDocumentStatus(
                  rejectDocument.supplier.id, 
                  rejectDocument.doc, 
                  'Rejected',
                  rejectionReason
                )}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

// Document Row Component
function DocumentVerificationRow({ 
  supplier, 
  doc, 
  verifying, 
  onView, 
  onVerify, 
  onReject 
}: { 
  supplier: Supplier;
  doc: Document;
  verifying: { supplierId: string; docName: string } | null;
  onView: (supplierId: string, fileName: string, name: string) => void;
  onVerify: (supplierId: string, doc: Document, status: 'Verified' | 'Rejected', reason?: string) => void;
  onReject: (supplier: Supplier, doc: Document) => void;
}) {
  const isRenewal = doc.isRenewal === true;
  const isVerifying = verifying?.supplierId === supplier.id && verifying?.docName === doc.name;
  
  // Get the supplier name from either field
  const supplierName = supplier.companyName || supplier.companyname;
  const contactPerson = supplier.contactPerson || supplier.contactperson;

  return (
    <div className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status="Pending" />
            {isRenewal && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded-full flex items-center gap-1">
                <RefreshCw size={10} /> Renewal
              </span>
            )}
          </div>
          <p className="font-medium">{doc.name}</p>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            <span>Supplier: {supplierName}</span>
            <span>Contact: {contactPerson || 'N/A'}</span>
            <span>Email: {supplier.email}</span>
            <span>Phone: {supplier.phone}</span>
            <span>Uploaded: {formatDate(doc.uploadDate)}</span>
            {doc.expiryDate && <span>Expires: {formatDate(doc.expiryDate)}</span>}
            {doc.isRenewal && doc.replacedAt && (
              <span className="text-blue-600">Renewal - Replaces previous version</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(supplier.id, doc.fileName, doc.name)}
            className="flex items-center gap-1 px-3 py-1.5 bg-muted/50 hover:bg-muted text-sm rounded-lg transition-colors"
          >
            <Eye size={14} /> View
          </button>
          <button
            onClick={() => onVerify(supplier.id, doc, 'Verified')}
            disabled={isVerifying}
            className="flex items-center gap-1 px-3 py-1.5 bg-success text-success-foreground text-sm rounded-lg hover:bg-success/80 transition-colors disabled:opacity-50"
          >
            {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Verify
          </button>
          <button
            onClick={() => onReject(supplier, doc)}
            disabled={isVerifying}
            className="flex items-center gap-1 px-3 py-1.5 bg-destructive text-destructive-foreground text-sm rounded-lg hover:bg-destructive/80 transition-colors disabled:opacity-50"
          >
            <XCircle size={14} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}