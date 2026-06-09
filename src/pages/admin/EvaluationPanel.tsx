import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Pencil, Trash2, Loader2, X, Save } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import EmptyState from '@/components/EmptyState';
import ModalPortal from '@/components/ModalPortal';
import PanelMemberPickerModal from '@/components/PanelMemberPickerModal';
import {
    getTenderPanel, addPanelMembers, updatePanelMember, removePanelMember, getPanelDirectory,
} from '@/services/api';

interface PanelMember {
    id: string;
    MemberId: string | null;
    name: string;
    designation: string;
    department: string;
    role: string;
    status: string;
}

interface Member {
    id: string;
    name: string;
    designation: string;
    department: string;
    email: string;
}

interface Props {
    tenderId: string;
}

const ROLES = ['Chairperson', 'Secretary', 'Member'];
const STATUSES = ['Pending', 'Confirmed'];

function roleBadgeClass(role: string) {
    switch (role) {
        case 'Chairperson': return 'bg-orange-500/15 text-orange-600';
        case 'Secretary':   return 'bg-blue-500/15 text-blue-600';
        default:            return 'bg-muted text-muted-foreground';
    }
}

export default function EvaluationPanel({ tenderId }: Props) {
    const { addToast } = useNotification();
    const [panelmembers, setMembers] = useState<PanelMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Directory picker
    const [showPicker, setShowPicker] = useState(false);
    const [directory, setDirectory] = useState<Member[]>([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    // Edit role/status
    const [editing, setEditing] = useState<PanelMember | null>(null);
    const [editRole, setEditRole] = useState('Member');
    const [editStatus, setEditStatus] = useState('Pending');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!tenderId) return;
        setLoading(true);
        try {
            const { data } = await getTenderPanel(tenderId);
            setMembers(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load evaluation panel', 'error');
        } finally {
            setLoading(false);
        }
    }, [tenderId, addToast]);

    useEffect(() => { load(); }, [load]);

    const addedMemberIds = new Set(panelmembers.map(m => m.MemberId).filter(Boolean) as string[]);

    const openPicker = async () => {
        setShowPicker(true);
        setPickerLoading(true);
        try {
            const { data } = await getPanelDirectory();
            setDirectory(Array.isArray(data) ? data : []);
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to load panel directory', 'error');
        } finally {
            setPickerLoading(false);
        }
    };

    const handleAddSelected = async (selectedIds: string[]) => {
        if (selectedIds.length === 0) { 
            addToast('Select at least one member', 'error'); 
            return; 
        }
        setAdding(true);
        try {
            // Fix: Send members array with correct structure
            const membersToAdd = selectedIds.map(id => ({ 
                MemberId: id, 
                role: 'Member', 
                status: 'Pending' 
            }));
            await addPanelMembers(tenderId, { members: membersToAdd });
            addToast(`${selectedIds.length} member(s) added to the panel`, 'success');
            setShowPicker(false);
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to add members', 'error');
        } finally {
            setAdding(false);
        }
    };

    const openEdit = (m: PanelMember) => {
        setEditing(m);
        setEditRole(m.role);
        setEditStatus(m.status);
    };

    const handleSaveEdit = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            // Fix: Only send role and status (backend doesn't update name/designation/department)
            await updatePanelMember(tenderId, editing.id, {
                role: editRole,
                status: editStatus,
            });
            addToast('Panel member updated', 'success');
            setEditing(null);
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to update panel member', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (m: PanelMember) => {
        if (!confirm(`Remove ${m.name} from this tender's panel?`)) return;
        setDeletingId(m.id);
        try {
            await removePanelMember(tenderId, m.id);
            addToast('Panel member removed', 'success');
            await load();
        } catch (e: any) {
            addToast(e.response?.data?.message || 'Failed to remove panel member', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Tender Evaluation Panel</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select evaluators from the directory, then assign their role. Manage the directory on Settings › Panel Members.</p>
                </div>
                <button onClick={openPicker} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                    <UserPlus size={14} /> Add Member
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : panelmembers.length === 0 ? (
                <EmptyState
                    title="No Panel Members"
                    description="Add evaluators from the panel-members directory."
                    action={{ label: 'Add Member', onClick: openPicker }}
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Designation</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {panelmembers.map(m => (
                                <tr key={m.id} className="border-b border-border/50">
                                    <td className="p-3 font-medium">{m.name}</td>
                                    <td className="p-3 text-muted-foreground">{m.designation || '—'}</td>
                                    <td className="p-3 text-muted-foreground">{m.department || '—'}</td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass(m.role)}`}>{m.role}</span>
                                    </td>
                                    <td className="p-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'Confirmed' ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-600'}`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openEdit(m)} title="Edit role / status"
                                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(m)} disabled={deletingId === m.id} title="Remove from panel"
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

            {/* Directory picker */}
            <PanelMemberPickerModal
                open={showPicker}
                directory={directory}
                addedIds={addedMemberIds}
                loading={pickerLoading}
                adding={adding}
                onClose={() => setShowPicker(false)}
                onAdd={handleAddSelected}
            />

            {/* Edit role / status */}
            <ModalPortal open={!!editing} onClose={() => setEditing(null)}>
                <div className="relative w-full max-w-md bg-background rounded-xl shadow-xl">
                    <div className="flex items-center justify-between p-5 border-b border-border">
                        <h2 className="text-lg font-bold">Edit Panel Member</h2>
                        <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="p-3 bg-muted/40 rounded-lg">
                            {/* Fix: Show name instead of MemberId */}
                            <p className="font-medium">{editing?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {[editing?.designation, editing?.department].filter(Boolean).join(' · ') || '—'}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Role</label>
                                <select 
                                    value={editRole} 
                                    onChange={e => setEditRole(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Status</label>
                                <select 
                                    value={editStatus} 
                                    onChange={e => setEditStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 p-5 border-t border-border">
                        <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">
                            Cancel
                        </button>
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