import { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Download, Calendar, FileText, Users, Award, BarChart3, Loader2, RotateCw, Filter } from 'lucide-react';
import { getTenders, getSuppliers, getAllBids } from '@/services/api';

interface Tender {
  id: string;
  title: string;
  category: string;
  status: string;
  publishedDate: string;
  openingDate: string;
  closingDate: string;
  estimatedBudget: number;
  awardedto?: string;
  awardamount?: number;
  awarddate?: string;
  awardnote?: string;
}

interface Supplier {
  id: string;
  companyName: string;
  registrationNumber: string;
  email: string;
  status: string;
  dateApplied: string;
  categories: string[];
  contactPerson: string;
  phone: string;
}

interface Bid {
  id: string;
  tenderId: string;
  supplierId: string;  
  submittedDate: string;
  grandTotal: number;
  status: string;
  items: { itemNo: number; unitPrice: number }[];
  supplier?: Supplier;
}

const reports = [
  { id: 'tender-register', title: 'Tender Register', desc: 'All tenders with status and dates', icon: FileText },
  { id: 'bid-summary', title: 'Bid Summary Report', desc: 'Bids received per tender', icon: BarChart3 },
  { id: 'supplier-register', title: 'Supplier Register', desc: 'All registered suppliers', icon: Users },
  { id: 'awarded-contracts', title: 'Awarded Contracts', desc: 'Awarded tenders with winners', icon: Award },
];

// Status options for filters
const TENDER_STATUSES = ['All', 'Draft', 'Open', 'Closed', 'Awarded', 'Cancelled'];
const SUPPLIER_STATUSES = ['All', 'Pending', 'Approved', 'Rejected', 'Blacklisted'];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('awarded-contracts'); 
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to check if a date is within the selected range
  const isWithinDateRange = (date: string | null | undefined): boolean => {
    if (!date) return true;
    const itemDate = new Date(date);
    itemDate.setHours(0, 0, 0, 0);
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    return itemDate >= from && itemDate <= to;
  };

  // Reset filters
  const resetFilters = () => {
    setDateFrom(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setStatusFilter('All');
  };

  // Get status options based on active report
  const getStatusOptions = () => {
    switch (activeReport) {
      case 'tender-register':
      case 'bid-summary':
      case 'awarded-contracts':
        return TENDER_STATUSES;
      case 'supplier-register':
        return SUPPLIER_STATUSES;
      default:
        return TENDER_STATUSES;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tendersRes, suppliersRes, bidsRes] = await Promise.all([
          getTenders(),
          getSuppliers(),
          getAllBids(),
        ]);

        let tendersData = tendersRes.data;
        let suppliersData = suppliersRes.data;
        let bidsData = bidsRes.data;

        // Normalize suppliers data (API already returns camelCase, but ensure consistency)
        suppliersData = suppliersData.map((s: any) => ({
          id: s.id,
          companyName: s.companyName,
          registrationNumber: s.registrationNumber,
          email: s.email,
          status: s.status,
          dateApplied: s.dateApplied,
          categories: s.categories || [],
          contactPerson: s.contactPerson,
          phone: s.phone,
        }));

        // Normalize bids data
        bidsData = bidsData.map((bid: any) => ({
          id: bid.bidId,
          tenderId: bid.tenderId,
          supplierId: bid.supplierId,
          grandTotal: bid.grandTotal,
          status: bid.status,
          submittedDate: bid.submittedDate,
          items: bid.items || []
        }));

        setTenders(tendersData);
        setSuppliers(suppliersData);
        setBids(bidsData);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get awarded contracts with date and status filter
  const getAwardedContracts = () => {
    let awardedTenders = tenders.filter(t => t.status === 'Awarded');
    
    // Apply status filter (though all are Awarded, keep for consistency)
    if (statusFilter !== 'All') {
      awardedTenders = awardedTenders.filter(t => t.status === statusFilter);
    }
    
    return awardedTenders
      .map(tender => {
        const winner = suppliers.find(s => s.id === tender.awardedto);
        return {
          tenderId: tender.id,
          tenderTitle: tender.title,
          winnerName: winner?.companyName || 'Unknown Supplier',
          winnerId: tender.awardedto,
          amount: Number(tender.awardamount) || 0,
          awardDate: tender.awarddate || tender.closingDate,
        };
      })
      .filter(contract => isWithinDateRange(contract.awardDate));
  };

  // Get filtered tenders for tender register
  const getFilteredTenders = () => {
    let filtered = tenders.filter(t => isWithinDateRange(t.publishedDate));
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    
    return filtered;
  };

  // Get filtered suppliers for supplier register
  const getFilteredSuppliers = () => {
    let filtered = suppliers.filter(s => isWithinDateRange(s.dateApplied));
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    return filtered;
  };

  // Get filtered bid summary data
  const getFilteredBidSummary = () => {
    // Filter tenders by closing date and status
    let filteredTenders = tenders.filter(t => isWithinDateRange(t.closingDate || t.publishedDate));
    
    // Apply status filter to tenders
    if (statusFilter !== 'All') {
      filteredTenders = filteredTenders.filter(t => t.status === statusFilter);
    }
    
    return filteredTenders.map(t => {
      // Filter bids by submitted date
      const tb = bids.filter(b => 
        (b.tenderId === t.id) && isWithinDateRange(b.submittedDate)
      );
      const amounts = tb.map(b => Number(b.grandTotal));
      const lowest = amounts.length > 0 ? Math.min(...amounts) : 0;
      const highest = amounts.length > 0 ? Math.max(...amounts) : 0;
      const average = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
      return { ...t, tb, lowest, highest, average, bidCount: tb.length };
    });
  };

  const handleDownload = () => {
    let csv = '';
    if (activeReport === 'tender-register') {
      const filtered = getFilteredTenders();
      csv = 'ID,Title,Category,Status,Published Date,Opening Date,Closing Date,Budget (GHS)\n' +
        filtered.map(t => `"${t.id}","${t.title}",${t.category},${t.status},${formatDate(t.publishedDate)},${formatDate(t.openingDate)},${formatDate(t.closingDate)},${t.estimatedBudget}`).join('\n');
    } else if (activeReport === 'supplier-register') {
      const filtered = getFilteredSuppliers();
      csv = 'ID,Company Name,Registration Number,Contact Person,Email,Phone,Status,Date Applied,Categories\n' +
        filtered.map(s => `"${s.id}","${s.companyName}",${s.registrationNumber || ''},"${s.contactPerson || ''}",${s.email},${s.phone || ''},${s.status},${formatDate(s.dateApplied)},"${Array.isArray(s.categories) ? s.categories.join(', ') : ''}"`).join('\n');
    } else if (activeReport === 'bid-summary') {
      const filtered = getFilteredBidSummary();
      csv = 'Tender ID,Tender Title,Status,Total Bids,Lowest Bid (GHS),Highest Bid (GHS),Average Bid (GHS)\n' +
        filtered.map(t => `"${t.id}","${t.title}",${t.status},${t.bidCount},${t.lowest},${t.highest},${t.average.toFixed(2)}`).join('\n');
    } else if (activeReport === 'awarded-contracts') {
      const awarded = getAwardedContracts();
      csv = 'Tender ID,Tender Title,Winner,Amount (GHS),Award Date\n' +
        awarded.map(a => `"${a.tenderId}","${a.tenderTitle}","${a.winnerName}",${a.amount},${formatDate(a.awardDate)}`).join('\n');
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `${activeReport}_${statusFilter !== 'All' ? statusFilter : 'All'}_${new Date().toISOString().split('T')[0]}.csv`; 
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <PortalLayout type="admin" title="Reports & Analytics" breadcrumb={['Admin', 'Reports']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  const awardedContracts = getAwardedContracts();
  const filteredTenders = getFilteredTenders();
  const filteredSuppliers = getFilteredSuppliers();
  const filteredBidSummary = getFilteredBidSummary();
  const statusOptions = getStatusOptions();

  return (
    <PortalLayout type="admin" title="Reports & Analytics" breadcrumb={['Admin', 'Reports']}>
      <div className="space-y-6 animate-fade-in">
        {/* Report Type Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {reports.map(r => (
            <button key={r.id} onClick={() => { setActiveReport(r.id); setStatusFilter('All'); }}
              className={`p-4 rounded-xl border text-left transition-all ${activeReport === r.id ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/30'}`}>
              <r.icon size={20} className={activeReport === r.id ? 'text-primary' : 'text-muted-foreground'} />
              <h4 className="font-semibold text-sm mt-2">{r.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm" />
              <span className="text-muted-foreground">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm" />
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm hover:bg-muted/70 transition-colors"
              >
                <Filter size={14} />
                Status: {statusFilter}
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                  {statusOptions.map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowStatusDropdown(false);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                        statusFilter === status ? 'bg-primary/10 text-primary' : ''
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button 
              onClick={resetFilters}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              title="Reset all filters"
            >
              <RotateCw size={14} className="text-muted-foreground" />
            </button>
          </div>

          {/* Download Button */}
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            <Download size={16} /> Download CSV
          </button>
        </div>

        {/* Reports Content */}
        <div className="glass-card overflow-hidden">
          {/* Tender Register Report */}
          {activeReport === 'tender-register' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Published</th>
                    <th className="text-left p-3">Opening</th>
                    <th className="text-left p-3">Closing</th>
                    <th className="text-right p-3">Budget</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenders.length > 0 ? (
                    filteredTenders.map(t => (
                      <tr key={t.id} className="border-b border-border/50">
                        <td className="p-3 font-mono text-xs">{t.id}</td>
                        <td className="p-3 font-medium">{t.title}</td>
                        <td className="p-3 text-muted-foreground">{t.category}</td>
                        <td className="p-3">{formatDate(t.publishedDate)}</td>
                        <td className="p-3">{formatDate(t.openingDate)}</td>
                        <td className="p-3">{formatDate(t.closingDate)}</td>
                        <td className="p-3 text-right">{formatCurrency(t.estimatedBudget)}</td>
                        <td className="p-3"><StatusBadge status={t.status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No tenders found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Bid Summary Report */}
          {activeReport === 'bid-summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3">Tender ID</th>
                    <th className="text-left p-3">Tender Title</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Total Bids</th>
                    <th className="text-right p-3">Lowest Bid</th>
                    <th className="text-right p-3">Highest Bid</th>
                    <th className="text-right p-3">Average Bid</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBidSummary.length > 0 ? (
                    filteredBidSummary.map(t => (
                      <tr key={t.id} className="border-b border-border/50">
                        <td className="p-3 font-mono text-xs">{t.id}</td>
                        <td className="p-3 font-medium">{t.title}</td>
                        <td className="p-3"><StatusBadge status={t.status} /></td>
                        <td className="p-3 text-right">{t.bidCount}</td>
                        <td className="p-3 text-right text-success">{formatCurrency(t.lowest)}</td>
                        <td className="p-3 text-right">{formatCurrency(t.highest)}</td>
                        <td className="p-3 text-right">{formatCurrency(t.average)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No tenders found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Supplier Register Report */}
          {activeReport === 'supplier-register' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3">Company</th>
                    <th className="text-left p-3">Reg Number</th>
                    <th className="text-left p-3">Contact Person</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Applied</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(s => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="p-3 font-medium">{s.companyName}</td>
                        <td className="p-3 text-xs font-mono">{s.registrationNumber || '—'}</td>
                        <td className="p-3">{s.contactPerson || '—'}</td>
                        <td className="p-3 text-muted-foreground">{s.email}</td>
                        <td className="p-3">{s.phone || '—'}</td>
                        <td className="p-3">{formatDate(s.dateApplied)}</td>
                        <td className="p-3"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No suppliers found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Awarded Contracts Report */}
          {activeReport === 'awarded-contracts' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3">Tender ID</th>
                    <th className="text-left p-3">Tender Title</th>
                    <th className="text-left p-3">Winner</th>
                    <th className="text-right p-3">Amount (GHS)</th>
                    <th className="text-left p-3">Award Date</th>
                  </tr>
                </thead>
                <tbody>
                  {awardedContracts.length > 0 ? (
                    awardedContracts.map((contract, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-3 font-mono text-xs">{contract.tenderId}</td>
                        <td className="p-3 font-medium">{contract.tenderTitle}</td>
                        <td className="p-3 font-medium text-success">{contract.winnerName}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(contract.amount)}</td>
                        <td className="p-3">{formatDate(contract.awardDate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No awarded contracts found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}