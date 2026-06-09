import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import PanelMemberFormModal, { type PanelMemberValues } from '@/components/PanelMemberFormModal';
import {
    getPanelDirectory, createDirectoryMember, updateDirectoryMember, deleteDirectoryMember,
} from '@/services/api';

interface Member {
    id: string;
    name: string;
    designation: string;
    department: string;
    email: string;
}

const EMPTY: PanelMemberValues = { name: '', designation: '', department: '', email: '' };

export default function PanelMembersSettings() {
    const { addToast } = useNotification();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [initial, setInitial] = useState<PanelMemberValues>(EMPTY);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await getPanelDirectory();
            setMembers(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load panel members', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditingId(null); setInitial(EMPTY); setShowModal(true); };
    const openEdit = (m: Member) => {
        setEditingId(m.id);
        setInitial({ name: m.name, designation: m.designation || '', department: m.department || '', email: m.email || '' });
        setShowModal(true);
    };

    const handleSubmit = async (values: PanelMemberValues) => {
        setSaving(true);
        try {
            if (editingId) {
                await updateDirectoryMember(editingId, values);
                addToast('Member updated', 'success');
            } else {
                await createDirectoryMember(values);
                addToast('Member added', 'success');
            }
            setShowModal(false);
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to save member', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (m: Member) => {
        if (!confirm(`Remove "${m.name}" from the directory? Tenders that already use them keep their record.`)) return;
        setDeletingId(m.id);
        try {
            await deleteDirectoryMember(m.id);
            addToast('Member removed', 'success');
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to remove member', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Panel Members</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">The roster of evaluators. Tenders select their evaluation panel from this list.</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                    <UserPlus size={14} /> Add Member
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : members.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No panel members yet. Add evaluators that tenders can choose from.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Designation</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m.id} className="border-b border-border/50">
                                    <td className="p-3 font-medium">{m.name}</td>
                                    <td className="p-3 text-muted-foreground">{m.designation || '—'}</td>
                                    <td className="p-3 text-muted-foreground">{m.department || '—'}</td>
                                    <td className="p-3 text-muted-foreground">{m.email || '—'}</td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(m)} title="Edit"
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(m)} disabled={deletingId === m.id} title="Remove"
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50">
                                                {deletingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <PanelMemberFormModal
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
