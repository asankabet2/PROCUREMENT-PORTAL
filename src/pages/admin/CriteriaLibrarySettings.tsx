import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import CriteriaFormModal, { type CriteriaValues } from '@/components/CriteriaFormModal';
import {
    getCriteriaLibrary, createLibraryCriteria, updateLibraryCriteria, deleteLibraryCriteria,
} from '@/services/api';

interface Criterion {
    id: string;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
}

const EMPTY: CriteriaValues = { name: '', description: '', maxScore: '', weight: '' };

export default function CriteriaLibrarySettings() {
    const { addToast } = useNotification();
    const [items, setItems] = useState<Criterion[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [initial, setInitial] = useState<CriteriaValues>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getCriteriaLibrary();
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load criteria library', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditingId(null); setInitial(EMPTY); setShowModal(true); };
    const openEdit = (c: Criterion) => {
        setEditingId(c.id);
        setInitial({ name: c.name, description: c.description || '', maxScore: String(c.maxScore), weight: String(c.weight) });
        setShowModal(true);
    };

    const handleSubmit = async (values: CriteriaValues) => {
        const payload = {
            name: values.name,
            description: values.description,
            maxScore: parseFloat(values.maxScore) || 0,
            weight: parseFloat(values.weight) || 0,
        };
        setSaving(true);
        try {
            if (editingId) {
                await updateLibraryCriteria(editingId, payload);
                addToast('Criterion updated', 'success');
            } else {
                await createLibraryCriteria(payload);
                addToast('Criterion added', 'success');
            }
            setShowModal(false);
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to save criterion', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (c: Criterion) => {
        if (!confirm(`Remove "${c.name}" from the library? Tenders that already use it keep their copy.`)) return;
        setDeletingId(c.id);
        try {
            await deleteLibraryCriteria(c.id);
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
                    <p className="text-xs text-muted-foreground mt-0.5">Reusable scoring criteria. Tenders select their evaluation criteria from this library.</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                    <Plus size={14} /> Add Criterion
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No criteria yet. Add scoring criteria that tenders can choose from.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Max Score</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Default Weight</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(c => (
                                <tr key={c.id} className="border-b border-border/50">
                                    <td className="p-3 font-medium">{c.name}</td>
                                    <td className="p-3 text-muted-foreground">{c.description || '—'}</td>
                                    <td className="p-3 text-right">{c.maxScore}</td>
                                    <td className="p-3 text-right font-medium text-primary">{c.weight}%</td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(c)} title="Edit"
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(c)} disabled={deletingId === c.id} title="Remove"
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                                                {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <CriteriaFormModal
                open={showModal}
                editing={!!editingId}
                initial={initial}
                saving={saving}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
