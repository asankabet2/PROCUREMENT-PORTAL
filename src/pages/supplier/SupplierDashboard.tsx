import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/context/AuthContext';
import { formatDate, getDaysUntil } from '@/utils/helpers';
import { FolderOpen, Send, Award, FileSearch, Loader2 } from 'lucide-react';
import { getTenders, getBidsBySupplier, getSupplierInterests, getNotifications } from '@/services/api';

interface Tender {
  id: string;
  title: string;
  status: string;
  closingDate: string;
}

interface Bid {
  id: string;
  tenderId: string;
  supplierId: string;
  status: string;
  grandTotal: number;
}

interface ExpressedInterest {
  tenderId: string;
  supplierId: string;
  date: string;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
}

export default function SupplierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [interests, setInterests] = useState<ExpressedInterest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        const [tendersRes, bidsRes, interestsRes, notifsRes] = await Promise.all([
          getTenders(),
          getBidsBySupplier(user.id),
          getSupplierInterests(user.id),
          getNotifications(user.id),
        ]);

        setTenders(tendersRes.data);
        setBids(bidsRes.data);
        setInterests(interestsRes.data);
        setNotifications(notifsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  const openTenders = tenders.filter(t => t.status === 'Open');
  const myInterests = interests;
  const myBids = bids;
  const awarded = myBids.filter(b => b.status === 'Awarded');
  const myNotifs = notifications.slice(0, 5);

  const upcomingDeadlines = myInterests
    .map(i => tenders.find(t => t.id === i.tenderId))
    .filter(t => t && t.status === 'Open')
    .sort((a, b) => new Date(a!.closingDate).getTime() - new Date(b!.closingDate).getTime());

  if (loading) {
    return (
      <PortalLayout type="supplier" title="Dashboard" breadcrumb={['Supplier', 'Dashboard']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="supplier" title="Dashboard" breadcrumb={['Supplier', 'Dashboard']}>
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Open Tenders" 
            value={openTenders.length} 
            icon={FolderOpen} 
            iconColor="text-success" 
            onClick={() => navigate('/supplier/tenders')} 
          />
          <StatCard 
            title="Participating In" 
            value={myInterests.length} 
            icon={FileSearch} 
            iconColor="text-primary" 
            onClick={() => navigate('/supplier/tenders')} 
          />
          <StatCard 
            title="Bids Submitted" 
            value={myBids.length} 
            icon={Send} 
            onClick={() => navigate('/supplier/bids')} 
          />
          <StatCard 
            title="Bids Awarded" 
            value={awarded.length} 
            icon={Award} 
            iconColor="text-blue-400" 
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {myNotifs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              ) : (
                myNotifs.map(n => (
                  <div key={n.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      n.type === 'success' ? 'bg-emerald-400' : 
                      n.type === 'warning' ? 'bg-amber-400' : 
                      n.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(n.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              ) : (
                upcomingDeadlines.map(t => {
                  const days = getDaysUntil(t!.closingDate);
                  return (
                    <div 
                      key={t!.id} 
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/supplier/tenders/${t!.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{t!.title}</p>
                        <p className="text-xs text-muted-foreground">{t!.id} • Closes {formatDate(t!.closingDate)}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        days <= 2 ? 'bg-destructive/20 text-destructive' : 
                        days <= 7 ? 'bg-warning/20 text-warning' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {days}d left
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}