import { useState, useEffect } from 'react';
import PortalLayout from '@/components/PortalLayout';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useNotification } from '@/context/NotificationContext';
import { formatDate } from '@/utils/helpers';
import { Plus, Edit, Shield, Loader2, Trash2 } from 'lucide-react';
import { getAdminUsers, createAdminUser, deleteAdminUser } from '@/services/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: string;
}

export default function UserManagement() {
  const { addToast } = useNotification();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    password: '',
  });

  // Fetch admin users from backend using API service
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getAdminUsers();
        const data = response.data;
        console.log('Fetched admin users:', data);
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        addToast('Failed to load users', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [addToast]);

  // Reset form when modal opens
  useEffect(() => {
    if (showAdd) {
      setNewUser({
        name: '',
        email: '',
        role: 'Viewer',
        password: '',
      });
    }
  }, [showAdd]);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await createAdminUser(newUser);
      const createdUser = response.data;
      setUsers([...users, createdUser]);
      addToast('User added successfully', 'success');
      setShowAdd(false);
    } catch (error: any) {
      console.error('Error adding user:', error);
      addToast(error.response?.data?.message || 'Failed to add user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      await deleteAdminUser(deleteId);
      setUsers(prev => prev.filter(u => u.id !== deleteId));
      addToast('User deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      addToast(error.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <PortalLayout type="admin" title="User Management" breadcrumb={['Admin', 'Users']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout type="admin" title="User Management" breadcrumb={['Admin', 'Users']}>
      <div className="space-y-4 animate-fade-in">
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
            <Plus size={16} /> Add User
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Last Login</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1">
                      <Shield size={12} /> {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDate(u.lastLogin) || 'Never'}</td>
                  <td className="p-3"><StatusBadge status={u.status as any} /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded hover:bg-muted/50" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => setDeleteId(u.id)} 
                        className="p-1.5 rounded hover:bg-destructive/20 text-destructive" 
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No admin users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New User">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name *</label>
            <input 
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email *</label>
            <input 
              type="email" 
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Role *</label>
            <select 
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none"
            >
              <option>Super Admin</option>
              <option>Procurement Officer</option>
              <option>Evaluator</option>
              <option>Viewer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Temporary Password *</label>
            <input 
              type="password" 
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none" 
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button 
              onClick={() => setShowAdd(false)} 
              className="px-4 py-2 bg-muted rounded-lg text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddUser}
              disabled={submitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDeleteUser}
        title="Delete User" 
        message="Are you sure you want to delete this user? This action cannot be undone." 
        confirmText={deleting ? 'Deleting...' : 'Delete'} 
        variant="danger" 
      />
    </PortalLayout>
  );
}