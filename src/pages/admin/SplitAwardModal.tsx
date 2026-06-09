import { Loader2, X, XCircle, Split } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import type { ItemAwardModalData } from './ItemAwardModal';

interface SplitAwardModalProps {
    data: ItemAwardModalData;
    allocations: Record<string, number>; // keyed by BidID
    note: string;
    submitting: boolean;
    canAward: boolean;
    nonResponsiveSupplierIds?: string[];
    onAllocationChange: (bidId: string, qty: number) => void;
    onNoteChange: (note: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export default function SplitAwardModal({
    data,
    allocations,
    note,
    submitting,
    canAward,
    nonResponsiveSupplierIds = [],
    onAllocationChange,
    onNoteChange,
    onClose,
    onSubmit,
}: SplitAwardModalProps) {
    const nonResponsive  = new Set(nonResponsiveSupplierIds);
    const required       = data.tenderItem.quantity;
    const allocated      = data.bids.reduce((sum, b) => sum + (allocations[b.BidID] || 0), 0);
    const remaining      = required - allocated;
    const fullyAllocated = Math.abs(remaining) < 0.001 && allocated > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                <div className="flex items-start justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold">Split Award — {data.tenderItem.description}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Allocate the full tender quantity of{' '}
                            <span className="font-medium">{required} {data.tenderItem.unit}</span> across suppliers.
                            Each supplier is capped at the quantity they bid.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {data.bids.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No suppliers have bid on this item.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Bid Qty (max)</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Unit Price</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Award Qty</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.bids.map((bid, idx) => {
                                    const isRejected = bid.BidStatus === 'Rejected';
                                    const isNonResponsive = nonResponsive.has(bid.SupplierID);
                                    const blocked = isRejected || isNonResponsive;
                                    const qty = allocations[bid.BidID] || 0;
                                    return (
                                        <tr key={idx} className={`border-b border-border/50 ${blocked ? 'opacity-60' : ''}`}>
                                            <td className="p-3 font-medium">
                                                {bid.CompanyName}
                                                <div className="text-xs text-muted-foreground">Contact: {bid.ContactPerson}</div>
                                            </td>
                                            <td className="p-3 text-right">{bid.Quantity.toLocaleString()}</td>
                                            <td className="p-3 text-right">{formatCurrency(bid.UnitPrice)}</td>
                                            <td className="p-3 text-right">
                                                {isRejected ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive rounded text-xs"><XCircle size={10} /> Rejected</span>
                                                ) : isNonResponsive ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive rounded text-xs" title="Non-responsive in evaluation — cannot be awarded."><XCircle size={10} /> Non-Responsive</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={bid.Quantity}
                                                        step="1"
                                                        value={qty || ''}
                                                        onChange={e => onAllocationChange(bid.BidID, Math.min(parseFloat(e.target.value) || 0, bid.Quantity))}
                                                        className="w-24 ml-auto block px-2 py-1.5 bg-muted/50 border border-border rounded text-sm text-right outline-none focus:ring-1 focus:ring-primary"
                                                        placeholder="0"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-medium">{formatCurrency(qty * bid.UnitPrice)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-4 border-t border-border space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                        <span>Required: <span className="font-medium">{required}</span></span>
                        <span>Allocated: <span className="font-medium">{allocated}</span></span>
                        <span className={Math.abs(remaining) < 0.001 ? 'text-success' : 'text-amber-500'}>
                            Remaining: <span className="font-medium">{remaining}</span>
                        </span>
                    </div>
                    <input
                        value={note}
                        onChange={e => onNoteChange(e.target.value)}
                        placeholder="Award note (optional)"
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-muted rounded-lg text-sm">Cancel</button>
                        <button
                            onClick={onSubmit}
                            disabled={submitting || !fullyAllocated || !canAward}
                            title={!canAward ? 'Tender must be Closed to award' : (fullyAllocated ? '' : 'Allocate exactly the full tender quantity to enable')}
                            className="flex items-center gap-2 px-5 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Split size={14} />}
                            {submitting ? 'Awarding...' : 'Confirm Split Award'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
