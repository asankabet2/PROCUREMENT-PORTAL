import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getTenderById, getSupplierInterests, getBidsBySupplier, expressInterest } from '@/services/api';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Calendar, Download, CheckCircle, FileText, Loader2 } from 'lucide-react';
import ExpiredDocumentsWarning from '@/components/ExpiredDocumentsWarning';
import { DOCUMENT_CONFIG } from '@/constants/documents';
import { useSupplierCompliance } from '@/hooks/useSupplierCompliance';

interface TenderItem {
  itemNo: number;
  tenderItemId: string; 
  description: string;
  unit: string;
  quantity: number;
  estimatedUnitPrice: number;
}

interface Tender {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  publishedDate: string;
  openingDate: string;
  closingDate: string;
  estimatedBudget: number;
  requiredDocuments: string[];
  items: TenderItem[];
}

export default function SupplierTenderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasInterest, setHasInterest] = useState(false);
  const [hasExistingBid, setHasExistingBid] = useState(false);
  const [existingBidSubmittedDate, setExistingBidSubmittedDate] = useState<string | null>(null);
  const [expressingInterest, setExpressingInterest] = useState(false);
  const [checkingBid, setCheckingBid] = useState(true);

  // Client-side pagination for tender items
  const ITEMS_PER_PAGE = 10;
  const [itemsPage, setItemsPage] = useState(1);
  
  // Add compliance check
  const { hasExpiredDocuments, expiredDocuments, canParticipate, loading: complianceLoading } = 
    useSupplierCompliance(user?.id || '');

  // Check for existing bid from navigation state or API
  useEffect(() => {
    const checkExistingBid = async () => {
      if (!id || !user) return;
      
      // First check if we got state from navigation
      if (location.state?.hasExistingBid) {
        setHasExistingBid(true);
        setExistingBidSubmittedDate(location.state?.submittedDate || null);
        setCheckingBid(false);
        return;
      }
      
      try {
        const response = await getBidsBySupplier(user.id);
        const bids = response.data || [];
        const existing = bids.find((b: any) => b.tenderId === id);
        if (existing) {
          setHasExistingBid(true);
          setExistingBidSubmittedDate(existing.submittedDate);
        }
      } catch (err) {
        console.error('Failed to check existing bid:', err);
      } finally {
        setCheckingBid(false);
      }
    };

    checkExistingBid();
  }, [id, user, location.state]);

  // Fetch tender from backend
  useEffect(() => {
    const fetchTender = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await getTenderById(id);
        setTender(response.data);
      } catch (err) {
        console.error('Failed to fetch tender:', err);
        setError('Failed to load tender details');
      } finally {
        setLoading(false);
      }
    };

    const fetchExistingInterests = async () => {
      if (!id || !user) return;
      
      try {
        const response = await getSupplierInterests(user.id);
        const interests = response.data || [];
        const hasExistingInterest = interests.some((i: any) => i.tenderId === id);
        setHasInterest(hasExistingInterest);
      } catch (err) {
        console.error('Failed to fetch existing interests:', err);
      }
    };

    fetchTender();
    fetchExistingInterests();
  }, [id, user]);

  const handleExpressInterest = async () => {
    if (!id || !user) return;
    
    // Check frontend compliance before API call
    if (!canParticipate) {
      addToast('Please renew your expired documents before expressing interest', 'error');
      return;
    }
    
    setExpressingInterest(true);
    try {
      const response = await expressInterest(id, user.id);
      const data = response.data;

      if (response.status === 200 || response.status === 201) {
        setHasInterest(true);
        addToast('Interest expressed successfully!', 'success');
      } else if (data.alreadyInterested) {
        setHasInterest(true);
        addToast('Interest already expressed', 'info');
      } else {
        addToast(data.message || 'Failed to express interest', 'error');
      }
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      // Handle expired documents error from backend
      if (error.response?.status === 403 && error.response?.data?.code === 'EXPIRED_DOCUMENTS') {
        addToast(error.response?.data?.message || 'Please renew your expired documents', 'error');
      } else {
        addToast(error.response?.data?.message || 'Failed to express interest', 'error');
      }
    } finally {
      setExpressingInterest(false);
    }
  };

  const handleSubmitBid = () => {
    // Check frontend compliance before navigating
    if (!canParticipate) {
      addToast('Please renew your expired documents before submitting a bid', 'error');
      return;
    }
    navigate(`/supplier/tenders/${id}/bid`);
  };

  // Loading state
  if (loading || checkingBid || complianceLoading) {
    return (
      <PortalLayout type="supplier" title="Loading..." breadcrumb={['Supplier', 'Tenders', id || '']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  // Error state
  if (error || !tender) {
    return (
      <PortalLayout type="supplier" title="Not Found" breadcrumb={['Supplier', 'Tenders']}>
        <EmptyState 
          title="Tender Not Found" 
          description={error || "This tender doesn't exist or has been removed."} 
        />
      </PortalLayout>
    );
  }

  // Map the document keys selected at tender creation to their display names
  const docConfig = DOCUMENT_CONFIG as Record<string, { name: string }>;
  const requiredDocNames = (tender.requiredDocuments || []).map(
    key => docConfig[key]?.name || key
  );

  // Paginated tender items
  const allItems       = tender.items || [];
  const totalItemPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  const safeItemsPage  = Math.min(itemsPage, totalItemPages);
  const pagedItems     = allItems.slice((safeItemsPage - 1) * ITEMS_PER_PAGE, safeItemsPage * ITEMS_PER_PAGE);

  // Determine button state
  const isOpen = tender.status === 'Open';
  const canSubmitBid = isOpen && hasInterest && !hasExistingBid && canParticipate;
  const hasBidSubmitted = hasExistingBid;
  const needsInterest = isOpen && !hasInterest && !hasExistingBid;

  return (
    <PortalLayout type="supplier" title={tender.title} breadcrumb={['Supplier', 'Tenders', tender.id]}>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status={tender.status} />
          <span className="font-mono text-xs text-muted-foreground">{tender.id}</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tender.category}</span>
        </div>

        {/* Expired Documents Warning Banner */}
        {hasExpiredDocuments && (
          <ExpiredDocumentsWarning 
            expiredDocuments={expiredDocuments} 
            type="both" 
          />
        )}

        {/* Show bid submitted banner if exists */}
        {hasBidSubmitted && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} />
              <span className="font-medium">Bid Already Submitted</span>
            </div>
            <p className="text-sm mt-1 opacity-80">
              You have already submitted a bid for this tender on{' '}
              <strong>{existingBidSubmittedDate ? formatDate(existingBidSubmittedDate) : 'Unknown date'}</strong>.
            </p>
          </div>
        )}

        <div className="glass-card p-6">
          <h3 className="font-bold mb-3">Description</h3>
          <p className="text-muted-foreground">{tender.description}</p>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Timeline</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="font-medium text-sm">{formatDate(tender.publishedDate) || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Opening</p>
                <p className="font-medium text-sm">{formatDate(tender.openingDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Closing</p>
                <p className="font-medium text-sm">{formatDate(tender.closingDate)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-3">Required Documents</h3>
          {requiredDocNames.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No specific documents were requested for this tender.
            </p>
          ) : (
            <div className="space-y-2">
              {requiredDocNames.map((docName) => (
                <div key={docName} className="flex items-center gap-2 text-sm">
                  <FileText size={14} className="text-muted-foreground" />
                  {docName}
                  <span className="text-xs text-red-500 ml-1">*</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold">Tender Items ({allItems.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Item Code</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Unit</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-right p-3">Est. Price</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((i: TenderItem) => (
                  <tr key={i.itemNo} className="border-b border-border/50">
                    <td className="p-2">{i.itemNo}</td>
                    <td className="p-2 font-mono text-xs">{i.tenderItemId}</td>
                    <td className="p-2">{i.description}</td>
                    <td className="p-2">{i.unit}</td>
                    <td className="p-2 text-right">{i.quantity}</td>
                    <td className="p-2 text-right">{formatCurrency(i.estimatedUnitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalItemPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border text-sm">
              <span className="text-muted-foreground">
                Page {safeItemsPage} of {totalItemPages} · {allItems.length} items
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setItemsPage(p => Math.max(1, p - 1))}
                  disabled={safeItemsPage <= 1}
                  className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setItemsPage(p => Math.min(totalItemPages, p + 1))}
                  disabled={safeItemsPage >= totalItemPages}
                  className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Download Tender Documents button */}
          <button className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm">
            <Download size={16} /> Download Tender Documents
          </button>
          
          {/* Bid Already Submitted button */}
          {hasBidSubmitted && (
            <button 
              disabled
              className="flex items-center gap-2 px-6 py-2 bg-success/20 text-success rounded-lg text-sm font-medium cursor-not-allowed"
            >
              <CheckCircle size={16} /> Bid Already Submitted
            </button>
          )}
          
          {/* Submit Bid Button - Disabled if documents expired */}
          {canSubmitBid ? (
            <button 
              onClick={handleSubmitBid}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Submit Bid
            </button>
          ) : isOpen && hasInterest && !hasExistingBid && !canParticipate && (
            <button 
              disabled
              className="px-6 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium cursor-not-allowed"
              title="Renew expired documents to submit a bid"
            >
              Submit Bid (Documents Expired)
            </button>
          )}
          
          {/* Express Interest Button - Disabled if documents expired */}
          {needsInterest && canParticipate && (
            <button 
              onClick={handleExpressInterest}
              disabled={expressingInterest}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {expressingInterest ? 'Processing...' : 'Express Interest'}
            </button>
          )}
          
          {needsInterest && !canParticipate && (
            <button 
              disabled
              className="px-6 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium cursor-not-allowed"
              title="Renew expired documents to express interest"
            >
              Express Interest (Documents Expired)
            </button>
          )}
          
          {hasInterest && !hasExistingBid && tender.status === 'Open' && (
            <span className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg text-sm">
              <CheckCircle size={16} /> Interest Expressed
            </span>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}