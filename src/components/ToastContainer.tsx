import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

const icons = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info };
const styles = {
  success: 'border-emerald-600  bg-emerald-800  text-white',
  error:   'border-red-600      bg-red-800      text-white',
  warning: 'border-amber-600    bg-amber-700    text-white',
  info:    'border-blue-600     bg-blue-800     text-white',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotification();
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles[t.type]} animate-fade-in`}>
            <Icon size={18} className="shrink-0" />
            <span className="text-sm flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}