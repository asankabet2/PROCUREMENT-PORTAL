import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import ModalPortal from './ModalPortal';

export interface CriteriaValues {
    name: string;
    description: string;
    maxScore: string;
    weight: string;
}

interface Props {
    open: boolean;
    editing: boolean;
    initial: CriteriaValues;
    saving: boolean;
    onClose: () => void;
    onSubmit: (values: CriteriaValues) => void;
}

const BLANK: CriteriaValues = { name: '', description: '', maxScore: '', weight: '' };

export default function CriteriaFormModal({ open, editing, initial, saving, onClose, onSubmit }: Props) {
    const [form, setForm] = useState<CriteriaValues>(BLANK);

    useEffect(() => {
        if (open) setForm(initial || BLANK);
    }, [open, initial]);

    const submit = () => {
        if (!form.name.trim()) return;
        onSubmit({
            name: form.name.trim(),
            description: form.description.trim(),
            maxScore: form.maxScore,
            weight: form.weight,
        });
    };

    return (
        <ModalPortal open={open} onClose={onClose}>
            <div className="relative w-full max-w-md bg-background rounded-xl shadow-xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h2 className="text-lg font-bold">{editing ? 'Edit Criterion' : 'Add Criterion'}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Name</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Technical Compliance"
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                            placeholder="What this criterion assesses..."
                            className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Default Max Score</label>
                            <input type="number" min="0" value={form.maxScore} onChange={e => setForm({ ...form, maxScore: e.target.value })}
                                placeholder="30"
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Default Weight (%)</label>
                            <input type="number" min="0" max="100" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
                                placeholder="30"
                                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Max score &amp; weight are defaults — they can be tuned per tender after the criterion is added.</p>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                    <button onClick={submit} disabled={saving || !form.name.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Criterion'}
                    </button>
                </div>
            </div>
        </ModalPortal>
    );
}
