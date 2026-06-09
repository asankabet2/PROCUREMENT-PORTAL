import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import EmptyState from '@/components/EmptyState';
import { getTechnicalEvaluation, saveTechnicalEvaluation } from '@/services/api';

interface Criterion { id: string; name: string; maxScore: number; weight: number; }
interface Row { bidId: string; company: string; scores: Record<string, number | string>; }
interface Props { tenderId: string; }


function computeResult(criteria: Criterion[], scores: Record<string, number | string>, passMark: number) {
    if (!criteria.length) return { total: 0, outcome: 'Pending' as const };
    let weighted = 0, totalWeight = 0, allScored = true;
    for (const c of criteria) {
        totalWeight += c.weight;
        const raw = scores[c.id];
        if (raw === '' || raw === undefined || raw === null) { allScored = false; continue; }
        const r = Math.min(Math.max(Number(raw) || 0, 0), c.maxScore);
        if (c.maxScore > 0) weighted += (r / c.maxScore) * c.weight;
    }
    const total = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100 * 100) / 100 : 0;
    const outcome = !allScored ? 'Pending' : total >= passMark ? 'Pass' : 'Fail';
    return { total, outcome };
}

function outcomeBadge(o: string) {
    switch (o) {
        case 'Pass': return 'bg-success/15 text-success';
        case 'Fail': return 'bg-destructive/15 text-destructive';
        default:     return 'bg-amber-500/15 text-amber-600';
    }
}

export default function TechnicalEvaluation({ tenderId }: Props) {
    const { addToast } = useNotification();
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [passMark, setPassMark] = useState(70);
    const [excludedFailedPrelim, setExcludedFailedPrelim] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!tenderId) return;
        setLoading(true);
        try {
            const { data } = await getTechnicalEvaluation(tenderId);
            setCriteria(Array.isArray(data.criteria) ? data.criteria : []);
            setPassMark(data.passMark ?? 70);
            setExcludedFailedPrelim(data.excludedFailedPrelim ?? 0);
            setRows((Array.isArray(data.rows) ? data.rows : []).map((r: any) => ({
                bidId: r.bidId, company: r.company, scores: r.scores || {},
            })));
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load technical evaluation', 'error');
        } finally {
            setLoading(false);
        }
    }, [tenderId, addToast]);

    useEffect(() => { load(); }, [load]);

    const setScore = (bidId: string, criteriaId: string, value: string) => {
        setRows(prev => prev.map(r =>
            r.bidId === bidId ? { ...r, scores: { ...r.scores, [criteriaId]: value } } : r
        ));
    };

    const results = rows.map(r => computeResult(criteria, r.scores, passMark));
    const evaluated = rows.length;
    const passed = results.filter(r => r.outcome === 'Pass').length;
    const highest = results.length ? Math.max(...results.map(r => r.total)) : 0;

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTechnicalEvaluation(tenderId, {
                evaluations: rows.map(r => ({ bidId: r.bidId, scores: r.scores })),
            });
            addToast('Technical evaluation saved', 'success');
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to save technical evaluation', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="glass-card flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Evaluated</p><p className="text-2xl font-bold mt-1">{evaluated}</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Highest Score</p><p className="text-2xl font-bold mt-1 text-success">{highest ? `${highest}` : '—'}</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Pass Mark</p><p className="text-2xl font-bold mt-1">{passMark} / 100</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Passed</p><p className="text-2xl font-bold mt-1 text-success">{passed}</p></div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold">Technical Evaluation Scores</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Score each bidder against the tender's evaluation criteria. Total is weighted and normalised to 100.</p>
                    </div>
                    {rows.length > 0 && criteria.length > 0 && (
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 shrink-0">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Saving...' : 'Save Scores'}
                        </button>
                    )}
                </div>

                {excludedFailedPrelim > 0 && (
                    <div className="m-4 flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600">
                        <span>{excludedFailedPrelim} bidder(s) that failed preliminary evaluation are excluded from technical scoring.</span>
                    </div>
                )}

                {criteria.length === 0 ? (
                    <EmptyState title="No Criteria Defined" description="Add evaluation criteria to this tender first (Evaluation Criteria tab) — the score columns are built from them." />
                ) : rows.length === 0 ? (
                    <EmptyState title="No Bids" description="No bids have been submitted to score yet." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left p-3 font-medium text-muted-foreground">Bidder</th>
                                    {criteria.map(c => (
                                        <th key={c.id} className="text-right p-3 font-medium text-muted-foreground whitespace-nowrap" title={`${c.name} (weight ${c.weight}%)`}>
                                            {c.name} <span className="font-normal text-muted-foreground/70">/{c.maxScore}</span>
                                        </th>
                                    ))}
                                    <th className="text-right p-3 font-medium text-muted-foreground">Total <span className="font-normal">/100</span></th>
                                    <th className="text-left p-3 font-medium text-muted-foreground">Outcome</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, idx) => (
                                    <tr key={r.bidId} className="border-b border-border/50">
                                        <td className="p-3 font-medium">
                                            {r.company}
                                            <div className="text-xs text-muted-foreground font-mono">{r.bidId}</div>
                                        </td>
                                        {criteria.map(c => (
                                            <td key={c.id} className="p-3 text-right">
                                                <input
                                                    type="number" min={0} max={c.maxScore}
                                                    value={r.scores[c.id] ?? ''}
                                                    onChange={e => setScore(r.bidId, c.id, e.target.value)}
                                                    placeholder="—"
                                                    className="w-16 px-2 py-1 bg-muted/50 border border-border rounded text-xs text-right outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-3 text-right font-bold">{results[idx].total}</td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadge(results[idx].outcome)}`}>
                                                {results[idx].outcome}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
