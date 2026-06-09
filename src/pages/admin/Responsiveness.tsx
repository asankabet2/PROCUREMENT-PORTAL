import { useState, useEffect, useCallback } from 'react';
import { Loader2, ClipboardCheck, XCircle } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import EmptyState from '@/components/EmptyState';
import { getResponsiveness } from '@/services/api';

interface Row {
    bidId: string;
    supplierId: string;
    company: string;
    prelimOutcome: string;
    techOutcome: string;
    techTotal: number | null;
    status: string;   // Responsive | Non-Responsive | Pending
    reason: string;
}

interface Props {
    tenderId: string;
    view: 'responsive' | 'nonresponsive';
}

function outcomeBadge(o: string) {
    switch (o) {
        case 'Pass': return 'bg-success/15 text-success';
        case 'Fail': return 'bg-destructive/15 text-destructive';
        default:     return 'bg-amber-500/15 text-amber-600';
    }
}

export default function Responsiveness({ tenderId, view }: Props) {
    const { addToast } = useNotification();
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!tenderId) return;
        setLoading(true);
        try {
            const { data } = await getResponsiveness(tenderId);
            setRows(Array.isArray(data.rows) ? data.rows : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load responsiveness', 'error');
        } finally {
            setLoading(false);
        }
    }, [tenderId, addToast]);

    useEffect(() => { load(); }, [load]);

    const pendingCount = rows.filter(r => r.status === 'Pending').length;
    const isResponsive = view === 'responsive';

    // Responsive bidders ranked best-first by technical score.
    const responsive = rows
        .filter(r => r.status === 'Responsive')
        .sort((a, b) => (b.techTotal ?? 0) - (a.techTotal ?? 0));
    const nonResponsive = rows.filter(r => r.status === 'Non-Responsive');

    if (loading) {
        return <div className="glass-card flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
                {isResponsive
                    ? <ClipboardCheck size={16} className="text-success" />
                    : <XCircle size={16} className="text-destructive" />}
                <div>
                    <h3 className="font-bold">{isResponsive ? 'Responsive Tenderers' : 'Non-Responsive Tenderers'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isResponsive
                            ? 'Bidders who passed both preliminary and technical evaluation, ranked by technical score.'
                            : 'Bidders who failed preliminary or technical evaluation.'}
                    </p>
                </div>
            </div>

            {pendingCount > 0 && (
                <div className="m-4 flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600">
                    <span>{pendingCount} bidder(s) are still awaiting evaluation and aren't classified yet.</span>
                </div>
            )}

            {isResponsive ? (
                responsive.length === 0 ? (
                    <EmptyState title="No Responsive Tenderers" description="Bidders who pass both preliminary and technical evaluation will appear here." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left p-3 font-medium text-muted-foreground">Rank</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Bidder</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Preliminary</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Technical</th>
                                    <th className="text-right p-3 font-medium text-muted-foreground">Technical Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {responsive.map((r, i) => (
                                    <tr key={r.bidId} className="border-b border-border/50">
                                        <td className="p-3 font-bold text-muted-foreground">{i + 1}</td>
                                        <td className="p-3 font-medium">
                                            {r.company}
                                            <div className="text-xs text-muted-foreground font-mono">{r.bidId}</div>
                                        </td>
                                        <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadge(r.prelimOutcome)}`}>{r.prelimOutcome}</span></td>
                                        <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadge(r.techOutcome)}`}>{r.techOutcome}</span></td>
                                        <td className="p-3 text-right font-bold">{r.techTotal ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                nonResponsive.length === 0 ? (
                    <EmptyState title="No Non-Responsive Tenderers" description="Bidders who fail preliminary or technical evaluation will appear here." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left p-3 font-medium text-muted-foreground">Bidder</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Reason</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Preliminary</th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Technical</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nonResponsive.map(r => (
                                    <tr key={r.bidId} className="border-b border-border/50">
                                        <td className="p-3 font-medium">
                                            {r.company}
                                            <div className="text-xs text-muted-foreground font-mono">{r.bidId}</div>
                                        </td>
                                        <td className="p-3 text-destructive">{r.reason}</td>
                                        <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadge(r.prelimOutcome)}`}>{r.prelimOutcome}</span></td>
                                        <td className="p-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadge(r.techOutcome)}`}>{r.techOutcome}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
