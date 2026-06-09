import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'primary' }: ConfirmDialogProps) {
  if (!isOpen) return null;
  const btnClass = variant === 'danger' ? 'bg-destructive hover:bg-destructive/80' : variant === 'warning' ? 'bg-warning text-warning-foreground hover:bg-warning/80' : 'bg-primary hover:bg-primary/80';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-md w-full bg-card border border-border rounded-xl p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-foreground ${btnClass}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
