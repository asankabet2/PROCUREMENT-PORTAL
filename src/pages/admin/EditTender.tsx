import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import { useNotification } from '@/context/NotificationContext';
import { Save, Loader2, Trash2, Plus } from 'lucide-react';
import { DOCUMENT_CONFIG } from '@/constants/documents';
import { getCategories, getTenderById, updateTender } from '@/services/api';

interface TenderItem {
  itemNo: number;
  description: string;
  unit: string;
  quantity: number;
  estimatedUnitPrice: number;
}

interface Tender {
  id: string;
  title: string;
  categoryId: string;
  category: string;
  description: string;
  status: string;
  publishedDate: string;
  openingDate: string;
  closingDate: string;
  estimatedBudget: number;
  requiredDocuments: string[];
  items: TenderItem[];
}

export default function EditTender() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Tender | null>(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await getCategories();
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch tender data
  useEffect(() => {
    const fetchTender = async () => {
      if (!id) return;
      
      try {
        const { data } = await getTenderById(id);
        setForm(data);
      } catch (error) {
        console.error('Error fetching tender:', error);
        addToast('Failed to load tender', 'error');
        navigate('/admin/tenders');
      } finally {
        setLoading(false);
      }
    };

    fetchTender();
  }, [id, navigate, addToast]);

  const handleSave = async () => {
    if (!form) return;
    
    setSaving(true);
    try {
      await updateTender(id, {
        title: form.title,
        categoryId: form.categoryId,
        description: form.description,
        status: form.status,
        openingDate: form.openingDate,
        closingDate: form.closingDate,
        estimatedBudget: form.estimatedBudget,
        items: form.items || [],
        requiredDocuments: form.requiredDocuments || [],
      });

      addToast('Tender updated successfully', 'success');
      navigate(`/admin/tenders/${id}`);
    } catch (error: any) {
      console.error('Error updating tender:', error);
      addToast(error.response?.data?.message || 'Failed to update tender', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleRequiredDocument = (key: string) => {
    if (!form) return;
    const current = form.requiredDocuments || [];
    setForm({
      ...form,
      requiredDocuments: current.includes(key)
        ? current.filter(d => d !== key)
        : [...current, key],
    });
  };

  const addItem = () => {
    if (!form) return;
    const newItemNo = (form.items?.length || 0) + 1;
    setForm({
      ...form,
      items: [...(form.items || []), {
        itemNo: newItemNo,
        description: '',
        unit: '',
        quantity: 0,
        estimatedUnitPrice: 0,
      }],
    });
  };

  const updateItem = (index: number, field: keyof TenderItem, value: any) => {
    if (!form) return;
    const updatedItems = [...(form.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setForm({ ...form, items: updatedItems });
  };

  const removeItem = (index: number) => {
    if (!form) return;
    const updatedItems = (form.items || []).filter((_, i) => i !== index);
    // Re-number items
    updatedItems.forEach((item, i) => { item.itemNo = i + 1; });
    setForm({ ...form, items: updatedItems });
  };

  if (loading) {
    return (
      <PortalLayout type="admin" title="Edit Tender" breadcrumb={['Admin', 'Tenders', 'Edit']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (!form) {
    return (
      <PortalLayout type="admin" title="Edit Tender" breadcrumb={['Admin', 'Tenders', 'Edit']}>
        <div className="text-center py-12 text-destructive">Tender not found</div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="admin" title="Edit Tender" breadcrumb={['Admin', 'Tenders', form.title]}>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Edit Tender</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Tender ID</label>
              <input 
                value={form.id} 
                disabled
                className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-lg text-sm text-muted-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-500">*</span></label>
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
                >
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
                  <option>Cancelled</option>
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
                  value={form.openingDate?.split('T')[0] || ''} 
                  onChange={e => setForm({ ...form, openingDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Closing Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={form.closingDate?.split('T')[0] || ''} 
                  onChange={e => setForm({ ...form, closingDate: e.target.value })}
                  className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">Estimated Budget (GHS)</label>
              <input 
                type="number" 
                value={form.estimatedBudget || ''} 
                onChange={e => setForm({ ...form, estimatedBudget: parseFloat(e.target.value) || 0 })}
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
                  const checked = (form.requiredDocuments || []).includes(key);
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
              {(form.requiredDocuments || []).length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {(form.requiredDocuments || []).length} document{(form.requiredDocuments || []).length > 1 ? 's' : ''} required
                </p>
              )}
            </div>

            {/* Tender Items Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Tender Items</label>
                <button 
                  type="button"
                  onClick={addItem}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>
              {form.items?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                  No items added. Click "Add Item" to add tender items.
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
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button 
              onClick={() => navigate(`/admin/tenders/${id}`)} 
              className="px-4 py-2 bg-muted rounded-lg text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}