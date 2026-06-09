import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import ModalPortal from './ModalPortal';

export interface DirectoryMember {
    id: string;
    name: string;
    designation: string;
    department: string;
    email: string;
}

interface Props {
    open: boolean;
    directory: DirectoryMember[];
    addedIds: Set<string>;   // directory members already on the panel
    loading: boolean;
    adding: boolean;
    onClose: () => void;
    onAdd: (selectedIds: string[]) => void;
}

export default function PanelMemberPickerModal({ open, directory, addedIds, loading, adding, onClose, onAdd }: Props) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Reset search/selection each time the picker opens.
    useEffect(() => {
        if (open) { setSearch(''); setSelected(new Set()); }
    }, [open]);

    const term = search.trim().toLowerCase();
    const available = directory
        .filter(d => !addedIds.has(d.id))
        .filter(d => !term
            || d.name.toLowerCase().includes(term)
            || (d.designation || '').toLowerCase().includes(term)
            || (d.department || '').toLowerCase().includes(term));

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
                        <h2 className="text-lg font-bold">Add Panel Members</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Select from the directory. Added as "Member / Pending" — change roles afterwards.</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0"><X size={20} /></button>
                </div>

                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <Search size={16} className="text-muted-foreground" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, designation or department…"
                            className="bg-transparent text-sm outline-none w-full" />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
                    ) : available.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground text-sm px-6">
                            {directory.length === 0
                                ? 'The directory is empty. Add evaluators on Settings → Panel Members first.'
                                : addedIds.size >= directory.length
                                    ? 'All directory members are already on this panel.'
                                    : 'No members match your search.'}
                        </div>
                    ) : (
                        available.map(d => {
                            const isSel = selected.has(d.id);
                            return (
                                <button key={d.id} type="button" onClick={() => toggle(d.id)}
                                    className={`w-full flex items-center gap-3 p-3 border-b border-border/50 text-left hover:bg-muted/30 transition-colors ${isSel ? 'bg-primary/5' : ''}`}>
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'bg-primary border-primary' : 'border-border'}`}>
                                        {isSel && <span className="w-2 h-2 bg-primary-foreground rounded-sm" />}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{d.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {[d.designation, d.department].filter(Boolean).join(' · ') || '—'}
                                        </p>
                                    </div>
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
                            {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                            {adding ? 'Adding...' : 'Add Selected'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalPortal>
    );
}
