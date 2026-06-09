import { Award, Loader2, X, XCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';

export interface ItemAwardModalData {
    tenderItem: {
        id: string;
        itemNo: number;
        description: string;
        unit: string;
        quantity: number;
        estimatedUnitPrice: number;
    };
    bids: Array<{
        BidID: string;
        SupplierID: string;
        CompanyName: string;
        ContactPerson: string;
        Quantity: number;
        UnitPrice: number;
        Total: number;
        BidStatus: string;
    }>;
    existingAward: {
        AwardID: string;
        BidID: string;
        SupplierID: string;
        AwardedQuantity: number;
        AwardedUnitPrice: number;
        AwardedTotal: number;
    } | null;
    existingAwards?: Array<{
        AwardID: string;
        BidID: string;
        SupplierID: string;
        AwardedQuantity: number;
        AwardedUnitPrice: number;
        AwardedTotal: number;
    }>;
}

interface ItemAwardModalProps {
    data: ItemAwardModalData;
    canAward: boolean;
    awarding: boolean;
    nonResponsiveSupplierIds?: string[];
    onAward: (bidId: string, supplierId: string, quantity: number, unitPrice: number, total: number) => void;
    onClose: () => void;
}

export default function ItemAwardModal({ data, canAward, awarding, nonResponsiveSupplierIds = [], onAward, onClose }: ItemAwardModalProps) {
    const nonResponsive = new Set(nonResponsiveSupplierIds);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex items-start justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold">{data.tenderItem.description}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tender Quantity: <span className="font-medium">{data.tenderItem.quantity} {data.tenderItem.unit}</span>
                            {data.tenderItem.estimatedUnitPrice && (
                                <> • Est. Unit Price: <span className="font-medium">{formatCurrency(data.tenderItem.estimatedUnitPrice)}</span></>
                            )}
                        </p>
                        {!canAward && (
                            <p className="text-xs text-red-500 mt-1">Awarding is only available once the tender is Closed.</p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {data.bids.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No suppliers have bid on this item.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 font-medium text-muted-foreground">Supplier</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Bid Qty</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Bid Unit Price</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Total Bid</th>
                                    <th className="text-center p-3 font-medium text-muted-foreground">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.bids.map((bid, idx) => {
                                    const isAwarded = data.existingAward?.BidID === bid.BidID;
                                    const isRejected = bid.BidStatus === 'Rejected';
                                    const isNonResponsive = nonResponsive.has(bid.SupplierID);
                                    const blocked = isRejected || isNonResponsive;
                                    return (
                                        <tr key={idx} className={`border-b border-border/50 hover:bg-muted/20 ${isAwarded ? 'bg-success/5' : ''} ${blocked ? 'opacity-60' : ''}`}>
                                            <td className="p-3 font-medium">
                                                {bid.CompanyName}
                                                <div className="text-xs text-muted-foreground">Contact: {bid.ContactPerson}</div>
                                            </td>
                                            <td className="p-3 text-right">{bid.Quantity.toLocaleString()}</td>
                                            <td className="p-3 text-right">{formatCurrency(bid.UnitPrice)}</td>
                                            <td className="p-3 text-right font-medium">{formatCurrency(bid.Total)}</td>
                                            <td className="p-3 text-center">
                                                {isAwarded ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded text-xs">
                                                        <CheckCircle size={10} /> Awarded
                                                    </span>
                                                ) : isRejected ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive rounded text-xs" title="This supplier's bid was rejected and cannot be awarded.">
                                                        <XCircle size={10} /> Rejected
                                                    </span>
                                                ) : isNonResponsive ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive rounded text-xs" title="This supplier was found non-responsive in evaluation and cannot be awarded.">
                                                        <XCircle size={10} /> Non-Responsive
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => onAward(bid.BidID, bid.SupplierID, bid.Quantity, bid.UnitPrice, bid.Total)}
                                                        disabled={awarding || !canAward}
                                                        title={canAward ? '' : 'Tender must be Closed to award'}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-success text-success-foreground rounded text-xs hover:bg-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {awarding ? <Loader2 size={10} className="animate-spin" /> : <Award size={10} />}
                                                        Award Item
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end p-3 border-t border-border bg-muted/20">
                    <button onClick={onClose} className="px-4 py-2 bg-muted rounded-lg text-sm">Close</button>
                </div>
            </div>
        </div>
    );
}
