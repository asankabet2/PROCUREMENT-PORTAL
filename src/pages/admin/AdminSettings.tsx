import { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import { useNotification } from '@/context/NotificationContext';
import { organizationSettings } from '@/utils/helpers';
import { Save, Plus, Trash2, Loader2, RotateCcw, Search } from 'lucide-react';
import { getAllCategories, createTenderCategory, deactivateCategory, restoreCategory, getDefaultDocuments, getAuditLog } from '@/services/api';
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

// Turn a long user-agent string into a short, readable device label.
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
  const [reqDocs, setReqDocs] = useState<string[]>([]);
  const [newDoc, setNewDoc] = useState('');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [refreshingAudit, setRefreshingAudit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs = ['General', 'Categories', 'Documents', 'Email Templates', 'Audit Log', 'Panel Members', 'Evaluation Criteria'];

  // Fetch ALL categories (including inactive) for admin settings
  const fetchAllCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await getAllCategories();
      const data = response.data;
      // Split into active and inactive
      const active = data.filter((cat: Category) => cat.statusid === 'C001');
      const inactive = data.filter((cat: Category) => cat.statusid === 'C002');
      setCategories(active);
      setInactiveCategories(inactive);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      addToast('Failed to fetch categories', 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchAllCategories();
  }, []);

  // Fetch default documents from backend
  useEffect(() => {
    const fetchDefaultDocs = async () => {
      try {
        const { data } = await getDefaultDocuments();
        setReqDocs(Array.isArray(data) ? data : ['Company Profile', 'Certificate of Incorporation', 'Tax Clearance Certificate']);
      } catch (error) {
        console.error('Failed to fetch default documents:', error);
        setReqDocs(['Company Profile', 'Certificate of Incorporation', 'Tax Clearance Certificate']);
      }
    };
    fetchDefaultDocs();
  }, []);

  // Fetch audit log from backend
  const fetchAuditLog = async () => {
    setRefreshingAudit(true);
    try {
      const { data } = await getAuditLog();
      setAuditLog(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
      setAuditLog([]);
    } finally {
      setLoading(false);
      setRefreshingAudit(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, []);

  // Client-side filter over the loaded entries
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
    } catch (error) {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCat.trim()) {
      addToast('Please enter a category name', 'error');
      return;
    }
    
    setSavingCategories(true);
    try {
      const response = await createTenderCategory({
        name: newCat.trim(),
        description: newCatDescription.trim(),
      });

      const newCategory = response.data;
      setCategories([...categories, { 
        categoryid: newCategory.id || newCategory.categoryid, 
        categoryname: newCategory.name || newCategory.categoryname, 
        description: newCategory.description || '', 
        statusid: 'C001' 
      }]);
      setNewCat('');
      setNewCatDescription('');
      addToast('Category added successfully', 'success');
    } catch (error: any) {
      console.error('Error adding category:', error);
      addToast(error.response?.data?.message || 'Failed to add category', 'error');
    } finally {
      setSavingCategories(false);
    }
  };

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to deactivate "${categoryName}"? It can be restored later.`)) return;
    
    try {
      await deactivateCategory(categoryId);
      
      // Move from active to inactive
      const deletedCat = categories.find(c => c.categoryid === categoryId);
      if (deletedCat) {
        setCategories(categories.filter(c => c.categoryid !== categoryId));
        setInactiveCategories([...inactiveCategories, { ...deletedCat, statusid: 'C002' }]);
      }
      addToast('Category deactivated successfully', 'success');
    } catch (error: any) {
      console.error('Error deactivating category:', error);
      addToast(error.response?.data?.message || 'Failed to deactivate category', 'error');
    }
  };

  const restoreCategoryHandler = async (categoryId: string) => {
    try {
      await restoreCategory(categoryId);
      
      // Move from inactive to active
      const restoredCat = inactiveCategories.find(c => c.categoryid === categoryId);
      if (restoredCat) {
        setInactiveCategories(inactiveCategories.filter(c => c.categoryid !== categoryId));
        setCategories([...categories, { ...restoredCat, statusid: 'C001' }]);
      }
      addToast('Category restored successfully', 'success');
    } catch (error: any) {
      console.error('Error restoring category:', error);
      addToast(error.response?.data?.message || 'Failed to restore category', 'error');
    }
  };

  const saveDocuments = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast('Documents updated successfully', 'success');
    } catch (error) {
      addToast('Failed to update documents', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addDocument = () => {
    if (!newDoc.trim()) return;
    setReqDocs([...reqDocs, newDoc.trim()]);
    setNewDoc('');
    addToast('Document added', 'success');
  };

  const removeDocument = (index: number) => {
    setReqDocs(reqDocs.filter((_, i) => i !== index));
    addToast('Document removed', 'success');
  };

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

        {tab === 0 && (
          <div className="glass-card p-6 space-y-4 max-w-xl">
            <h3 className="font-bold">General Settings</h3>
            <div>
              <label className="block text-sm font-medium mb-1.5">Organization Name</label>
              <input 
                value={orgName} 
                onChange={e => setOrgName(e.target.value)} 
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Contact Email</label>
              <input 
                value={orgEmail} 
                onChange={e => setOrgEmail(e.target.value)} 
                className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Fiscal Year</label>
              <input 
                value={new Date().getFullYear().toString()} 
                disabled 
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm opacity-60" 
              />
            </div>
            <button 
              onClick={saveGeneralSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 1 && (
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold">Tender Categories</h3>
            
            {/* Active Categories */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-medium">Active Categories</p>
                <button 
                  onClick={() => setShowInactive(!showInactive)}
                  className="text-xs text-primary hover:underline"
                >
                  {showInactive ? 'Hide Inactive' : `Show Inactive (${inactiveCategories.length})`}
                </button>
              </div>
              
              {loadingCategories ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-80 overflow-y-auto border border-border rounded-lg p-2">
                    {categories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No active categories found.
                      </div>
                    ) : (
                      categories.map((cat) => (
                        <div key={cat.categoryid} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{cat.categoryname}</p>
                            {cat.description && (
                              <p className="text-xs text-muted-foreground">{cat.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground font-mono mt-1">{cat.categoryid}</p>
                          </div>
                          <button 
                            onClick={() => deleteCategory(cat.categoryid, cat.categoryname)} 
                            className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                            title="Deactivate category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Inactive Categories (Collapsible) */}
                  {showInactive && inactiveCategories.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Inactive Categories</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-dashed border-border rounded-lg p-2 bg-muted/20">
                        {inactiveCategories.map((cat) => (
                          <div key={cat.categoryid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg opacity-70">
                            <div>
                              <p className="text-sm font-medium line-through">{cat.categoryname}</p>
                              {cat.description && (
                                <p className="text-xs text-muted-foreground">{cat.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground font-mono mt-1">{cat.categoryid}</p>
                            </div>
                            <button 
                              onClick={() => restoreCategoryHandler(cat.categoryid)} 
                              className="text-success hover:bg-success/10 p-1.5 rounded transition-colors"
                              title="Restore category"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Add New Category Form */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-sm font-medium mb-3">Add New Category</p>
                <div className="space-y-3">
                  <input 
                    value={newCat} 
                    onChange={e => setNewCat(e.target.value)} 
                    placeholder="Category name (e.g., Medical Supplies)"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" 
                  />
                  <input 
                    value={newCatDescription} 
                    onChange={e => setNewCatDescription(e.target.value)} 
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" 
                  />
                  <button 
                    onClick={addCategory}
                    disabled={savingCategories}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {savingCategories ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {savingCategories ? 'Adding...' : 'Add Category'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 2 && (
          <div className="glass-card p-6 space-y-4 max-w-xl">
            <h3 className="font-bold">Default Required Documents</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {reqDocs.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">{d}</span>
                  <button onClick={() => removeDocument(i)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                value={newDoc} 
                onChange={e => setNewDoc(e.target.value)} 
                placeholder="New document requirement"
                className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
              />
              <button 
                onClick={addDocument}
                className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <button 
              onClick={saveDocuments}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium mt-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Documents'}
            </button>
          </div>
        )}

        {tab === 3 && (
          <div className="glass-card p-6 max-w-xl">
            <h3 className="font-bold mb-4">Email Templates</h3>
            <div className="space-y-3">
              {['Supplier Registration Approved', 'Supplier Registration Rejected', 'Tender Published Notification', 'Bid Submitted Confirmation', 'Tender Awarded Notification'].map(t => (
                <div key={t} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">{t}</span>
                  <button className="text-primary text-xs hover:underline">Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 4 && (
          <div className="space-y-4">
            {/* Toolbar: search + refresh */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2 flex-1 max-w-md">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  placeholder="Search by user, action, entity or IP..."
                  className="bg-transparent text-sm outline-none w-full"
                />
              </div>
              <button
                onClick={fetchAuditLog}
                disabled={refreshingAudit}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted/50 text-sm disabled:opacity-50"
              >
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

        {tab === 5 && <PanelMembersSettings />}

        {tab === 6 && <CriteriaLibrarySettings />}
      </div>
    </PortalLayout>
  );
}