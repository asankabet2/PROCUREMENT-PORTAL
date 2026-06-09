import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import Modal from '@/components/Modal';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import { Search, Eye, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { getSuppliers, updateSupplierStatus } from '@/services/api';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  registrationNumber: string;
  companyName: string;
  categories: Category[] | string[];
  email: string;
  dateApplied: string;
  status: string;
  rejectionReason?: string;
}

export default function SupplierManagement() {
  const navigate = useNavigate();
  const { addToast } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const tabs = ['All', 'Pending', 'Approved', 'Rejected', 'Blacklisted'];

  // Fetch suppliers from backend using API service
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await getSuppliers();
        setSuppliers(response.data);
      } catch (error: any) {
        console.error('Failed to fetch suppliers:', error);
        addToast(error.response?.data?.message || 'Failed to load suppliers', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [addToast]);

  const handleUpdateSupplierStatus = async (id: string, status: string, rejectionReason?: string) => {
    setUpdating(true);
    try {
      const response = await updateSupplierStatus(id, { status, rejectionReason });
      const updatedSupplier = response.data;
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updatedSupplier } : s));
      addToast(`Supplier ${status.toLowerCase()} successfully`, 'success');
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      addToast(error.response?.data?.message || 'Failed to update supplier status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async () => {
    if (approveId) {
      await handleUpdateSupplierStatus(approveId, 'Approved');
      setApproveId(null);
    }
  };

  const handleReject = async () => {
    if (rejectId && rejectReason.trim()) {
      await handleUpdateSupplierStatus(rejectId, 'Rejected', rejectReason);
      setRejectId(null);
      setRejectReason('');
    } else if (rejectId && !rejectReason.trim()) {
      addToast('Please provide a rejection reason', 'error');
    }
  };

  // Helper function to display categories
  const displayCategories = (supplier: Supplier): string => {
    if (!supplier.categories || supplier.categories.length === 0) return '—';
    
    // Check if categories are objects with name property or just strings
    if (typeof supplier.categories[0] === 'object' && supplier.categories[0] !== null) {
      return (supplier.categories as Category[]).map(c => c.name).join(', ');
    }
    return (supplier.categories as string[]).join(', ');
  };

  const filtered = suppliers
    .filter(s => filter === 'All' || s.status === filter)
    .filter(s => s.companyName?.toLowerCase().includes(search.toLowerCase()) || 
                  s.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <PortalLayout type="admin" title="Supplier Management" breadcrumb={['Admin', 'Suppliers']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="admin" title="Supplier Management" breadcrumb={['Admin', 'Suppliers']}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab} {tab === 'Pending' && `(${suppliers.filter(s => s.status === 'Pending').length})`}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-muted/50 rounded-lg px-3 py-2 gap-2">
            <Search size={16} className="text-muted-foreground" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search suppliers..."
              className="bg-transparent text-sm outline-none w-48" 
            />
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Reg No</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Company Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Applied</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${s.status === 'Pending' ? 'bg-warning/5' : ''}`}>
                    <td className="p-3 font-mono text-xs">{s.registrationNumber || '—'}</td>
                    <td className="p-3 font-medium">{s.companyName}</td>
                    <td className="p-3 text-muted-foreground text-xs">{displayCategories(s)}</td>
                    <td className="p-3 text-muted-foreground">{s.email}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(s.dateApplied)}</td>
                    <td className="p-3"><StatusBadge status={s.status as any} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => navigate(`/admin/suppliers/${s.id}`)} 
                          className="p-1.5 rounded hover:bg-muted/50" 
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        {s.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => setApproveId(s.id)} 
                              className="p-1.5 rounded hover:bg-success/20 text-success" 
                              title="Approve"
                              disabled={updating}
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button 
                              onClick={() => setRejectId(s.id)} 
                              className="p-1.5 rounded hover:bg-destructive/20 text-destructive" 
                              title="Reject"
                              disabled={updating}
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                   </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No suppliers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog 
        isOpen={!!approveId} 
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title="Approve Supplier" 
        message={`Confirm approval of ${suppliers.find(s => s.id === approveId)?.companyName}?`}
        confirmText="Approve" 
        variant="primary" 
      />

      {/* Reject Modal */}
      <Modal isOpen={!!rejectId} onClose={() => setRejectId(null)} title="Reject Supplier">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Rejecting: <strong>{suppliers.find(s => s.id === rejectId)?.companyName}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reason for Rejection *</label>
            <textarea 
              value={rejectReason} 
              onChange={e => setRejectReason(e.target.value)} 
              rows={3}
              className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none resize-none" 
              placeholder="Enter reason..." 
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setRejectId(null)} 
              className="px-4 py-2 bg-muted rounded-lg text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleReject}
              className="px-4 py-2 bg-destructive text-foreground rounded-lg text-sm font-medium"
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>
    </PortalLayout>
  );
}