import { useState, useEffect } from 'react';
import { getSupplierDocuments } from '@/services/api';

interface ExpiredDocument {
  name: string;
  expiryDate: string;
  docType: string;
}

export function useSupplierCompliance(supplierId: string) {
  const [hasExpiredDocuments, setHasExpiredDocuments] = useState(false);
  const [expiredDocuments, setExpiredDocuments] = useState<ExpiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [canParticipate, setCanParticipate] = useState(true);

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
        
        setHasExpiredDocuments(expired.length > 0);
        setExpiredDocuments(expired.map((d: any) => ({
          name: d.name,
          expiryDate: d.expiryDate,
          docType: d.docType
        })));
        setCanParticipate(expired.length === 0);
      } catch (error) {
        console.error('Error checking document compliance:', error);
        setHasExpiredDocuments(false);
        setExpiredDocuments([]);
        setCanParticipate(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkDocuments();
  }, [supplierId]);
  
  return { hasExpiredDocuments, expiredDocuments, loading, canParticipate };
}