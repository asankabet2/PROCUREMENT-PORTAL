import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotification } from '@/context/NotificationContext';
import { formatDate} from '@/utils/helpers';
import { Plus, Search, Edit, Eye, Trash2, Loader2, Upload } from 'lucide-react';
import ExcelImport from '@/components/ExcelImport';
import { DOCUMENT_CONFIG } from '@/constants/documents';
import { getTenders, deleteTender, createTender, getCategories } from '@/services/api';

interface Tender {
  id: string;
  title: string;
  category: string;
  status: string;
  publishedDate: string;
  closingDate: string;
  estimatedBudget: number;
}

interface TenderItem {
  itemNo: number;
  description: string;
  unit: string;
  quantity: number;
  estimatedUnitPrice: number;
}

export default function TenderManagement() {
  const navigate = useNavigate();
  const { addToast } = useNotification();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const tabs = ['All', 'Open', 'Closed', 'Draft', 'Awarded'];

  // Fetch tenders from backend
  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const { data } = await getTenders();

        // Ensure data is an array
        if (Array.isArray(data)) {
          setTenders(data);
        } else {
          console.error('API did not return an array:', data);
          setTenders([]);
        }
      } catch (error) {
        console.error('Failed to fetch tenders:', error);
        addToast('Failed to load tenders', 'error');
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, [addToast]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      await deleteTender(deleteId);
      setTenders(prev => prev.filter(t => t.id !== deleteId));
      addToast('Tender deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting tender:', error);
      addToast(error.response?.data?.message || 'Failed to delete tender', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filtered = tenders
    .filter(t => filter === 'All' || t.status === filter)
    .filter(t =>
        (t.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (t.id    ?? '').toLowerCase().includes(search.toLowerCase())
  );
  
  if (loading) {
    return (
      <PortalLayout type="admin" title="Tender Management" breadcrumb={['Admin', 'Tenders']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="admin" title="Tender Management" breadcrumb={['Admin', 'Tenders']}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2">
              <Search size={16} className="text-muted-foreground" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search tenders..."
                className="bg-transparent text-sm outline-none w-40" 
              />
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors">
              <Plus size={16} /> Create Tender
            </button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Published</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Closing</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono text-xs">{t.id}</td>
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3 text-muted-foreground">{t.category}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(t.publishedDate)}</td>
                    <td className="p-3">{formatDate(t.closingDate)}</td>
                    <td className="p-3"><StatusBadge status={t.status as any} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/admin/tenders/${t.id}`)} className="p-1.5 rounded hover:bg-muted/50" title="View">
                          <Eye size={14} />
                        </button>

                        {/* Edit — Draft and Open only */}
                        {(t.status === 'Draft' || t.status === 'Open') && (
                          <button onClick={() => navigate(`/admin/tenders/edit/${t.id}`)} className="p-1.5 rounded hover:bg-muted/50" title="Edit">
                            <Edit size={14} />
                          </button>
                        )}

                        {/* Delete — Draft only */}
                        {t.status === 'Draft' && (
                            <button onClick={() => setDeleteId(t.id)}  className="p-1.5 rounded hover:bg-destructive/20 text-destructive" title="Delete">
                              <Trash2 size={14} />
                            </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Tender Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Tender" size="xl">
        <CreateTenderForm 
          onClose={async () => {
            setShowCreate(false);
            // Refresh tenders list
            try {
              const { data } = await getTenders();
              if (Array.isArray(data)) {
                setTenders(data);
              }
            } catch (error) {
              console.error('Failed to refresh tenders:', error);
            }
          }}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete}
        title="Delete Tender" 
        message="Are you sure you want to delete this tender? This action cannot be undone." 
        confirmText={deleting ? 'Deleting...' : 'Delete'} 
        variant="danger" 
      />
    </PortalLayout>
  );
}

// Create Tender Form Component (with Excel Import)
function CreateTenderForm({ onClose }: { onClose: () => void }) {
  const { addToast } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; description: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [form, setForm] = useState({
    title: '',
    categoryId: '',
    description: '',
    status: 'Draft',
    openingDate: '',
    closingDate: '',
    estimatedBudget: '',
    items: [] as TenderItem[],
    requiredDocuments: [] as string[],
  });

  const toggleRequiredDocument = (key: string) => {
    setForm(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.includes(key)
        ? prev.requiredDocuments.filter(d => d !== key)
        : [...prev.requiredDocuments, key],
    }));
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await getCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        addToast('Failed to load categories', 'error');
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, [addToast]);

  const handleSubmit = async () => {
    if (!form.title || !form.categoryId || !form.closingDate) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createTender({
        title: form.title,
        categoryId: form.categoryId,
        description: form.description,
        status: form.status,
        openingDate: form.openingDate,
        closingDate: form.closingDate,
        estimatedBudget: parseFloat(form.estimatedBudget) || 0,
        items: form.items,
        requiredDocuments: form.requiredDocuments,
      });

      addToast('Tender created successfully', 'success');
      onClose();
    } catch (error: any) {
      console.error('Error creating tender:', error);
      addToast(error.response?.data?.message || 'Failed to create tender', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelImport = (importedItems: TenderItem[]) => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, ...importedItems]
    }));
    addToast(`Added ${importedItems.length} items from Excel`, 'success');
  };

  const addItem = () => {
    const newItemNo = form.items.length + 1;
    setForm({
      ...form,
      items: [...form.items, {
        itemNo: newItemNo,
        description: '',
        unit: '',
        quantity: 0,
        estimatedUnitPrice: 0,
      }],
    });
  };

  const updateItem = (index: number, field: keyof TenderItem, value: any) => {
    const updatedItems = [...form.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setForm({ ...form, items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = form.items.filter((_, i) => i !== index);
    updatedItems.forEach((item, i) => { item.itemNo = i + 1; });
    setForm({ ...form, items: updatedItems });
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <label className="block text-sm font-medium mb-1.5">Tender Title <span className="text-red-500">*</span></label>
        <input 
          value={form.title} 
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50" 
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Category <span className="text-red-500">*</span></label>
          <select 
            value={form.categoryId} 
            onChange={e => setForm({ ...form, categoryId: e.target.value })}
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none"
            disabled={loadingCategories}
          >
            <option value="">{loadingCategories ? 'Loading categories...' : 'Select Category'}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Status</label>
          <select 
            value={form.status} 
            onChange={e => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none">
            <option>Draft</option>
            <option>Open</option>
            <option>Closed</option>
            <option>Awarded</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">Description</label>
        <textarea 
          value={form.description} 
          onChange={e => setForm({ ...form, description: e.target.value })} 
          rows={4}
          className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Opening Date</label>
          <input 
            type="date" 
            value={form.openingDate} 
            onChange={e => setForm({ ...form, openingDate: e.target.value })}
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Closing Date <span className="text-red-500">*</span></label>
          <input 
            type="date" 
            value={form.closingDate} 
            onChange={e => setForm({ ...form, closingDate: e.target.value })}
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1.5">Estimated Budget (GHS)</label>
        <input 
          type="number" 
          value={form.estimatedBudget} 
          onChange={e => setForm({ ...form, estimatedBudget: e.target.value })}
          className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
        />
      </div>

      {/* Required Documents Section */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Required Documents</label>
        <p className="text-xs text-muted-foreground mb-2">
          Select the documents suppliers must have on file to bid on this tender.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(DOCUMENT_CONFIG).map(([key, config]) => {
            const checked = form.requiredDocuments.includes(key);
            return (
              <label
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  checked ? 'border-primary bg-primary/10' : 'border-border bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRequiredDocument(key)}
                  className="accent-primary"
                />
                <span>{config.name}</span>
              </label>
            );
          })}
        </div>
        {form.requiredDocuments.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {form.requiredDocuments.length} document{form.requiredDocuments.length > 1 ? 's' : ''} required
          </p>
        )}
      </div>

      {/* Tender Items Section with Excel Import */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Tender Items</label>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setShowExcelImport(true)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Upload size={12} /> Import from Excel
            </button>
            <button 
              type="button"
              onClick={addItem}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>
        </div>
        
        {form.items.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            No items added. Click "Import from Excel" or "Add Item" to add tender items.
          </div>
        ) : (
          form.items.map((item, idx) => (
            <div key={idx} className="p-3 bg-muted/30 rounded-lg mb-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-1">
                  <label className="text-xs text-muted-foreground">#</label>
                  <input value={item.itemNo} disabled className="w-full px-2 py-1.5 bg-muted/50 rounded text-sm" />
                </div>
                <div className="col-span-4">
                  <label className="text-xs text-muted-foreground">Description</label>
                  <input 
                    value={item.description} 
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded text-sm" 
                    placeholder="Item description"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Unit</label>
                  <input 
                    value={item.unit} 
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded text-sm" 
                    placeholder="e.g., Piece, Set"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Quantity</label>
                  <input 
                    type="number"
                    value={item.quantity || ''} 
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded text-sm" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Est. Price</label>
                  <input 
                    type="number"
                    value={item.estimatedUnitPrice || ''} 
                    onChange={e => updateItem(idx, 'estimatedUnitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 bg-muted/50 border border-border rounded text-sm" 
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <button 
                    onClick={() => removeItem(idx)}
                    className="text-destructive text-sm p-1.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button onClick={onClose} className="px-4 py-2 bg-muted rounded-lg text-sm">Cancel</button>
        <button 
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Tender'}
        </button>
      </div>

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImport
          onImport={handleExcelImport}
          onClose={() => setShowExcelImport(false)}
          existingItems={form.items}
        />
      )}
    </div>
  );
}