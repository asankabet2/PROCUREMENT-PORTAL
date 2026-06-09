import { useState, useEffect, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { Edit, Award, Loader2, X, Eye, XCircle, Split } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { 
    getTenderById, 
    getTenderInterests, 
    getBidsByTender, 
    getSuppliers, 
    updateBidStatus,
    getTenderItemAwards,
    awardTenderItem,
    splitAwardTenderItem,
    getAllTenderAwards,
    getEvaluationStatus
} from '@/services/api';
import ItemAwardModal, { type ItemAwardModalData } from './ItemAwardModal';
import SplitAwardModal from './SplitAwardModal';
import EvaluationCriteria from './EvaluationCriteria';
import EvaluationPanel from './EvaluationPanel';
import PreliminaryEvaluation from './PreliminaryEvaluation';
import TechnicalEvaluation from './TechnicalEvaluation';
import Responsiveness from './Responsiveness';

interface TenderItem {
    itemNo: number;
    TenderItemID: string;
    description: string;
    unit: string;
    quantity: number;
    estimatedUnitPrice: number;
    awarded?: boolean;
    awardedTo?: string;
    awardedSupplierName?: string;
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
    items: TenderItem[];
    awardedto?: string;
    awardamount?: number;
    awarddate?: string;
    awardnote?: string;
    awardedsupplier?: Supplier;
}

interface Supplier {
    id: string;
    companyName: string;
    contactPerson: string;
    categories: string[];
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
}

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
    submittedDate: string;
    grandTotal: number;
    status: string;
    items: BidItem[];
    supplier?: Supplier;
}

interface ExpressedInterest {
    supplierId: string;
    date: string;
    supplier?: Supplier;
}

function normaliseBid(raw: any, suppliers: Supplier[]): Bid {
    return {
        id:            raw.bidId  || raw.id,
        tenderId:      raw.tenderId,
        supplierId:    raw.supplierId,
        submittedDate: raw.submittedDate,
        grandTotal:    raw.grandTotal,
        status:        raw.status,
        items: (raw.items || []).map((item: any) => ({
            itemNo:      item.itemNo      ?? item.ItemNo,
            description: item.description ?? item.Description ?? '',
            unit:        item.unit        ?? item.Unit ?? '',
            quantity:    item.quantity    ?? item.Quantity ?? 0,
            unitPrice:   item.unitPrice   ?? item.UnitPrice ?? 0,
            total:       item.total       ?? item.Total ?? 0,
        })),
        supplier: suppliers.find(s => s.id === raw.supplierId),
    };
}

type TabKey =
    | 'info' | 'items'
    | 'participating' | 'submitting'
    | 'bids' | 'comparison' | 'bidders'
    | 'panel' | 'criteria' | 'prelim' | 'technical'
    | 'responsive' | 'nonresponsive';

const TAB_GROUPS: { key: TabKey; label: string }[][] = [
    [{ key: 'info', label: 'Tender Info' }, { key: 'items', label: 'Tender Items' }],
    [{ key: 'participating', label: 'Participating Tenderers' }, { key: 'submitting', label: 'Submitting Tenderers' }],
    [{ key: 'bids', label: 'Submitted Bids' }, { key: 'comparison', label: 'Bid Comparison' }, { key: 'bidders', label: 'Tender Bidders' }],
    [{ key: 'panel', label: 'Evaluation Panel' }, { key: 'criteria', label: 'Evaluation Criteria' }, { key: 'prelim', label: 'Preliminary Evaluation' }, { key: 'technical', label: 'Technical Evaluation' }],
    [{ key: 'responsive', label: 'Responsive Tenderers' }, { key: 'nonresponsive', label: 'Non-Responsive Tenderers' }],
];

export default function TenderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useNotification();

    const [tender, setTender] = useState<Tender | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [interests, setInterests] = useState<ExpressedInterest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('info');
    const [itemAwards, setItemAwards] = useState<Map<number, { awarded: boolean; supplierNames: string[] }>>(new Map());

    // Non-responsive supplier IDs from evaluation status — used to block awarding
    const [nonResponsiveIds, setNonResponsiveIds] = useState<string[]>([]);

    // Award modal for whole tender
    const [showAwardModal, setShowAwardModal] = useState(false);
    const [bidToAward, setBidToAward] = useState<Bid | null>(null);
    const [awardNote, setAwardNote] = useState('');
    const [awarding, setAwarding] = useState(false);

    // Reject bid modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [bidToReject, setBidToReject] = useState<Bid | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Item award modal
    const [showItemAwardModal, setShowItemAwardModal] = useState(false);
    const [itemAwardData, setItemAwardData] = useState<ItemAwardModalData | null>(null);
    const [awardingItem, setAwardingItem] = useState(false);

    // Split-award modal
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitData, setSplitData] = useState<ItemAwardModalData | null>(null);
    const [splitAllocations, setSplitAllocations] = useState<Record<string, number>>({});
    const [splitNote, setSplitNote] = useState('');
    const [splitting, setSplitting] = useState(false);

    const ITEMS_PER_PAGE = 10;
    const [itemsPage, setItemsPage] = useState(1);
    const [comparisonPage, setComparisonPage] = useState(1);

    const fetchAwards = useCallback(async () => {
        if (!id) return;
        try {
            const response = await getAllTenderAwards(id);
            const awards = response.data || [];
            const awardMap = new Map<number, { awarded: boolean; supplierNames: string[] }>();
            awards.forEach((award: any) => {
                const existing = awardMap.get(award.ItemNo);
                if (existing) {
                    existing.supplierNames.push(award.SupplierName);
                } else {
                    awardMap.set(award.ItemNo, { awarded: true, supplierNames: [award.SupplierName] });
                }
            });
            setItemAwards(awardMap);
        } catch (error) {
            console.error('Failed to fetch awards:', error);
        }
    }, [id]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [tenderRes, bidsRes, suppliersRes, interestsRes, evalStatusRes] = await Promise.all([
                getTenderById(id),
                getBidsByTender(id),
                getSuppliers(),
                getTenderInterests(id),
                getEvaluationStatus(id).catch(() => ({ data: null })),
            ]);

            const tenderData: Tender = tenderRes.data;
            const suppliersData: Supplier[] = suppliersRes.data || [];
            const rawBids: any[] = Array.isArray(bidsRes.data) ? bidsRes.data : [];
            const rawInterests: any[] = Array.isArray(interestsRes.data) ? interestsRes.data : [];

            const normalisedBids = rawBids.map(b => normaliseBid(b, suppliersData));

            if (tenderData.status === 'Awarded' && tenderData.awardedto) {
                tenderData.awardedsupplier = suppliersData.find(s => s.id === tenderData.awardedto);
            }

            setTender(tenderData);
            setBids(normalisedBids);
            setInterests(rawInterests.map(i => ({
                ...i,
                supplier: suppliersData.find(s => s.id === i.supplierId),
            })));

            if (evalStatusRes.data?.nonResponsiveSupplierIds) {
                setNonResponsiveIds(evalStatusRes.data.nonResponsiveSupplierIds);
            }

            await fetchAwards();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to load tender details', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, addToast, fetchAwards]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleViewItemAwards = async (itemNo: number) => {
        if (!id) return;
        try {
            const response = await getTenderItemAwards(id, itemNo);
            setItemAwardData(response.data);
            setShowItemAwardModal(true);
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to load item bids', 'error');
        }
    };

    const handleAwardItem = async (bidId: string, supplierId: string, quantity: number, unitPrice: number, total: number) => {
        if (!id || !itemAwardData) return;
        
        setAwardingItem(true);
        try {
            await awardTenderItem(id, itemAwardData.tenderItem.itemNo, {
                bidId,
                supplierId,
                awardedQuantity: quantity,
                awardedUnitPrice: unitPrice,
                awardedTotal: total,
                awardNote: ''
            });
            
            addToast(`Item "${itemAwardData.tenderItem.description}" awarded successfully!`, 'success');
            setShowItemAwardModal(false);
            setItemAwardData(null);
            await fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to award item', 'error');
        } finally {
            setAwardingItem(false);
        }
    };

    const handleViewSplit = async (itemNo: number) => {
        if (!id) return;
        try {
            const response = await getTenderItemAwards(id, itemNo);
            const data: ItemAwardModalData = response.data;
            setSplitData(data);
            const prefill: Record<string, number> = {};
            (data.existingAwards || []).forEach(a => { prefill[a.BidID] = a.AwardedQuantity; });
            setSplitAllocations(prefill);
            setSplitNote('');
            setShowSplitModal(true);
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to load item bids', 'error');
        }
    };

    const setAllocation = (bidId: string, qty: number) => {
        setSplitAllocations(prev => ({ ...prev, [bidId]: qty }));
    };

    const handleSubmitSplit = async () => {
        if (!id || !splitData) return;
        const allocations = splitData.bids
            .filter(b => (splitAllocations[b.BidID] || 0) > 0)
            .map(b => ({
                bidId: b.BidID,
                supplierId: b.SupplierID,
                awardedQuantity: splitAllocations[b.BidID],
            }));

        setSplitting(true);
        try {
            await splitAwardTenderItem(id, splitData.tenderItem.itemNo, { allocations, awardNote: splitNote });
            addToast(`Item "${splitData.tenderItem.description}" split-awarded successfully!`, 'success');
            setShowSplitModal(false);
            setSplitData(null);
            setSplitAllocations({});
            await fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to split-award item', 'error');
        } finally {
            setSplitting(false);
        }
    };

    const handleAwardTender = async () => {
        if (!bidToAward) return;
        setAwarding(true);
        try {
            await updateBidStatus(bidToAward.id, { status: 'Awarded', note: awardNote });
            addToast('Tender awarded successfully', 'success');
            setShowAwardModal(false);
            setBidToAward(null);
            setAwardNote('');
            await fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to award tender', 'error');
        } finally {
            setAwarding(false);
        }
    };

    const handleRejectBid = async () => {
        if (!bidToReject) return;
        setRejecting(true);
        try {
            await updateBidStatus(bidToReject.id, { status: 'Rejected', note: rejectNote });
            addToast('Bid rejected successfully', 'success');
            setShowRejectModal(false);
            setBidToReject(null);
            setRejectNote('');
            await fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to reject bid', 'error');
        } finally {
            setRejecting(false);
        }
    };

    const lowestBid = [...bids].sort((a, b) => a.grandTotal - b.grandTotal)[0];
    const canAward  = tender?.status === 'Closed';
    const canReject = tender?.status === 'Closed' || tender?.status === 'Open';

    if (loading) return (
        <PortalLayout type="admin" title="Loading..." breadcrumb={['Admin', 'Tenders', id || '']}>
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </PortalLayout>
    );

    if (!tender) return (
        <PortalLayout type="admin" title="Not Found" breadcrumb={['Admin', 'Tenders']}>
            <EmptyState title="Tender Not Found" description="The tender you're looking for doesn't exist." />
        </PortalLayout>
    );

    const getItemAwardStatus = (itemNo: number) => {
        const award = itemAwards.get(itemNo);
        if (award) {
            return { awarded: true, supplierNames: award.supplierNames };
        }
        return { awarded: false, supplierNames: [] as string[] };
    };

    const allItems       = tender.items || [];
    const totalItemPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
    const safeItemsPage  = Math.min(itemsPage, totalItemPages);
    const pagedItems     = allItems.slice((safeItemsPage - 1) * ITEMS_PER_PAGE, safeItemsPage * ITEMS_PER_PAGE);

    const safeComparisonPage = Math.min(comparisonPage, totalItemPages);
    const pagedComparison    = allItems.slice((safeComparisonPage - 1) * ITEMS_PER_PAGE, safeComparisonPage * ITEMS_PER_PAGE);

    const bidBySupplier = new Map(bids.map(b => [b.supplierId, b]));
    const tenderBidders = interests.map(p => {
        const bid = bidBySupplier.get(p.supplierId);
        return {
            supplierId:    p.supplierId,
            companyName:   p.supplier?.companyName || '—',
            contactPerson: p.supplier?.contactPerson || '—',
            interestDate:  p.date,
            bid,
            bidSubmitted:  !!bid,
            outcome:       bid ? bid.status : 'No Bid',
        };
    });

    return (
        <PortalLayout type="admin" title={tender.title} breadcrumb={['Admin', 'Tenders', tender.id]}>
            <div className="space-y-6 animate-fade-in">

                {/* Header meta */}
                <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={tender.status as any} />
                    <span className="text-sm text-muted-foreground font-mono">{tender.id}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{tender.category}</span>
                </div>

                {/* Tab bar (grouped) */}
                <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 overflow-x-auto">
                    {TAB_GROUPS.map((group, gi) => (
                        <Fragment key={gi}>
                            {gi > 0 && <div className="w-px h-5 bg-border mx-1 shrink-0" />}
                            {group.map(t => (
                                <button key={t.key} onClick={() => setActiveTab(t.key)}
                                    className={`px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </Fragment>
                    ))}
                </div>

                {/* Tab: Tender Info */}
                {activeTab === 'info' && (
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold">Tender Details</h3>
                            <button onClick={() => navigate(`/admin/tenders/edit/${tender.id}`)}
                                className="flex items-center gap-1 text-sm text-primary hover:underline">
                                <Edit size={14} /> Edit
                            </button>
                        </div>
                        <p className="text-muted-foreground">{tender.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                            {[
                                ['Published', formatDate(tender.publishedDate)],
                                ['Opening', formatDate(tender.openingDate)],
                                ['Closing', formatDate(tender.closingDate)],
                                ['Est. Budget', formatCurrency(tender.estimatedBudget)],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="font-medium">{value}</p>
                                </div>
                            ))}
                        </div>
                        {tender.status === 'Awarded' && tender.awardedto && (
                            <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-3">
                                    <Award size={18} className="text-success" />
                                    <p className="text-sm font-medium text-success">Tender Awarded</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Awarded to</span>
                                        <p className="font-medium">{tender.awardedsupplier?.companyName || tender.awardedto}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Award Amount</span>
                                        <p className="font-medium">{formatCurrency(tender.awardamount || 0)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Award Date</span>
                                        <p className="font-medium">{formatDate(tender.awarddate)}</p>
                                    </div>
                                    {tender.awardnote && (
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Note</span>
                                            <p className="text-sm mt-1">{tender.awardnote}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Tender Items */}
                {activeTab === 'items' && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Tender Items ({tender.items?.length || 0})</h3>
                        </div>
                        {!tender.items?.length ? (
                            <EmptyState title="No Items" description="No items have been added to this tender." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Qty</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Est. Unit Price</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedItems.map(item => (
                                            <tr key={item.itemNo} className="border-b border-border/50">
                                                <td className="p-3">{item.itemNo}</td>
                                                <td className="p-3">{item.description}</td>
                                                <td className="p-3">{item.unit}</td>
                                                <td className="p-3 text-right">{item.quantity}</td>
                                                <td className="p-3 text-right">{formatCurrency(item.estimatedUnitPrice)}</td>
                                                <td className="p-3 text-right font-medium">{formatCurrency(item.quantity * item.estimatedUnitPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/30">
                                            <td colSpan={5} className="p-3 text-right font-bold">Total Estimate</td>
                                            <td className="p-3 text-right font-bold">
                                                {formatCurrency(tender.items.reduce((sum, i) => sum + i.quantity * i.estimatedUnitPrice, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <Pagination page={safeItemsPage} totalPages={totalItemPages} total={allItems.length} onPageChange={setItemsPage} />
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Participating Tenderers */}
                {activeTab === 'participating' && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Participating Tenderers ({interests.length})</h3>
                        </div>
                        {interests.length === 0 ? (
                            <EmptyState title="No Participants" description="No suppliers have expressed interest yet." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">Supplier ID</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Company Name</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Contact Person</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Categories</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interests.map(p => (
                                            <tr key={p.supplierId} className="border-b border-border/50">
                                                <td className="p-3 font-mono text-xs">{p.supplierId}</td>
                                                <td className="p-3 font-medium">{p.supplier?.companyName || '—'}</td>
                                                <td className="p-3">{p.supplier?.contactPerson || '—'}</td>
                                                <td className="p-3 text-muted-foreground text-xs">{p.supplier?.categories?.join(', ') || '—'}</td>
                                                <td className="p-3 text-muted-foreground">{formatDate(p.date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Submitted Bids */}
                {activeTab === 'bids' && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Submitted Bids ({bids.length})</h3>
                        </div>
                        {bids.length === 0 ? (
                            <EmptyState title="No Bids" description="No bids have been submitted yet." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">Bid Ref</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Contact Person</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Grand Total</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bids.map(b => {
                                            const isLowest = b.id === lowestBid?.id && b.status === 'Submitted';
                                            return (
                                                <tr key={b.id} className={`border-b border-border/50 ${isLowest ? 'bg-success/5' : ''}`}>
                                                    <td className="p-3 font-mono text-xs">{b.id}</td>
                                                    <td className="p-3 font-medium">{b.supplier?.companyName || b.supplierId}</td>
                                                    <td className="p-3">{b.supplier?.contactPerson || '—'}</td>
                                                    <td className="p-3 text-muted-foreground">{formatDate(b.submittedDate)}</td>
                                                    <td className="p-3 text-right font-medium">{formatCurrency(b.grandTotal)}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <StatusBadge status={b.status as any} />
                                                            {isLowest && <span className="text-xs text-success">(Lowest)</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => navigate(`/admin/tenders/${id}/bids/${b.id}`)}
                                                                className="flex items-center gap-1 px-2 py-1 bg-muted/50 hover:bg-muted text-xs rounded transition-colors"
                                                                title="View item breakdown"
                                                            >
                                                                <Eye size={12} /> View
                                                            </button>
                                                            {b.status === 'Submitted' && (
                                                                <>
                                                                    {canAward && (
                                                                        <button
                                                                            onClick={() => { setBidToAward(b); setAwardNote(''); setShowAwardModal(true); }}
                                                                            className="flex items-center gap-1 px-2 py-1 bg-success text-success-foreground rounded text-xs hover:bg-success/80 transition-colors"
                                                                        >
                                                                            <Award size={12} /> Award Tender
                                                                        </button>
                                                                    )}
                                                                    {canReject && (
                                                                        <button
                                                                            onClick={() => { setBidToReject(b); setRejectNote(''); setShowRejectModal(true); }}
                                                                            className="flex items-center gap-1 px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/80 transition-colors"
                                                                        >
                                                                            <XCircle size={12} /> Reject
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Bid Comparison */}
                {activeTab === 'comparison' && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Bid Comparison by Item</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Click "View Bids" to see all supplier quotes for each item and award individually.</p>
                            {!canAward && (
                                <p className="text-xs text-red-500 mt-1">Awarding is only available once the tender is Closed.</p>
                            )}
                        </div>
                        {!tender.items?.length ? (
                            <EmptyState title="No Items" description="No items have been added to this tender." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Qty</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Est. Unit Price</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                                            <th className="text-center p-3 font-medium text-muted-foreground">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedComparison.map(item => {
                                            const awardStatus = getItemAwardStatus(item.itemNo);
                                            return (
                                                <tr key={item.itemNo} className="border-b border-border/50 hover:bg-muted/20">
                                                    <td className="p-3">{item.itemNo}</td>
                                                    <td className="p-3 font-medium">{item.description}</td>
                                                    <td className="p-3 text-muted-foreground">{item.unit}</td>
                                                    <td className="p-3 text-right">{item.quantity}</td>
                                                    <td className="p-3 text-right">{formatCurrency(item.estimatedUnitPrice)}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <StatusBadge status={awardStatus.awarded ? 'Awarded' : 'Pending'} />
                                                            {awardStatus.awarded && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {awardStatus.supplierNames.length > 1
                                                                        ? `split: ${awardStatus.supplierNames.join(', ')}`
                                                                        : `to ${awardStatus.supplierNames[0]}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleViewItemAwards(item.itemNo)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs hover:bg-primary/20 transition-colors"
                                                            >
                                                                <Eye size={12} /> View Bids
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewSplit(item.itemNo)}
                                                                disabled={!canAward}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted/50 text-foreground rounded-md text-xs hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title={canAward ? "Split this item's quantity across multiple suppliers" : 'Tender must be Closed to award'}
                                                            >
                                                                <Split size={12} /> Split Award
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <Pagination page={safeComparisonPage} totalPages={totalItemPages} total={allItems.length} onPageChange={setComparisonPage} />
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Submitting Tenderers */}
                {activeTab === 'submitting' && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Submitting Tenderers</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Suppliers who expressed interest and whether they went on to submit a bid.</p>
                        </div>
                        {tenderBidders.length === 0 ? (
                            <EmptyState title="No Tenderers" description="No suppliers have expressed interest in this tender yet." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">Supplier ID</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Company Name</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Contact</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Interest Date</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Bid Submitted</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenderBidders.map(r => (
                                            <tr key={r.supplierId} className="border-b border-border/50">
                                                <td className="p-3 font-mono text-xs">{r.supplierId}</td>
                                                <td className="p-3 font-medium">{r.companyName}</td>
                                                <td className="p-3">{r.contactPerson}</td>
                                                <td className="p-3 text-muted-foreground">{formatDate(r.interestDate)}</td>
                                                <td className="p-3">
                                                    {r.bidSubmitted
                                                        ? <span className="text-xs text-success">Yes — {r.bid?.id}</span>
                                                        : <span className="text-xs text-muted-foreground">No</span>}
                                                </td>
                                                <td className="p-3"><StatusBadge status={(r.bidSubmitted ? 'Submitted' : 'Pending') as any} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Tender Bidders */}
                {activeTab === 'bidders' && (
                    <div className="glass-card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Tender Bidders</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">All suppliers who expressed interest, and their bid outcome.</p>
                        </div>
                        {tenderBidders.length === 0 ? (
                            <EmptyState title="No Bidders" description="No suppliers have expressed interest in this tender yet." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left p-3 font-medium text-muted-foreground">Supplier ID</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Company Name</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Bid Ref</th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">Grand Total</th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenderBidders.map(r => (
                                            <tr key={r.supplierId} className="border-b border-border/50">
                                                <td className="p-3 font-mono text-xs">{r.supplierId}</td>
                                                <td className="p-3 font-medium">{r.companyName}</td>
                                                <td className="p-3 font-mono text-xs">{r.bid?.id || '—'}</td>
                                                <td className="p-3 text-right font-medium">{r.bid ? formatCurrency(r.bid.grandTotal) : '—'}</td>
                                                <td className="p-3">
                                                    {r.bidSubmitted
                                                        ? <StatusBadge status={r.outcome as any} />
                                                        : <span className="text-xs text-muted-foreground">No Bid</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'panel'        && <EvaluationPanel tenderId={id || ''} />}
                {activeTab === 'criteria'     && <EvaluationCriteria tenderId={id || ''} />}
                {activeTab === 'prelim'       && <PreliminaryEvaluation tenderId={id || ''} />}
                {activeTab === 'technical'    && <TechnicalEvaluation tenderId={id || ''} />}
                {activeTab === 'responsive'   && <Responsiveness tenderId={id || ''} view="responsive" />}
                {activeTab === 'nonresponsive'&& <Responsiveness tenderId={id || ''} view="nonresponsive" />}
            </div>

            {/* Award Tender Modal */}
            {showAwardModal && bidToAward && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-lg font-bold">Award Tender</h2>
                            <button onClick={() => { setShowAwardModal(false); setBidToAward(null); setAwardNote(''); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Award the entire tender to: <span className="font-semibold text-foreground">{bidToAward.supplier?.companyName || bidToAward.supplierId}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">Award Amount: <span className="font-medium text-foreground">{formatCurrency(bidToAward.grandTotal)}</span></p>
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600">
                                This awards the whole tender to this supplier and marks the tender as Awarded. Use the Bid Comparison tab instead if you want to award items individually.
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Award Note (Optional)</label>
                                <textarea value={awardNote} onChange={e => setAwardNote(e.target.value)} rows={3}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                                    placeholder="Add a note about this award..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-border">
                            <button onClick={() => { setShowAwardModal(false); setBidToAward(null); setAwardNote(''); }} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                            <button onClick={handleAwardTender} disabled={awarding}
                                className="flex items-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                                {awarding ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                                {awarding ? 'Awarding...' : 'Confirm Award'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Bid Modal */}
            {showRejectModal && bidToReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-lg font-bold">Reject Bid</h2>
                            <button onClick={() => { setShowRejectModal(false); setBidToReject(null); setRejectNote(''); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Rejecting bid from: <span className="font-semibold text-foreground">{bidToReject.supplier?.companyName || bidToReject.supplierId}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">Amount: <span className="font-medium text-foreground">{formatCurrency(bidToReject.grandTotal)}</span></p>
                            <div>
                                <label className="block text-sm font-medium mb-2">Rejection Note (Optional)</label>
                                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                                    placeholder="Add a note about why this bid is being rejected..." />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-border">
                            <button onClick={() => { setShowRejectModal(false); setBidToReject(null); setRejectNote(''); }} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                            <button onClick={handleRejectBid} disabled={rejecting}
                                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                                {rejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Award Modal */}
            {showItemAwardModal && itemAwardData && (
                <ItemAwardModal
                    data={itemAwardData}
                    canAward={canAward}
                    awarding={awardingItem}
                    nonResponsiveSupplierIds={nonResponsiveIds}
                    onAward={handleAwardItem}
                    onClose={() => { setShowItemAwardModal(false); setItemAwardData(null); }}
                />
            )}

            {/* Split Award Modal */}
            {showSplitModal && splitData && (
                <SplitAwardModal
                    data={splitData}
                    allocations={splitAllocations}
                    note={splitNote}
                    submitting={splitting}
                    canAward={canAward}
                    nonResponsiveSupplierIds={nonResponsiveIds}
                    onAllocationChange={setAllocation}
                    onNoteChange={setSplitNote}
                    onClose={() => { setShowSplitModal(false); setSplitData(null); setSplitAllocations({}); }}
                    onSubmit={handleSubmitSplit}
                />
            )}

        </PortalLayout>
    );
}

function Pagination({ page, totalPages, total, onPageChange }: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between p-3 border-t border-border text-sm">
            <span className="text-muted-foreground">
                Page {page} of {totalPages} · {total} items
            </span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
        </div>
    );
}