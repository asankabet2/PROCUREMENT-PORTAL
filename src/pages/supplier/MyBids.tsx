import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { getTenderById, getBidsBySupplier } from '@/services/api';
import { Loader2, Search } from 'lucide-react';

interface BidItem {
  itemNo: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Bid {
  id: string;
  tenderId: string;
  supplierId: string;
  items: BidItem[];
  grandTotal: number;
  status: string;
  submittedDate: string;
}

interface Tender {
  id: string;
  title: string;
  category: string;
  status: string;
}

export default function MyBids() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [bids, setBids] = useState<Bid[]>([]);
  const [tenders, setTenders] = useState<Map<string, Tender>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const statusTabs = ['All', 'Submitted', 'Awarded', 'Rejected'];

  // Fetch bids from backend
  useEffect(() => {
    const fetchBids = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const response = await getBidsBySupplier(user.id);
        const bidsData = response.data || [];
        
        console.log('Raw bids data:', bidsData);
        
        // Transform backend data to match frontend interface
        const transformedBids: Bid[] = bidsData.map((bid: any) => ({
          id: bid.bidId || bid.id,
          tenderId: bid.tenderId,
          supplierId: bid.supplierId,
          grandTotal: bid.grandTotal,
          status: bid.status,
          submittedDate: bid.submittedDate,
          items: bid.items || []
        }));
        
        console.log('Transformed bids:', transformedBids);
        setBids(transformedBids);
        
        // Fetch tender details for each bid
        const tenderMap = new Map();
        for (const bid of transformedBids) {
          if (bid.tenderId && !tenderMap.has(bid.tenderId)) {
            try {
              const tenderRes = await getTenderById(bid.tenderId);
              tenderMap.set(bid.tenderId, tenderRes.data);
            } catch (err) {
              console.error(`Failed to fetch tender ${bid.tenderId}:`, err);
            }
          }
        }
        setTenders(tenderMap);
      } catch (err: any) {
        console.error('Error fetching bids:', err);
        setError(err.response?.data?.message || 'Failed to load bids. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, [user]);

  if (loading) {
    return (
      <PortalLayout type="supplier" title="My Bids" breadcrumb={['Supplier', 'My Bids']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout type="supplier" title="My Bids" breadcrumb={['Supplier', 'My Bids']}>
        <EmptyState 
          title="Error Loading Bids" 
          description={error} 
          action={{ label: 'Try Again', onClick: () => window.location.reload() }}
        />
      </PortalLayout>
    );
  }

  const searchTerm = search.trim().toLowerCase();
  const filteredBids = bids
    .filter(bid => statusFilter === 'All' || bid.status === statusFilter)
    .filter(bid => {
      if (!searchTerm) return true;
      const tenderTitle = tenders.get(bid.tenderId)?.title || '';
      return (
        bid.id.toLowerCase().includes(searchTerm) ||
        bid.tenderId.toLowerCase().includes(searchTerm) ||
        tenderTitle.toLowerCase().includes(searchTerm)
      );
    });

  return (
    <PortalLayout type="supplier" title="My Bids" breadcrumb={['Supplier', 'My Bids']}>
      <div className="space-y-4 animate-fade-in">
        {bids.length === 0 ? (
          <EmptyState 
            title="No Bids Yet" 
            description="You haven't submitted any bids." 
            action={{ label: 'Browse Tenders', onClick: () => navigate('/supplier/tenders') }} 
          />
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1 flex-wrap">
                {statusTabs.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by bid ID or tender..."
                  className="bg-transparent text-sm outline-none w-48"
                />
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Bid ID</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Tender</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Submitted</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Grand Total</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBids.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No bids match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredBids.map((bid) => {
                        const tender = tenders.get(bid.tenderId);
                        return (
                          <tr
                            key={bid.id}
                            className={`border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${bid.status === 'Awarded' ? 'bg-success/5' : ''}`}
                            onClick={() => navigate(`/supplier/bids/${bid.id}`)}
                          >
                            <td className="p-3 font-mono text-xs">{bid.id}</td>
                            <td className="p-3 font-medium">
                              {tender?.title || 'Loading...'}
                              <div className="text-xs text-muted-foreground">{bid.tenderId}</div>
                            </td>
                            <td className="p-3 text-muted-foreground">{formatDate(bid.submittedDate)}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(bid.grandTotal)}</td>
                            <td className="p-3">
                              <StatusBadge status={bid.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}