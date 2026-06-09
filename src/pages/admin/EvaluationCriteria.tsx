import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import EmptyState from '@/components/EmptyState';
import ModalPortal from '@/components/ModalPortal';
import CriteriaPickerModal from '@/components/CriteriaPickerModal';
import {
    getTenderCriteria, addCriteria, updateCriteria, deleteCriteria, getCriteriaLibrary,
} from '@/services/api';

interface Criteria {
    id: string;
    criteriaRefId: string | null;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
}

interface LibraryCriteria {
    id: string;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
}

interface Props {
    tenderId: string;
}

export default function EvaluationCriteria({ tenderId }: Props) {
    const { addToast } = useNotification();
    const [criteria, setCriteria] = useState<Criteria[]>([]);
    const [loading, setLoading] = useState(true);

    // Library picker
    const [showPicker, setShowPicker] = useState(false);
    const [library, setLibrary] = useState<LibraryCriteria[]>([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    // Edit weight / max score (tender-specific)
    const [editing, setEditing] = useState<Criteria | null>(null);
    const [editMaxScore, setEditMaxScore] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!tenderId) return;
        setLoading(true);
        try {
            const { data } = await getTenderCriteria(tenderId);
            setCriteria(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load evaluation criteria', 'error');
        } finally {
            setLoading(false);
        }
    }, [tenderId, addToast]);

    useEffect(() => { load(); }, [load]);

    const addedRefIds = new Set(criteria.map(c => c.criteriaRefId).filter(Boolean) as string[]);

    const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    const roundedTotal = Math.round(totalWeight * 100) / 100;
    const weightOk = Math.abs(roundedTotal - 100) < 0.001;

    const openPicker = async () => {
        setShowPicker(true);
        setPickerLoading(true);
        try {
            const { data } = await getCriteriaLibrary();
            setLibrary(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load criteria library', 'error');
        } finally {
            setPickerLoading(false);
        }
    };

    const handleAddSelected = async (selectedIds: string[]) => {
        if (selectedIds.length === 0) { addToast('Select at least one criterion', 'error'); return; }
        setAdding(true);
        try {
            await addCriteria(tenderId, {
                criteria: selectedIds.map(id => ({ criteriaRefId: id })),
            });
            addToast(`${selectedIds.length} criterion(s) added`, 'success');
            setShowPicker(false);
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to add criteria', 'error');
        } finally {
            setAdding(false);
        }
    };

    const openEdit = (c: Criteria) => {
        setEditing(c);
        setEditMaxScore(String(c.maxScore));
        setEditWeight(String(c.weight));
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        const maxScore = parseFloat(editMaxScore);
        const weight = parseFloat(editWeight);
        if (isNaN(maxScore) || maxScore <= 0) { addToast('Max score must be greater than 0', 'error'); return; }
        if (isNaN(weight) || weight <= 0) { addToast('Weight must be greater than 0', 'error'); return; }
        setSaving(true);
        try {
            await updateCriteria(tenderId, editing.id, { maxScore, weight });
            addToast('Criterion updated', 'success');
            setEditing(null);
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to update criterion', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (c: Criteria) => {
        if (!confirm(`Remove criterion "${c.name}" from this tender?`)) return;
        setDeletingId(c.id);
        try {
            await deleteCriteria(tenderId, c.id);
            addToast('Criterion removed', 'success');
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to remove criterion', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Evaluation Criteria</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select criteria from the library, then tune their weight per tender. Manage the library on Settings &rsaquo; Evaluation Criteria.</p>
                </div>
                <button onClick={openPicker} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                    <Plus size={14} /> Add Criteria
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : criteria.length === 0 ? (
                <EmptyState
                    title="No Criteria Defined"
                    description="Add weighted criteria from the library (e.g. Technical Compliance, Experience, Price) totalling 100%."
                    action={{ label: 'Add Criteria', onClick: openPicker }}
                />
            ) : (
                <>
                    <div className="divide-y divide-border">
                        {criteria.map(c => (
                            <div key={c.id} className="flex items-center gap-4 p-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium">{c.name}</p>
                                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                                </div>
                                <div className="text-xs text-muted-foreground whitespace-nowrap">Max: {c.maxScore}</div>
                                <div className="text-sm font-bold text-primary w-14 text-right">{c.weight}%</div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(c)} title="Edit weight / max score"
                                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(c)} disabled={deletingId === c.id} title="Remove"
                                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                                        {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-border flex justify-end items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Total Weight:</span>
                        <strong className={weightOk ? 'text-success' : 'text-amber-500'}>{roundedTotal}%</strong>
                        {!weightOk && <span className="text-xs text-amber-500">(should be 100%)</span>}
                    </div>
                </>
            )}

            {/* Library picker */}
            <CriteriaPickerModal
                open={showPicker}
                library={library}
                addedIds={addedRefIds}
                loading={pickerLoading}
                adding={adding}
                onClose={() => setShowPicker(false)}
                onAdd={handleAddSelected}
            />

            {/* Edit weight / max score */}
            <ModalPortal open={!!editing} onClose={() => setEditing(null)}>
                <div className="relative w-full max-w-md bg-background rounded-xl shadow-xl">
                    <div className="flex items-center justify-between p-5 border-b border-border">
                        <h2 className="text-lg font-bold">Edit Criterion</h2>
                        <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="p-3 bg-muted/40 rounded-lg">
                            <p className="font-medium">{editing?.name}</p>
                            {editing?.description && <p className="text-xs text-muted-foreground mt-0.5">{editing.description}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Max Score</label>
                                <input type="number" min="1" value={editMaxScore} onChange={e => setEditMaxScore(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Weight (%)</label>
                                <input type="number" min="1" max="100" value={editWeight} onChange={e => setEditWeight(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 p-5 border-t border-border">
                        <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                        <button onClick={handleSaveEdit} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </ModalPortal>
        </div>
    );
}
