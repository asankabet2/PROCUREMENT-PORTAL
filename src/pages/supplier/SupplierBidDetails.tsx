import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getBidById, downloadBidReceipt } from '@/services/api';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Calendar, Download, CheckCircle, XCircle, FileText, Loader2, Building2, Award, Clock, TrendingUp } from 'lucide-react';

interface BidItem {
  itemNo: number;
  tenderItemId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Bid {
  bidId: string;
  tenderId: string;
  tenderTitle: string;
  supplierId: string;
  supplierName: string;
  submittedDate: string;
  grandTotal: number;
  status: string;
  complianceScore?: number;
  evaluationScore?: number;
  items: BidItem[];
}

export default function SupplierBidDetails() {
  const { bidId } = useParams();
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();
  
  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Client-side pagination for bid items
  const ITEMS_PER_PAGE = 10;
  const [itemsPage, setItemsPage] = useState(1);

  useEffect(() => {
    const fetchBidDetails = async () => {
      if (!bidId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await getBidById(bidId);
        // Handle both axios response.data and direct data
        const data = response?.data || response;

        if (!data || !data.bidId) {
          throw new Error('Bid not found');
        }

        setBid({
          bidId: data.bidId,
          tenderId: data.tenderId,
          tenderTitle: data.tenderTitle || data.title || 'Untitled Tender',
          supplierId: data.supplierId,
          supplierName: data.supplierName || user.companyName || 'Your Company',
          submittedDate: data.submittedDate || data.createdAt,
          grandTotal: Number(data.grandTotal) || 0,
          status: data.status || 'Submitted',
          complianceScore: data.complianceScore,
          evaluationScore: data.evaluationScore,
          items: Array.isArray(data.items) ? data.items : []
        });
      } catch (err: any) {
        console.error('Failed to fetch bid details:', err);
        const message = err.response?.data?.message || err.message || 'Failed to load bid details';
        setError(message);
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchBidDetails();
  }, [bidId, user, addToast]);

  const handleDownloadReceipt = async () => {
    if (!bidId) return;
    
    setDownloading(true);
    try {
      await downloadBidReceipt(bidId);
      addToast('Bid receipt downloaded successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to download receipt', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Improved status config
  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || '';
    
    if (s.includes('award') || s === 'bs002') {
      return {
        icon: <Award size={16} className="text-success" />,
        color: 'bg-success/10 text-success border-success/30',
        label: 'Awarded'
      };
    }
    if (s.includes('reject') || s === 'BS003') {
      return {
        icon: <XCircle size={16} className="text-destructive" />,
        color: 'bg-destructive/10 text-destructive border-destructive/30',
        label: 'Rejected'
      };
    }
    return {
      icon: <Clock size={16} className="text-warning" />,
      color: 'bg-warning/10 text-warning border-warning/30',
      label: 'Submitted'
    };
  };

  if (loading) {
    return (
      <PortalLayout type="supplier" title="Loading Bid..." breadcrumb={['Supplier', 'Bids', bidId || '']}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error || !bid) {
    return (
      <PortalLayout type="supplier" title="Bid Not Found" breadcrumb={['Supplier', 'Bids']}>
        <EmptyState 
          title="Bid Not Found" 
          description={error || "This bid doesn't exist or you don't have permission to view it."} 
        />
      </PortalLayout>
    );
  }

  const statusConfig = getStatusConfig(bid.status);

  // Paginated bid items
  const allItems       = bid.items || [];
  const totalItemPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  const safeItemsPage  = Math.min(itemsPage, totalItemPages);
  const pagedItems     = allItems.slice((safeItemsPage - 1) * ITEMS_PER_PAGE, safeItemsPage * ITEMS_PER_PAGE);

  return (
    <PortalLayout type="supplier" title={`Bid: ${bid.bidId}`} breadcrumb={['Supplier', 'Bids', bid.bidId]}>
      <div className="space-y-6 max-w-5xl">

        {/* Back to My Bids */}
        <button
          onClick={() => navigate('/supplier/bids')}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to My Bids
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </div>
          <span className="font-mono text-sm text-muted-foreground">{bid.bidId}</span>
        </div>

        {/* Bid Summary Card */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-5">Bid Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="font-medium">{formatDate(bid.submittedDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{bid.supplierName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tender</p>
                <p className="font-medium text-sm">{bid.tenderTitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Scores */}
        {(bid.complianceScore !== undefined || bid.evaluationScore !== undefined) && (
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} /> Evaluation Result
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {bid.complianceScore !== undefined && (
                <div className="text-center p-6 bg-muted/50 rounded-xl">
                  <p className="text-4xl font-bold text-primary">{bid.complianceScore}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Compliance Score</p>
                </div>
              )}
              {bid.evaluationScore !== undefined && (
                <div className="text-center p-6 bg-muted/50 rounded-xl">
                  <p className="text-4xl font-bold text-primary">{bid.evaluationScore}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Evaluation Score</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bid Items Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-lg">Bid Items ({allItems.length})</h3>
            <button
              onClick={handleDownloadReceipt}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-70 transition-all text-sm"
            >
              {downloading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
              {downloading ? 'Downloading...' : 'Download PDF Receipt'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-4">#</th>
                  <th className="text-left p-4">Item Code</th>
                  <th className="text-left p-4">Description</th>
                  <th className="text-left p-4">Unit</th>
                  <th className="text-right p-4">Avg Bid Qty</th>
                  <th className="text-right p-4">Bid Unit Price</th>
                  <th className="text-right p-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item.itemNo} className="border-b hover:bg-muted/30">
                    <td className="p-4 font-medium">{item.itemNo}</td>
                    <td className="p-4 font-mono text-xs">{item.tenderItemId}</td>
                    <td className="p-4">{item.description}</td>
                    <td className="p-4">{item.unit}</td>
                    <td className="p-4 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="p-4 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-4 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={6} className="p-4 text-right font-bold text-lg">Grand Total</td>
                  <td className="p-4 text-right font-bold text-xl text-primary">
                    {formatCurrency(bid.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {totalItemPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t text-sm">
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

        {/* Notes */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">Important Notes</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle size={18} className="text-success mt-0.5 flex-shrink-0" />
              This is your official bid submission record.
            </li>
            <li className="flex gap-2">
              <Download size={18} className="text-primary mt-0.5 flex-shrink-0" />
              Download the PDF receipt for your records.
            </li>
            {bid.status?.toLowerCase() === 'awarded' ? (
              <li className="flex gap-2 text-success">
                <Award size={18} className="mt-0.5 flex-shrink-0" />
                Congratulations! Your bid has been awarded.
              </li>
            ) : (
              <li className="flex gap-2">
                <Clock size={18} className="text-warning mt-0.5 flex-shrink-0" />
                Your bid is currently under evaluation. You will be notified of the outcome.
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/supplier/tenders/${bid.tenderId}`)}
            className="px-5 py-3 bg-muted hover:bg-muted/80 rounded-xl transition-all"
          >
            View Original Tender
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}