import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import EmptyState from '@/components/EmptyState';
import { getPreliminaryEvaluation, savePreliminaryEvaluation } from '@/services/api';

interface ChecklistItem { key: string; name: string; }

interface Row {
    bidId: string;
    company: string;
    bidStatus?: string;
    results: Record<string, string>;
    remarks: string;
}

interface Props {
    tenderId: string;
}

// Mirror of the server's outcome rule so the UI updates live before saving.
function computeOutcome(keys: string[], results: Record<string, string>): 'Pass' | 'Fail' | 'Pending' {
    if (!keys.length) return 'Pass';
    let allPass = true;
    for (const k of keys) {
        const r = results[k];
        if (r === 'Fail') return 'Fail';
        if (r !== 'Pass') allPass = false;
    }
    return allPass ? 'Pass' : 'Pending';
}

function outcomeBadge(outcome: string) {
    switch (outcome) {
        case 'Pass': return 'bg-success/15 text-success';
        case 'Fail': return 'bg-destructive/15 text-destructive';
        default:     return 'bg-amber-500/15 text-amber-600';
    }
}

export default function PreliminaryEvaluation({ tenderId }: Props) {
    const { addToast } = useNotification();
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        if (!tenderId) return;
        setLoading(true);
        try {
            const { data } = await getPreliminaryEvaluation(tenderId);
            setChecklist(Array.isArray(data.checklist) ? data.checklist : []);
            setRows((Array.isArray(data.rows) ? data.rows : []).map((r: any) => ({
                bidId: r.bidId,
                company: r.company,
                bidStatus: r.bidStatus,
                results: r.results || {},
                remarks: r.remarks || '',
            })));
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load preliminary evaluation', 'error');
        } finally {
            setLoading(false);
        }
    }, [tenderId, addToast]);

    useEffect(() => { load(); }, [load]);

    const keys = checklist.map(c => c.key);

    const setResult = (bidId: string, key: string, value: string) => {
        setRows(prev => prev.map(r =>
            r.bidId === bidId ? { ...r, results: { ...r.results, [key]: value } } : r
        ));
    };

    const setRemarks = (bidId: string, value: string) => {
        setRows(prev => prev.map(r => r.bidId === bidId ? { ...r, remarks: value } : r));
    };

    const outcomes = rows.map(r => computeOutcome(keys, r.results));
    const passed = outcomes.filter(o => o === 'Pass').length;
    const failed = outcomes.filter(o => o === 'Fail').length;
    const pending = outcomes.filter(o => o === 'Pending').length;

    const handleSave = async () => {
        setSaving(true);
        try {
            await savePreliminaryEvaluation(tenderId, {
                evaluations: rows.map(r => ({ bidId: r.bidId, results: r.results, remarks: r.remarks })),
            });
            addToast('Preliminary evaluation saved', 'success');
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to save preliminary evaluation', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Total Bids</p><p className="text-2xl font-bold mt-1">{rows.length}</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Passed</p><p className="text-2xl font-bold mt-1 text-success">{passed}</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold mt-1 text-destructive">{failed}</p></div>
                <div className="glass-card p-4"><p className="text-xs text-muted-foreground">Pending Review</p><p className="text-2xl font-bold mt-1 text-amber-500">{pending}</p></div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold">Preliminary (Administrative) Evaluation</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Checklist is built from this tender's required documents. A bidder passes only if every required document passes.
                        </p>
                    </div>
                    {rows.length > 0 && (
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 shrink-0">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Saving...' : 'Save Evaluation'}
                        </button>
                    )}
                </div>

                {rows.length === 0 ? (
                    <EmptyState title="No Bids" description="No bids have been submitted to evaluate yet." />
                ) : (
                    <>
                        {checklist.length === 0 && (
                            <div className="m-4 flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600">
                                <span>This tender has no required documents configured, so there's nothing to check administratively — all bidders pass preliminary evaluation by default. Add required documents on the tender to enforce a checklist.</span>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left p-3 font-medium text-muted-foreground">Bidder</th>
                                        {checklist.map(c => (
                                            <th key={c.key} className="text-center p-3 font-medium text-muted-foreground whitespace-nowrap" title={c.name}>{c.name}</th>
                                        ))}
                                        <th className="text-left p-3 font-medium text-muted-foreground">Outcome</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, idx) => (
                                        <tr key={r.bidId} className="border-b border-border/50">
                                            <td className="p-3 font-medium">
                                                {r.company}
                                                <div className="text-xs text-muted-foreground font-mono">{r.bidId}</div>
                                            </td>
                                            {checklist.map(c => (
                                                <td key={c.key} className="p-3 text-center">
                                                    <select
                                                        value={r.results[c.key] || ''}
                                                        onChange={e => setResult(r.bidId, c.key, e.target.value)}
                                                        className="px-2 py-1 bg-muted/50 border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                                    >
                                                        <option value="">—</option>
                                                        <option value="Pass">✓ Pass</option>
                                                        <option value="Fail">✗ Fail</option>
                                                    </select>
                                                </td>
                                            ))}
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${outcomeBadge(outcomes[idx])}`}>
                                                    {outcomes[idx]}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    value={r.remarks}
                                                    onChange={e => setRemarks(r.bidId, e.target.value)}
                                                    placeholder="Remarks…"
                                                    className="w-40 px-2 py-1.5 bg-muted/50 border border-border rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
