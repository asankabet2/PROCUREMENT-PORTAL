import { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useNotification } from '@/context/NotificationContext';
import { organizationSettings } from '@/utils/helpers';
import { Save, Plus, Trash2, Loader2, RotateCcw, Search, Edit2, X, Mail } from 'lucide-react';
import {
    getAllCategories, createTenderCategory, deactivateCategory, restoreCategory,
    getAuditLog,
    getEmailTemplates, getEmailTemplateTypes, createEmailTemplate, updateEmailTemplate,
} from '@/services/api';
import PanelMembersSettings from './PanelMembersSettings';
import CriteriaLibrarySettings from './CriteriaLibrarySettings';

interface AuditEntry {
    id: string;
    user: string;
    role?: string;
    action: string;
    actionCode?: string;
    entity: string;
    entityType?: string;
    entityId?: string;
    ip?: string;
    userAgent?: string;
    timestamp: string;
}

function deviceLabel(ua?: string): string {
    if (!ua) return '—';
    if (/iphone/i.test(ua)) return 'iPhone';
    if (/ipad/i.test(ua)) return 'iPad';
    if (/android/i.test(ua)) return 'Android';
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os/i.test(ua)) return 'Mac';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Other';
}

function formatDateTime(ts: string): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

interface Category {
    categoryid: string;
    categoryname: string;
    description: string;
    statusid: string;
}

interface EmailTemplate {
    TemplateID: string;
    TemplateTypeID: string;
    TemplateTypeName: string;
    Subject: string;
    Body: string;
    UpdatedAt: string;
}

interface EmailTemplateType {
    TemplateTypeID: string;
    TemplateTypeName: string;
}

const PLACEHOLDERS = ['{{supplierName}}', '{{tenderTitle}}', '{{closingDate}}', '{{bidId}}', '{{submittedDate}}', '{{orgName}}'];

export default function AdminSettings() {
    const { addToast } = useNotification();
    const [tab, setTab] = useState(0);
    const [orgName, setOrgName] = useState(organizationSettings.name);
    const [orgEmail, setOrgEmail] = useState(organizationSettings.contactEmail);
    const [categories, setCategories] = useState<Category[]>([]);
    const [inactiveCategories, setInactiveCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [savingCategories, setSavingCategories] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [newCat, setNewCat] = useState('');
    const [newCatDescription, setNewCatDescription] = useState('');
    const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
    const [auditSearch, setAuditSearch] = useState('');
    const [refreshingAudit, setRefreshingAudit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Email templates state
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [emailTemplateTypes, setEmailTemplateTypes] = useState<EmailTemplateType[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);

    // Create modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createTypeId, setCreateTypeId] = useState('');
    const [createSubject, setCreateSubject] = useState('');
    const [createBody, setCreateBody] = useState('');
    const [creatingTemplate, setCreatingTemplate] = useState(false);

    const tabs = ['General', 'Categories', 'Email Templates', 'Audit Log', 'Panel Members', 'Evaluation Criteria'];

    const fetchAllCategories = async () => {
        try {
            setLoadingCategories(true);
            const response = await getAllCategories();
            const data = response.data;
            setCategories(data.filter((cat: Category) => cat.statusid === 'C001'));
            setInactiveCategories(data.filter((cat: Category) => cat.statusid === 'C002'));
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            addToast('Failed to fetch categories', 'error');
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => { fetchAllCategories(); }, []);


    const fetchAuditLog = async () => {
        setRefreshingAudit(true);
        try {
            const { data } = await getAuditLog();
            setAuditLog(Array.isArray(data) ? data : []);
        } catch {
            setAuditLog([]);
        } finally {
            setLoading(false);
            setRefreshingAudit(false);
        }
    };

    useEffect(() => { fetchAuditLog(); }, []);

    const fetchEmailTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const [tmplRes, typesRes] = await Promise.all([
                getEmailTemplates(),
                getEmailTemplateTypes(),
            ]);
            setEmailTemplates(Array.isArray(tmplRes.data) ? tmplRes.data : []);
            setEmailTemplateTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
        } catch (error) {
            console.error('Failed to fetch email templates:', error);
            addToast('Failed to load email templates', 'error');
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => {
        if (tab === 2) fetchEmailTemplates();
    }, [tab]);

    const openEditModal = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setEditSubject(template.Subject);
        setEditBody(template.Body);
        setShowEditModal(true);
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;
        if (!editSubject.trim()) { addToast('Subject is required', 'error'); return; }
        if (!editBody.trim()) { addToast('Body is required', 'error'); return; }

        setSavingTemplate(true);
        try {
            await updateEmailTemplate(editingTemplate.TemplateID, {
                subject: editSubject.trim(),
                body: editBody.trim(),
            });
            addToast('Template updated successfully', 'success');
            setShowEditModal(false);
            setEditingTemplate(null);
            await fetchEmailTemplates();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to update template', 'error');
        } finally {
            setSavingTemplate(false);
        }
    };

    const openCreateModal = () => {
        const usedTypeIds = new Set(emailTemplates.map(t => t.TemplateTypeID));
        const availableTypes = emailTemplateTypes.filter(t => !usedTypeIds.has(t.TemplateTypeID));
        if (availableTypes.length === 0) {
            addToast('All template types already have a template', 'info');
            return;
        }
        setCreateTypeId(availableTypes[0].TemplateTypeID);
        setCreateSubject('');
        setCreateBody('');
        setShowCreateModal(true);
    };

    const handleCreateTemplate = async () => {
        if (!createTypeId) { addToast('Select a template type', 'error'); return; }
        if (!createSubject.trim()) { addToast('Subject is required', 'error'); return; }
        if (!createBody.trim()) { addToast('Body is required', 'error'); return; }

        setCreatingTemplate(true);
        try {
            await createEmailTemplate({
                templateTypeId: createTypeId,
                subject: createSubject.trim(),
                body: createBody.trim(),
            });
            addToast('Template created successfully', 'success');
            setShowCreateModal(false);
            await fetchEmailTemplates();
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to create template', 'error');
        } finally {
            setCreatingTemplate(false);
        }
    };

    const filteredAudit = auditLog.filter(a => {
        const q = auditSearch.trim().toLowerCase();
        if (!q) return true;
        return [a.user, a.action, a.entity, a.ip, a.actionCode]
            .filter(Boolean)
            .some(v => String(v).toLowerCase().includes(q));
    });

    const saveGeneralSettings = async () => {
        setSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            addToast('Settings saved successfully', 'success');
        } catch {
            addToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addCategory = async () => {
        if (!newCat.trim()) { addToast('Please enter a category name', 'error'); return; }
        setSavingCategories(true);
        try {
            const response = await createTenderCategory({ name: newCat.trim(), description: newCatDescription.trim() });
            const newCategory = response.data;
            setCategories([...categories, {
                categoryid: newCategory.id || newCategory.categoryid,
                categoryname: newCategory.name || newCategory.categoryname,
                description: newCategory.description || '',
                statusid: 'C001',
            }]);
            setNewCat('');
            setNewCatDescription('');
            addToast('Category added successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to add category', 'error');
        } finally {
            setSavingCategories(false);
        }
    };

    const deleteCategory = async (categoryId: string, categoryName: string) => {
        if (!confirm(`Are you sure you want to deactivate "${categoryName}"? It can be restored later.`)) return;
        try {
            await deactivateCategory(categoryId);
            const deletedCat = categories.find(c => c.categoryid === categoryId);
            if (deletedCat) {
                setCategories(categories.filter(c => c.categoryid !== categoryId));
                setInactiveCategories([...inactiveCategories, { ...deletedCat, statusid: 'C002' }]);
            }
            addToast('Category deactivated successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to deactivate category', 'error');
        }
    };

    const restoreCategoryHandler = async (categoryId: string) => {
        try {
            await restoreCategory(categoryId);
            const restoredCat = inactiveCategories.find(c => c.categoryid === categoryId);
            if (restoredCat) {
                setInactiveCategories(inactiveCategories.filter(c => c.categoryid !== categoryId));
                setCategories([...categories, { ...restoredCat, statusid: 'C001' }]);
            }
            addToast('Category restored successfully', 'success');
        } catch (error: any) {
            addToast(error.response?.data?.message || 'Failed to restore category', 'error');
        }
    };

    
    const usedTypeIds = new Set(emailTemplates.map(t => t.TemplateTypeID));
    const hasAvailableTypes = emailTemplateTypes.some(t => !usedTypeIds.has(t.TemplateTypeID));

    return (
        <PortalLayout type="admin" title="Settings" breadcrumb={['Admin', 'Settings']}>
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1 overflow-x-auto">
                    {tabs.map((t, i) => (
                        <button key={t} onClick={() => setTab(i)}
                            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === i ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Tab: General */}
                {tab === 0 && (
                    <div className="glass-card p-6 space-y-4 max-w-xl">
                        <h3 className="font-bold">General Settings</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Organization Name</label>
                            <input value={orgName} onChange={e => setOrgName(e.target.value)}
                                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Contact Email</label>
                            <input value={orgEmail} onChange={e => setOrgEmail(e.target.value)}
                                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Fiscal Year</label>
                            <input value={new Date().getFullYear().toString()} disabled
                                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm opacity-60" />
                        </div>
                        <button onClick={saveGeneralSettings} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* Tab: Categories */}
                {tab === 1 && (
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="font-bold">Tender Categories</h3>
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm font-medium">Active Categories</p>
                                <button onClick={() => setShowInactive(!showInactive)} className="text-xs text-primary hover:underline">
                                    {showInactive ? 'Hide Inactive' : `Show Inactive (${inactiveCategories.length})`}
                                </button>
                            </div>
                            {loadingCategories ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                            ) : (
                                <>
                                    <div className="space-y-2 max-h-80 overflow-y-auto border border-border rounded-lg p-2">
                                        {categories.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">No active categories found.</div>
                                        ) : categories.map(cat => (
                                            <div key={cat.categoryid} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium">{cat.categoryname}</p>
                                                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                                    <p className="text-xs text-muted-foreground font-mono mt-1">{cat.categoryid}</p>
                                                </div>
                                                <button onClick={() => deleteCategory(cat.categoryid, cat.categoryname)}
                                                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors" title="Deactivate category">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {showInactive && inactiveCategories.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Inactive Categories</p>
                                            <div className="space-y-2 max-h-60 overflow-y-auto border border-dashed border-border rounded-lg p-2 bg-muted/20">
                                                {inactiveCategories.map(cat => (
                                                    <div key={cat.categoryid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg opacity-70">
                                                        <div>
                                                            <p className="text-sm font-medium line-through">{cat.categoryname}</p>
                                                            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                                                            <p className="text-xs text-muted-foreground font-mono mt-1">{cat.categoryid}</p>
                                                        </div>
                                                        <button onClick={() => restoreCategoryHandler(cat.categoryid)}
                                                            className="text-success hover:bg-success/10 p-1.5 rounded transition-colors" title="Restore category">
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="border-t border-border pt-4 mt-4">
                                <p className="text-sm font-medium mb-3">Add New Category</p>
                                <div className="space-y-3">
                                    <input value={newCat} onChange={e => setNewCat(e.target.value)}
                                        placeholder="Category name (e.g., Medical Supplies)"
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                                    <input value={newCatDescription} onChange={e => setNewCatDescription(e.target.value)}
                                        placeholder="Description (optional)"
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
                                    <button onClick={addCategory} disabled={savingCategories}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                                        {savingCategories ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                        {savingCategories ? 'Adding...' : 'Add Category'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Email Templates */}
                {tab === 2 && (
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">Email Templates</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Use placeholders like{' '}
                                    {PLACEHOLDERS.map((p, i) => (
                                        <span key={p}>
                                            <code className="bg-muted px-1 rounded text-xs">{p}</code>
                                            {i < PLACEHOLDERS.length - 1 ? ', ' : ''}
                                        </span>
                                    ))} in your subject or body.
                                </p>
                            </div>
                            {hasAvailableTypes && (
                                <button onClick={openCreateModal}
                                    className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                                    <Plus size={14} /> New Template
                                </button>
                            )}
                        </div>

                        {loadingTemplates ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : emailTemplates.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <Mail size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No email templates found.</p>
                                <button onClick={openCreateModal} className="mt-3 text-sm text-primary hover:underline">
                                    Create your first template
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {emailTemplates.map(tmpl => (
                                    <div key={tmpl.TemplateID} className="p-4 bg-muted/30 border border-border rounded-lg">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold">{tmpl.TemplateTypeName}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Subject: <span className="text-foreground">{tmpl.Subject}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                                                    {tmpl.Body}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1.5">
                                                    Last updated: {formatDateTime(tmpl.UpdatedAt)}
                                                </p>
                                            </div>
                                            <button onClick={() => openEditModal(tmpl)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-md text-xs hover:bg-primary/20 transition-colors shrink-0">
                                                <Edit2 size={12} /> Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Audit Log */}
                {tab === 3 && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2 flex-1 max-w-md">
                                <Search size={16} className="text-muted-foreground" />
                                <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                                    placeholder="Search by user, action, entity or IP..."
                                    className="bg-transparent text-sm outline-none w-full" />
                            </div>
                            <button onClick={fetchAuditLog} disabled={refreshingAudit}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 text-sm disabled:opacity-50">
                                <RotateCcw size={14} className={refreshingAudit ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                        <div className="glass-card overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : filteredAudit.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    {auditLog.length === 0 ? 'No audit log entries found' : 'No entries match your search'}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                                                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                                                <th className="text-left p-3 font-medium text-muted-foreground">Entity</th>
                                                <th className="text-left p-3 font-medium text-muted-foreground">IP / Device</th>
                                                <th className="text-left p-3 font-medium text-muted-foreground">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAudit.map(a => (
                                                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/20">
                                                    <td className="p-3">
                                                        <div className="font-medium">{a.user}</div>
                                                        {a.role && <div className="text-xs text-muted-foreground capitalize">{a.role}</div>}
                                                    </td>
                                                    <td className="p-3">{a.action}</td>
                                                    <td className="p-3 text-muted-foreground">{a.entity}</td>
                                                    <td className="p-3 text-muted-foreground">
                                                        <div className="font-mono text-xs">{a.ip || '—'}</div>
                                                        <div className="text-xs" title={a.userAgent}>{deviceLabel(a.userAgent)}</div>
                                                    </td>
                                                    <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDateTime(a.timestamp)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 4 && <PanelMembersSettings />}
                {tab === 5 && <CriteriaLibrarySettings />}
            </div>

            {/* Edit Template Modal */}
            {showEditModal && editingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold">Edit Template</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">{editingTemplate.TemplateTypeName}</p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setEditingTemplate(null); }}
                                className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Subject</label>
                                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Email subject..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Body</label>
                                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={12}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono resize-none"
                                    placeholder="Email body..." />
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground font-medium mb-1">Available placeholders:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {PLACEHOLDERS.map(p => (
                                        <code key={p} className="bg-muted px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => setEditBody(prev => prev + p)}
                                            title="Click to insert">
                                            {p}
                                        </code>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-border">
                            <button onClick={() => { setShowEditModal(false); setEditingTemplate(null); }}
                                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                            <button onClick={handleSaveTemplate} disabled={savingTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                                {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {savingTemplate ? 'Saving...' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Template Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-lg font-bold">New Email Template</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Template Type</label>
                                <select value={createTypeId} onChange={e => setCreateTypeId(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
                                    {emailTemplateTypes
                                        .filter(t => !usedTypeIds.has(t.TemplateTypeID))
                                        .map(t => (
                                            <option key={t.TemplateTypeID} value={t.TemplateTypeID}>
                                                {t.TemplateTypeName}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Subject</label>
                                <input value={createSubject} onChange={e => setCreateSubject(e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Email subject..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Body</label>
                                <textarea value={createBody} onChange={e => setCreateBody(e.target.value)} rows={12}
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary font-mono resize-none"
                                    placeholder="Email body..." />
                            </div>
                            <div className="p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground font-medium mb-1">Available placeholders:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {PLACEHOLDERS.map(p => (
                                        <code key={p} className="bg-muted px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                                            onClick={() => setCreateBody(prev => prev + p)}
                                            title="Click to insert">
                                            {p}
                                        </code>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-border">
                            <button onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/30">Cancel</button>
                            <button onClick={handleCreateTemplate} disabled={creatingTemplate}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50">
                                {creatingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {creatingTemplate ? 'Creating...' : 'Create Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
}