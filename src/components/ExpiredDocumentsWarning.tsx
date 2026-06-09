import { Link } from 'react-router-dom';
import { AlertTriangle, FileText } from 'lucide-react';

interface ExpiredDocument {
  name: string;
  expiryDate: string;
  docType: string;
}

interface ExpiredDocumentsWarningProps {
  expiredDocuments: ExpiredDocument[];
  type?: 'bid' | 'interest' | 'both';
}

export default function ExpiredDocumentsWarning({ 
  expiredDocuments, 
  type = 'both' 
}: ExpiredDocumentsWarningProps) {
  if (expiredDocuments.length === 0) return null;

  const actionText = type === 'bid' 
    ? 'submit bids' 
    : type === 'interest' 
      ? 'express interest' 
      : 'submit bids or express interest';

  return (
    <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-600">Cannot {actionText}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            You have expired documents that need to be renewed before you can {actionText}.
          </p>
          
          <div className="mt-3">
            <p className="text-xs font-medium text-red-500">Expired documents:</p>
            <ul className="text-xs list-disc list-inside mt-1 text-muted-foreground">
              {expiredDocuments.map(doc => (
                <li key={doc.docType}>
                  {doc.name} (expired on {new Date(doc.expiryDate).toLocaleDateString()})
                </li>
              ))}
            </ul>
          </div>
          
          <Link 
            to="/supplier/documents" 
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <FileText size={14} />
            Renew Documents →
          </Link>
        </div>
      </div>
    </div>
  );
}