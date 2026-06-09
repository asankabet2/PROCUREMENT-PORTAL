import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { downloadBidReceipt } from '@/services/api';
import { useNotification } from '@/context/NotificationContext';

interface DownloadButtonProps {
  type: 'receipt';
  bidId?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  children?: React.ReactNode;
}

export default function DownloadButton({
  type,
  bidId,
  className = '',
  variant = 'primary',
  children
}: DownloadButtonProps) {
  const { addToast } = useNotification();
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (type === 'receipt' && !bidId) {
      addToast('No bid ID provided', 'error');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (type === 'receipt' && bidId) {
        result = await downloadBidReceipt(bidId);
      }

      if (result?.success) {
        addToast('Bid receipt downloaded successfully', 'success');
      }
    } catch (error: any) {
      addToast(error.message || 'Download failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary text-primary-foreground hover:bg-primary/80';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
      case 'outline':
        return 'border border-border hover:bg-muted';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/80';
    }
  };

  const getIcon = () => {
    if (loading) return <Loader2 size={16} className="animate-spin" />;
    return <FileText size={16} />;
  };

  const getDefaultText = () => 'Download Receipt';

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${getVariantClasses()} ${className}`}
    >
      {getIcon()}
      {children || getDefaultText()}
    </button>
  );
}