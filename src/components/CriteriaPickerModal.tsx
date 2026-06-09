import { useState, useEffect } from 'react';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import ModalPortal from './ModalPortal';

export interface LibraryCriteria {
    id: string;
    name: string;
    description: string;
    maxScore: number;
    weight: number;
}

interface Props {
    open: boolean;
    library: LibraryCriteria[];
    addedIds: Set<string>;   // library criteria already on the tender
    loading: boolean;
    adding: boolean;
    onClose: () => void;
    onAdd: (selectedIds: string[]) => void;
}

export default function CriteriaPickerModal({ open, library, addedIds, loading, adding, onClose, onAdd }: Props) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) { setSearch(''); setSelected(new Set()); }
    }, [open]);

    const term = search.trim().toLowerCase();
    const available = library
        .filter(c => !addedIds.has(c.id))
        .filter(c => !term
            || c.name.toLowerCase().includes(term)
            || (c.description || '').toLowerCase().includes(term));

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    return (
        <ModalPortal open={open} onClose={onClose}>
            <div className="relative w-full max-w-lg max-h-[85vh] bg-background rounded-xl shadow-xl flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                        <h2 className="text-lg font-bold">Add Evaluation Criteria</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Select from the library. Default weight/max score are copied — tune them per tender afterwards.</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0"><X size={20} /></button>
                </div>

                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <Search size={16} className="text-muted-foreground" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or description…"
                            className="bg-transparent text-sm outline-none w-full" />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
                    ) : available.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm px-6">
                            {library.length === 0
                                ? 'The library is empty. Add criteria on Settings → Evaluation Criteria first.'
                                : addedIds.size >= library.length
                                    ? 'All library criteria are already on this tender.'
                                    : 'No criteria match your search.'}
                        </div>
                    ) : (
                        available.map(c => {
                            const isSel = selected.has(c.id);
                            return (
                                <button key={c.id} type="button" onClick={() => toggle(c.id)}
                                    className={`w-full flex items-center gap-3 p-3 border-b border-border/50 text-left hover:bg-muted/30 transition-colors ${isSel ? 'bg-primary/5' : ''}`}>
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'bg-primary border-primary' : 'border-border'}`}>
                                        {isSel && <span className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{c.name}</p>
                                        {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{c.weight}% · max {c.maxScore}</span>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="flex justify-between items-center gap-3 p-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                        <button onClick={() => onAdd(Array.from(selected))} disabled={adding || selected.size === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {adding ? 'Adding...' : 'Add Selected'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
