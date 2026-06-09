import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import EmptyState from '@/components/EmptyState';
import { useNotification } from '@/context/NotificationContext';
import { getBidById, getTenderById } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Loader2, ArrowLeft, Search } from 'lucide-react';

interface BidItem {
    itemNo: number;
    unitPrice: number;
}

interface TenderItem {
    itemNo: number;
    tenderItemId?: string;
    description: string;
    unit: string;
    quantity: number;
}

interface Bid {
    bidId: string;
    tenderId: string;
    tenderTitle?: string;
    supplierId: string;
    supplierName?: string;
    submittedDate?: string;
    grandTotal: number;
    status: string;
    items?: BidItem[];
}

const PAGE_SIZE = 50;

export default function BidBreakdown() {
    const { id: tenderId, bidId } = useParams();
    const navigate = useNavigate();
    const { addToast } = useNotification();

    const [loading, setLoading] = useState(true);
    const [bid, setBid] = useState<Bid | null>(null);
    const [tenderItems, setTenderItems] = useState<TenderItem[]>([]);

    const [search, setSearch] = useState('');
    const [quotedOnly, setQuotedOnly] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            if (!bidId) return;
            setLoading(true);
            try {
                const bidRes = await getBidById(bidId);
                const bidData: Bid = bidRes.data;
                setBid(bidData);

                const tId = tenderId || bidData.tenderId;
                if (tId) {
                    const tenderRes = await getTenderById(tId);
                    setTenderItems(tenderRes.data.items || []);
                }
            } catch (err: any) {
                addToast(err.response?.data?.message || 'Failed to load bid breakdown', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [bidId, tenderId, addToast]);

    // Quick lookup of the supplier's quote per tender item
    const bidItemMap = useMemo(() => {
        const m = new Map<number, BidItem>();
        (bid?.items || []).forEach(bi => m.set(bi.itemNo, bi));
        return m;
    }, [bid]);

    const searchTerm = search.trim().toLowerCase();
    const filteredItems = useMemo(() => {
        return tenderItems.filter(item => {
            const bidItem = bidItemMap.get(item.itemNo);
            if (quotedOnly && !(bidItem && bidItem.unitPrice > 0)) return false;
            if (!searchTerm) return true;
            return (
                String(item.itemNo).includes(searchTerm) ||
                (item.description || '').toLowerCase().includes(searchTerm)
            );
        });
    }, [tenderItems, bidItemMap, quotedOnly, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pagedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Reset to first page whenever the filters change
    useEffect(() => { setPage(1); }, [searchTerm, quotedOnly]);

    if (loading) {
        return (
            <PortalLayout type="admin" title="Bid Breakdown" breadcrumb={['Admin', 'Tenders', tenderId || '', 'Bid']}>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </PortalLayout>
        );
    }

    if (!bid) {
        return (
            <PortalLayout type="admin" title="Bid Breakdown" breadcrumb={['Admin', 'Tenders', tenderId || '', 'Bid']}>
                <EmptyState title="Bid Not Found" description="This bid doesn't exist or could not be loaded." />
            </PortalLayout>
        );
    }

    const quotedCount = (bid.items || []).filter(i => i.unitPrice > 0).length;

    return (
        <PortalLayout type="admin" title="Bid Breakdown" breadcrumb={['Admin', 'Tenders', bid.tenderId, 'Bid']}>
            <div className="space-y-4 animate-fade-in">
                <button
                    onClick={() => navigate(`/admin/tenders/${bid.tenderId}`)}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft size={14} /> Back to Tender
                </button>

                {/* Summary */}
                <div className="glass-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold">{bid.supplierName || bid.supplierId}</h2>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">Ref: {bid.bidId}</p>
                            {bid.tenderTitle && <p className="text-sm text-muted-foreground mt-1">{bid.tenderTitle}</p>}
                            {bid.submittedDate && <p className="text-xs text-muted-foreground mt-0.5">Submitted {formatDate(bid.submittedDate)}</p>}
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Grand Total</p>
                            <p className="text-xl font-bold text-success">{formatCurrency(bid.grandTotal)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{quotedCount} of {tenderItems.length} items quoted</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={quotedOnly} onChange={e => setQuotedOnly(e.target.checked)} className="accent-primary" />
                        Quoted items only
                    </label>
                    <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2">
                        <Search size={16} className="text-muted-foreground" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by item # or description..."
                            className="bg-transparent text-sm outline-none w-56"
                        />
                    </div>
                </div>

                {/* Items table */}
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/30">
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Item Code</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Bid Qty</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Bid Unit Price</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                            No items match your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    pagedItems.map(item => {
                                        const bidItem = bidItemMap.get(item.itemNo);
                                        const unitPrice = bidItem?.unitPrice ?? null;
                                        const total = unitPrice !== null ? unitPrice * item.quantity : null;
                                        return (
                                            <tr key={item.itemNo} className="border-b border-border/50 hover:bg-muted/20">
                                                <td className="p-3 text-muted-foreground">{item.itemNo}</td>
                                                <td className="p-3 font-mono text-xs">{item.tenderItemId || '—'}</td>
                                                <td className="p-3 font-medium">{item.description}</td>
                                                <td className="p-3 text-muted-foreground">{item.unit}</td>
                                                <td className="p-3 text-right">{item.quantity.toLocaleString()}</td>
                                                <td className="p-3 text-right">
                                                    {unitPrice !== null
                                                        ? <span className="font-mono">{formatCurrency(unitPrice)}</span>
                                                        : <span className="text-amber-500 text-xs italic">Not quoted</span>}
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {total !== null ? formatCurrency(total) : <span className="text-muted-foreground">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="bg-muted/20 border-t border-border">
                                    <td colSpan={6} className="p-3 text-right font-bold">Grand Total</td>
                                    <td className="p-3 text-right font-bold text-success">{formatCurrency(bid.grandTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-3 border-t border-border text-sm">
                            <span className="text-muted-foreground">
                                Page {safePage} of {totalPages} · {filteredItems.length} items
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Go to</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                        value={safePage}
                                        onChange={e => {
                                            const n = parseInt(e.target.value);
                                            if (!isNaN(n)) setPage(Math.min(Math.max(1, n), totalPages));
                                        }}
                                        className="w-16 px-2 py-1.5 bg-muted/50 border border-border rounded text-sm text-center outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PortalLayout>
    );
}
