import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, getDaysUntil } from '@/utils/helpers';
import { getTenders, getSuppliers, getAllBids } from '@/services/api';  // ← USE API SERVICE
import { FileText, FolderOpen, Users, Clock, Send, Award, AlertTriangle, Loader2 } from 'lucide-react';

interface Tender {
  id: string;
  title: string;
  category: string;
  status: string;
  closingDate: string;
}

interface Supplier {
  id: string;
  status: string;
}

interface Bid {
  id: string;
  tenderId: string;
  submittedDate: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tenders, setTenders]     = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bids, setBids]           = useState<Bid[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Use api service — token interceptor fires automatically
        const [tendersRes, suppliersRes, bidsRes] = await Promise.all([
          getTenders(),
          getSuppliers(),
          getAllBids(),
        ]);

        // Axios wraps the response body in .data
        let tendersData  = tendersRes.data;
        let suppliersData = suppliersRes.data;
        let bidsData     = bidsRes.data;

        // Normalize tenders
        if (Array.isArray(tendersData)) {
          tendersData = tendersData.map((tender: any) => ({
            id:          tender.id          || tender.tenderid   || tender.TenderID,
            title:       tender.title       || tender.Title,
            category:    tender.category    || tender.Category,
            status:      tender.status      || tender.Status,
            closingDate: tender.closingDate || tender.closingdate,
          }));
        } else {
          tendersData = [];
        }

        // Normalize suppliers
        if (Array.isArray(suppliersData)) {
          suppliersData = suppliersData.map((supplier: any) => ({
            id:     supplier.id     || supplier.supplierid  || supplier.SupplierID,
            status: supplier.status || supplier.Status,
          }));
        } else {
          suppliersData = [];
        }

        // Normalize bids
        if (Array.isArray(bidsData)) {
          bidsData = bidsData.map((bid: any) => ({
            id:            bid.id            || bid.bidid        || bid.BidID,
            tenderId:      bid.tenderId      || bid.tenderid     || bid.TenderID,
            submittedDate: bid.submittedDate || bid.submitteddate,
          }));
        } else {
          bidsData = [];
        }

        setTenders(tendersData);
        setSuppliers(suppliersData);
        setBids(bidsData);
      } catch (err: any) {
        // 401 is handled globally in api.js (redirects to login)
        // This catches network errors and other failures
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <PortalLayout type="admin" title="Dashboard" breadcrumb={['Admin', 'Dashboard']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    return (
      <PortalLayout type="admin" title="Dashboard" breadcrumb={['Admin', 'Dashboard']}>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      </PortalLayout>
    );
  }

  const openTenders      = tenders.filter(t => t.status === 'Open');
  const pendingSuppliers = suppliers.filter(s => s.status === 'Pending');

  const now = new Date();

  const thisMonthBids = bids.filter(b => {
    if (!b.submittedDate) return false;
    const date = new Date(b.submittedDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const awardedTenders = tenders.filter(t => t.status === 'Awarded');
  const urgentTenders  = openTenders.filter(t => {
    const days = getDaysUntil(t.closingDate);
    return days >= 0 && days <= 3;
  });

  // Build the trailing 6 months ending with the current month — derived from
  // today's date so the chart is never stale or hardcoded to a fixed window.
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: MONTH_LABELS[d.getMonth()], month: d.getMonth(), year: d.getFullYear() };
  });
  const bidsPerMonth = last6Months.map(m =>
    bids.filter(b => {
      if (!b.submittedDate) return false;
      const date = new Date(b.submittedDate);
      return date.getMonth() === m.month && date.getFullYear() === m.year;
    }).length
  );

  const maxBids = Math.max(...bidsPerMonth, 1);

  const statusDist = [
    { label: 'Open',    count: openTenders.length,                              color: 'bg-emerald-500' },
    { label: 'Closed',  count: tenders.filter(t => t.status === 'Closed').length, color: 'bg-red-500'    },
    { label: 'Awarded', count: awardedTenders.length,                           color: 'bg-blue-500'   },
    { label: 'Draft',   count: tenders.filter(t => t.status === 'Draft').length,  color: 'bg-slate-500'  },
  ];
  const totalForPie = statusDist.reduce((a, b) => a + b.count, 0);

  return (
    <PortalLayout type="admin" title="Dashboard" breadcrumb={['Admin', 'Dashboard']}>
      <div className="space-y-6 animate-fade-in">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Tenders"        value={tenders.length}           icon={FileText}                              onClick={() => navigate('/admin/tenders')} />
          <StatCard title="Open Tenders"         value={openTenders.length}        icon={FolderOpen}  iconColor="text-success"  onClick={() => navigate('/admin/tenders')} />
          <StatCard title="Registered Suppliers" value={suppliers.length}          icon={Users}                                 onClick={() => navigate('/admin/suppliers')} />
          <StatCard title="Pending Approvals"    value={pendingSuppliers.length}   icon={Clock}       iconColor="text-warning"  onClick={() => navigate('/admin/suppliers')} />
          <StatCard title="Bids This Month"      value={thisMonthBids.length}      icon={Send}        iconColor="text-primary"  />
          <StatCard title="Tenders Awarded"      value={awardedTenders.length}     icon={Award}       iconColor="text-blue-400" onClick={() => navigate('/admin/tenders')} />
        </div>

        {/* Alerts */}
        {(urgentTenders.length > 0 || pendingSuppliers.length > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {urgentTenders.length > 0 && (
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-destructive" />
                  <span className="font-semibold text-sm">Tenders Closing Soon</span>
                </div>
                {urgentTenders.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">{t.id}: {t.title}</span>
                    <span className="text-destructive font-medium">{getDaysUntil(t.closingDate)} days left</span>
                  </div>
                ))}
              </div>
            )}
            {pendingSuppliers.length > 0 && (
              <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 cursor-pointer" onClick={() => navigate('/admin/suppliers')}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-warning" />
                  <span className="font-semibold text-sm">{pendingSuppliers.length} Pending Supplier Approvals</span>
                </div>
                <p className="text-sm text-muted-foreground">Click to review pending applications</p>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Bids Received (Last 6 Months)</h3>
            <div className="flex items-end gap-3 h-40">
              {last6Months.map((m, i) => (
                <div key={`${m.label}-${m.year}`} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-primary">{bidsPerMonth[i]}</span>
                  <div
                    className="w-full bg-primary/20 rounded-t-md relative"
                    style={{ height: `${(bidsPerMonth[i] / maxBids) * 100}%`, minHeight: '8px' }}
                    title={`${m.label} ${m.year}: ${bidsPerMonth[i]} bid(s)`}
                  >
                    <div className="absolute inset-0 bg-primary rounded-t-md" />
                  </div>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold mb-4">Tender Status Distribution</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {statusDist.reduce((acc, item, i) => {
                    const pct    = totalForPie > 0 ? (item.count / totalForPie) * 100 : 0;
                    const offset = acc.offset;
                    const colors = ['#10b981', '#ef4444', '#3b82f6', '#64748b'];
                    acc.elements.push(
                      <circle key={i} cx="18" cy="18" r="15.9" fill="none"
                        stroke={colors[i]} strokeWidth="3.5"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={`-${offset}`} />
                    );
                    acc.offset += pct;
                    return acc;
                  }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{totalForPie}</span>
                </div>
              </div>
              <div className="space-y-2">
                {statusDist.map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tenders */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold">Recent Tenders</h3>
            <button onClick={() => navigate('/admin/tenders')} className="text-sm text-primary hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Deadline</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Bids</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {tenders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No tenders yet. Create one from Tender Management.
                    </td>
                  </tr>
                ) : (
                  tenders.slice(0, 5).map(t => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/admin/tenders/${t.id}`)}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono text-xs">{t.id}</td>
                      <td className="p-3 font-medium">{t.title}</td>
                      <td className="p-3 text-muted-foreground">{t.category}</td>
                      <td className="p-3">{formatDate(t.closingDate)}</td>
                      <td className="p-3">{bids.filter(b => b.tenderId === t.id).length}</td>
                      <td className="p-3"><StatusBadge status={t.status} /></td>
                      <td className="p-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenders/${t.id}`); }}
                          className="text-primary text-xs hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}