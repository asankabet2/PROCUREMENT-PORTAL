import { useState } from 'react';
import Modal from '@/components/Modal';
import { useNotification } from '@/context/NotificationContext';
import { changePassword } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isFirstLogin?: boolean;
  userName?: string;
}

export default function ChangePasswordModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  isFirstLogin = false,
  userName 
}: ChangePasswordModalProps) {
  const { addToast } = useNotification();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      addToast('Current password is required', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      
      addToast('Password changed successfully!', 'success');
      
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error: any) {
      addToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isFirstLogin ? 'Set Your Password' : 'Change Password'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {userName && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-sm">
              Welcome, <span className="font-bold">{userName}</span>!
            </p>
            {isFirstLogin && (
              <p className="text-xs text-muted-foreground mt-1">
                This is your first login. Please set your permanent password.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Current Password *</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1.5">New Password *</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1.5">Confirm New Password *</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-muted/50 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-muted rounded-lg text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : (isFirstLogin ? 'Set Password' : 'Change Password')}
          </button>
        </div>
      </form>
    </Modal>
  );
}