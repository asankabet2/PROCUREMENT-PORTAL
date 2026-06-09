import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getTenders, getSupplierInterests, getBidsBySupplier, expressInterest } from '@/services/api';
import { formatDate, formatCurrency, getDaysUntil, tenderCategories } from '@/utils/helpers';
import { Search, Calendar, Loader2, FileText } from 'lucide-react';

interface Tender {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  closingDate: string;
  estimatedBudget: number;
}

export default function BrowseTenders() {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [submittedBids, setSubmittedBids] = useState<string[]>([]);

  // Fetch tenders from backend
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        setLoading(true);
        const response = await getTenders();
        const tendersData = response.data || [];
        const openTendersData = tendersData.filter((t: Tender) => t.status === 'Open');
        setTenders(openTendersData);
      } catch (err) {
        console.error('Failed to fetch tenders:', err);
        setError('Failed to load tenders. Please try again.');
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, []);

  // Fetch existing interests for this supplier
  useEffect(() => {
    const fetchInterests = async () => {
      if (!user?.id) return;
      
      try {
        const response = await getSupplierInterests(user.id);
        const data = response.data || [];
        const interestIds = data.map((interest: { tenderId: string }) => interest.tenderId);
        setInterests(interestIds);
      } catch (err) {
        console.error('Failed to fetch interests:', err);
        setInterests([]);
      }
    };

    fetchInterests();
  }, [user?.id]);

  // Fetch existing submitted bids for this supplier
  useEffect(() => {
    const fetchSubmittedBids = async () => {
      if (!user?.id) return;
      
      try {
        const response = await getBidsBySupplier(user.id);
        const data = response.data || [];
        const bidTenderIds = data.map((bid: any) => bid.tenderId);
        setSubmittedBids(bidTenderIds);
      } catch (err) {
        console.error('Failed to fetch submitted bids:', err);
        setSubmittedBids([]);
      }
    };

    fetchSubmittedBids();
  }, [user?.id]);

  // Filter tenders based on search and category (with safety checks)
  const filteredTenders = (tenders || [])
    .filter(t => t?.title?.toLowerCase().includes(search.toLowerCase()) || t?.id?.toLowerCase().includes(search.toLowerCase()))
    .filter(t => !catFilter || t?.category === catFilter);

  const handleExpressInterest = async (tenderId: string) => {
    if (!user?.id) {
      addToast('Please log in to express interest', 'error');
      return;
    }
    
    if (interests.includes(tenderId)) {
      addToast('You have already expressed interest in this tender', 'info');
      return;
    }
    
    try {
      const response = await expressInterest(tenderId, user.id);
      const data = response.data;

      if (response.status === 200 || response.status === 201) {
        setInterests(prev => [...prev, tenderId]);
        addToast('Interest expressed successfully', 'success');
      } else if (data.alreadyInterested) {
        setInterests(prev => [...prev, tenderId]);
        addToast('Interest already expressed', 'info');
      } else {
        addToast(data.message || 'Failed to express interest', 'error');
      }
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      addToast(error.response?.data?.message || 'Failed to express interest', 'error');
    }
  };

  if (loading) {
    return (
      <PortalLayout type="supplier" title="Browse Tenders" breadcrumb={['Supplier', 'Tenders']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout type="supplier" title="Browse Tenders" breadcrumb={['Supplier', 'Tenders']}>
        <div className="text-center py-12 text-destructive">{error}</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="supplier" title="Browse Tenders" breadcrumb={['Supplier', 'Tenders']}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2 flex-1">
            <Search size={16} className="text-muted-foreground" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by title or ID..."
              className="bg-transparent text-sm outline-none w-full" 
            />
          </div>
          <select 
            value={catFilter} 
            onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none"
          >
            <option value="">All Categories</option>
            {tenderCategories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTenders.map(t => {
            const days = getDaysUntil(t.closingDate);
            const hasInterest = interests.includes(t.id);
            const hasSubmittedBid = submittedBids.includes(t.id);
            
            return (
              <div key={t.id} className="glass-card p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{t.id}</span>
                  <StatusBadge status={t.status} />
                </div>
                <h3 className="font-bold mb-2">{t.title}</h3>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit mb-2">{t.category}</span>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{t.description}</p>
                <div className="text-sm space-y-1 mb-4">
                  <p className="font-medium">Est. Budget: {formatCurrency(t.estimatedBudget)}</p>
                  <p className="flex items-center gap-1">
                    <Calendar size={14} className="text-muted-foreground" />
                    Closes: {formatDate(t.closingDate)}
                    {days <= 2 && days > 0 && <span className="text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full ml-1">{days}d left</span>}
                    {days <= 0 && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-1">Closed</span>}
                  </p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => navigate(`/supplier/tenders/${t.id}`, { 
                      state: { 
                        hasExistingBid: hasSubmittedBid,
                        hasInterest: hasInterest,
                        bidStatus: 'Submitted',
                        submittedDate: new Date().toISOString()
                      } 
                    })}
                    className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </button>
                  {hasSubmittedBid ? (
                    <button disabled className="flex-1 py-2 bg-success/10 text-success rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                      <FileText size={14} /> Bid Submitted
                    </button>
                  ) : hasInterest ? (
                    <button 
                      onClick={() => navigate(`/supplier/tenders/${t.id}/bid`)}
                      className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
                    >
                      Submit Bid
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleExpressInterest(t.id)}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
                    >
                      Express Interest
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredTenders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No open tenders found matching your criteria.
          </div>
        )}
      </div>
    </PortalLayout>
  );
}