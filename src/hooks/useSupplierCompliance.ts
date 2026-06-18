import { useState, useEffect } from 'react';
import { getSupplierDocuments } from '@/services/api';

interface ExpiredDocument {
  name: string;
  expiryDate: string;
  docType: string;
}

interface BlockingDocument {
  name: string;
  docType: string;
  status: 'Rejected' | 'Pending';
}

export function useSupplierCompliance(supplierId: string) {
  const [hasExpiredDocuments, setHasExpiredDocuments]   = useState(false);
  const [expiredDocuments, setExpiredDocuments]         = useState<ExpiredDocument[]>([]);
  const [hasRejectedDocuments, setHasRejectedDocuments] = useState(false);
  const [hasPendingDocuments, setHasPendingDocuments]   = useState(false);
  const [blockingDocuments, setBlockingDocuments]       = useState<BlockingDocument[]>([]);
  const [canParticipate, setCanParticipate]             = useState(true);
  const [complianceReason, setComplianceReason]         = useState<string | null>(null);
  const [loading, setLoading]                           = useState(true);

  useEffect(() => {
    const checkDocuments = async () => {
      if (!supplierId) {
        setLoading(false);
        return;
      }

      try {
        const response = await getSupplierDocuments(supplierId);
        const docs = response.data || [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expired = docs.filter((doc: any) => {
          if (!doc.requiresExpiry) return false;
          if (doc.status === 'Replaced') return false;
          if (!doc.expiryDate) return false;
          const expiryDate = new Date(doc.expiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          return expiryDate < today;
        });

        const rejected = docs.filter((doc: any) => doc.status === 'Rejected');
        const pending  = docs.filter((doc: any) => doc.status === 'Pending');

        const blocking: BlockingDocument[] = [
          ...rejected.map((d: any) => ({ name: d.name, docType: d.docType, status: 'Rejected' as const })),
          ...pending.map((d: any)  => ({ name: d.name, docType: d.docType, status: 'Pending'  as const })),
        ];

        const blocked = expired.length > 0 || rejected.length > 0 || pending.length > 0;

        // Build a specific reason message for the UI
        let reason: string | null = null;
        if (expired.length > 0 && rejected.length === 0 && pending.length === 0) {
          reason = 'You have expired documents. Please renew them before submitting a bid.';
        } else if (rejected.length > 0 && expired.length === 0 && pending.length === 0) {
          reason = 'You have rejected documents. Please re-upload them before submitting a bid.';
        } else if (pending.length > 0 && expired.length === 0 && rejected.length === 0) {
          reason = 'You have documents pending verification. Please wait for admin approval before submitting a bid.';
        } else if (blocked) {
          reason = 'You have document issues (expired, rejected, or pending verification) that must be resolved before submitting a bid.';
        }

        setHasExpiredDocuments(expired.length > 0);
        setExpiredDocuments(expired.map((d: any) => ({
          name: d.name, expiryDate: d.expiryDate, docType: d.docType,
        })));
        setHasRejectedDocuments(rejected.length > 0);
        setHasPendingDocuments(pending.length > 0);
        setBlockingDocuments(blocking);
        setCanParticipate(!blocked);
        setComplianceReason(reason);
      } catch (error) {
        console.error('Error checking document compliance:', error);
        setHasExpiredDocuments(false);
        setExpiredDocuments([]);
        setHasRejectedDocuments(false);
        setHasPendingDocuments(false);
        setBlockingDocuments([]);
        setCanParticipate(true);
        setComplianceReason(null);
      } finally {
        setLoading(false);
      }
    };

    checkDocuments();
  }, [supplierId]);

  return {
    hasExpiredDocuments,
    expiredDocuments,
    hasRejectedDocuments,
    hasPendingDocuments,
    blockingDocuments,
    canParticipate,
    complianceReason,
    loading,
  };
}