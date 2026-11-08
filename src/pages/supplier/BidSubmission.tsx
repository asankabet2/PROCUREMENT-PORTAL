import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StepIndicator from '@/components/StepIndicator';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getTenderById, getSupplierById, submitBid, downloadBidReceipt, getBidDraft, patchBidDraft, deleteBidDraft, downloadBidTemplate, importBidDraft } from '@/services/api'
import { formatCurrency } from '@/utils/helpers';
import { CheckCircle, Download, Loader2, AlertTriangle, FileSpreadsheet, Upload, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';
import { useSupplierCompliance } from '@/hooks/useSupplierCompliance';

const steps = ['Confirm Eligibility', 'Price Items', 'Review & Submit'];

interface TenderItem {
  itemNo: number;
  tenderItemId: string;
  description: string;
  unit: string;
  quantity: number;
  estimatedUnitPrice: number;
}

interface Tender {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  closingDate: string;
  estimatedBudget: number;
  requiredDocuments: string[];
  items: TenderItem[];
}

interface Supplier {
  id: string;
  companyName: string;
  registrationNumber: string;
  contactPerson: string;
  email: string;
}

// Bid quantity is NOT entered by the supplier; it always equals the tender quantity
interface ItemEntry {
  included: boolean;
  unitPrice: number;
  countryOfOrigin: string;
  packSize: string;
  expiryDate: string; // YYYY-MM-DD
}

interface ImportReport {
  imported: number;
  unchanged: number;
  problemCount: number;
  problems: { row: number; itemNo: number | null; message: string }[];
}

const DEFAULT_ENTRY: ItemEntry = {
  included: true,
  unitPrice: 0,
  countryOfOrigin: '',
  packSize: '',
  expiryDate: '',
};

const todayStr = () => new Date().toISOString().split('T')[0];
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

type StatusFilter = 'all' | 'incomplete' | 'complete' | 'skipped';

const REVIEW_PER_PAGE = 50;

// A bid row is complete when it has everything the server asks for on submit
const isEntryComplete = (e: ItemEntry, today: string) =>
  e.unitPrice > 0 &&
  !!e.countryOfOrigin.trim() &&
  !!e.packSize.trim() &&
  !!e.expiryDate &&
  e.expiryDate > today;

// "1, 2, 3 and 3990 more" instead of a message listing thousands of numbers
const listItemNos = (nos: number[], max = 10) =>
  nos.length <= max ? nos.join(', ') : `${nos.slice(0, max).join(', ')} and ${nos.length - max} more`;

export default function BidSubmission() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [tender, setTender] = useState<Tender | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedBidId, setSubmittedBidId] = useState<string>('');
  const [bidWarning, setBidWarning] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [itemEntries, setItemEntries] = useState<Record<number, ItemEntry>>({});
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draftReady, setDraftReady] = useState(false);
  const [saveTick, setSaveTick] = useState(0);
  const dirtyRef = useRef<Set<number>>(new Set());   // itemNos edited since the last save
  const savingRef = useRef(false);
  const draftRestoredRef = useRef(false);
  const [excelBusy, setExcelBusy] = useState<'download' | 'upload' | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  

 
  // Price Items table: paging, search and status filter
  const [pricePage, setPricePage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterTick, setFilterTick] = useState(0); // bump to re-apply the filter to the latest edits
  const [reviewPage, setReviewPage] = useState(1); 
  
  const {
    hasExpiredDocuments, expiredDocuments, canParticipate,
    complianceReason, loading: complianceLoading,
  } = useSupplierCompliance(user?.id || '');

  // Expired documents are only a warning now. Rejected / pending documents still block,
  // and the server enforces that as well.
  const canBid = canParticipate || hasExpiredDocuments;

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      try {
        setLoading(true);
        const [tenderRes, supplierRes] = await Promise.all([
          getTenderById(id),
          getSupplierById(user.id),
        ]);
        setTender(tenderRes.data);
        setSupplier(supplierRes.data);

        if (!draftRestoredRef.current) {
          draftRestoredRef.current = true;
          try {
            const draftRes = await getBidDraft(id);
            const saved = draftRes.data?.draft;
            if (saved?.entries) {
              const restored: Record<number, ItemEntry> = {};
              (tenderRes.data.items as TenderItem[]).forEach((ti) => {
                const e = saved.entries[ti.tenderItemId];
                if (e) restored[ti.itemNo] = { ...DEFAULT_ENTRY, ...e };
              });
              if (Object.keys(restored).length > 0) {
                setItemEntries(restored);
                setSavedAt(new Date(saved.updatedAt));
                addToast('Your saved draft was restored', 'success');
              }
            }
          } catch (draftErr) {
            console.error('Failed to load draft:', draftErr); // never block the form
          }
          setDraftReady(true);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        addToast('Failed to load bid data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user, addToast]);

  useEffect(() => {
    if (!canBid && !loading && tender?.status === 'Open' && complianceReason) {
      addToast(complianceReason, 'warning');
    }
  }, [canBid, loading, tender?.status, complianceReason, addToast]);

  const entriesRef = useRef(itemEntries);
  entriesRef.current = itemEntries;

  const saveDraft = useCallback(async () => {
    if (!tender || savingRef.current || dirtyRef.current.size === 0) return;
    savingRef.current = true;

    const ids = Array.from(dirtyRef.current);
    dirtyRef.current = new Set();
    setSaveState('saving');
    let failed = false;

    try {
      const tenderItemIdByNo = new Map(tender.items.map((ti) => [ti.itemNo, ti.tenderItemId]));
      const changes: Record<string, ItemEntry> = {};
      ids.forEach((no) => {
        const entry = entriesRef.current[no];
        const tenderItemId = tenderItemIdByNo.get(no);
        if (entry && tenderItemId) changes[tenderItemId] = entry;
      });

      const res = await patchBidDraft(tender.id, { changes });
      setSavedAt(new Date(res.data?.updatedAt ?? Date.now()));
      setSaveState('saved');
    } catch (err) {
      console.error('Draft save failed:', err);
      failed = true;
      ids.forEach((no) => dirtyRef.current.add(no));   // retry these on the next save
      setSaveState('error');
    } finally {
      savingRef.current = false;
      if (!failed && dirtyRef.current.size > 0) setSaveTick((t) => t + 1);
    }
  }, [tender]);

  useEffect(() => {
    if (!draftReady || submitted || !canBid || tender?.status !== 'Open') return;
    if (dirtyRef.current.size === 0) return;
    const t = setTimeout(() => { void saveDraft(); }, 2000);
    return () => clearTimeout(t);
  }, [itemEntries, saveTick, saveDraft, draftReady, submitted, canBid, tender?.status]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void saveDraft(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [saveDraft]);

  // Computed from a snapshot of the entries (entriesRef), and only when the search, the filter or
  // filterTick changes, so rows stay put while a supplier is typing in them.
  const filteredItems = useMemo(() => {
    if (!tender) return [] as TenderItem[];
    const q = search.trim().toLowerCase();
    const today = todayStr();
    return tender.items.filter((it) => {
      if (q && !String(it.itemNo).includes(q) && !(it.description || '').toLowerCase().includes(q)) return false;
      if (statusFilter === 'all') return true;
      const e = entriesRef.current[it.itemNo] || DEFAULT_ENTRY;
      if (statusFilter === 'skipped') return !e.included;
      const complete = e.included && isEntryComplete(e, today);
      return statusFilter === 'complete' ? complete : e.included && !complete;
    });
  }, [tender, search, statusFilter, filterTick]);

  if (loading || complianceLoading) {
    return (
      <PortalLayout type="supplier" title="Loading..." breadcrumb={['Supplier', 'Tenders', id || '', 'Bid']}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (!tender) {
    return (
      <PortalLayout type="supplier" title="Not Found" breadcrumb={['Supplier', 'Tenders', id || '', 'Bid']}>
        <EmptyState title="Tender Not Found" description="This tender doesn't exist or has been removed." />
      </PortalLayout>
    );
  }

  if (tender.status !== 'Open') {
    return (
      <PortalLayout type="supplier" title="Bid Not Available" breadcrumb={['Supplier', 'Tenders', tender.id, 'Bid']}>
        <EmptyState title="Bidding Closed" description={`This tender is ${tender.status}. Bids are no longer being accepted.`} />
      </PortalLayout>
    );
  }

  // Items are included by default; suppliers can untick to skip.
  const getEntry = (itemNo: number): ItemEntry => itemEntries[itemNo] || DEFAULT_ENTRY;
    const updateEntry = <K extends keyof ItemEntry>(itemNo: number, field: K, value: ItemEntry[K]) => {
    dirtyRef.current.add(itemNo);
    setItemEntries((prev) => ({
      ...prev,
      [itemNo]: { ...(prev[itemNo] || DEFAULT_ENTRY), [field]: value },
    }));
  };

  const toggleIncluded = (itemNo: number) => {
    dirtyRef.current.add(itemNo); 
    setItemEntries((prev) => {
      const current = prev[itemNo] || DEFAULT_ENTRY;
      return { ...prev, [itemNo]: { ...current, included: !current.included } };
    });
  };

  // Only the items the supplier chose to bid on
  const includedItems = tender.items.filter((i) => getEntry(i.itemNo).included);

  // Bid quantity = tender quantity
  const items = includedItems.map((i) => {
    const entry = getEntry(i.itemNo);
    return {
      ...i,
      supplierQuantity: i.quantity,
      unitPrice:        entry.unitPrice,
      countryOfOrigin:  entry.countryOfOrigin.trim(),
      packSize:         entry.packSize.trim(),
      expiryDate:       entry.expiryDate,
      total:            i.quantity * entry.unitPrice,
    };
  });

  const grandTotal = items.reduce((a, i) => a + i.total, 0);

  // Price Items table: paging over the filtered list
  const totalPricePages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePricePage   = Math.min(pricePage, totalPricePages);
  const pagedPriceItems = filteredItems.slice((safePricePage - 1) * pageSize, safePricePage * pageSize);

  const goToPage = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n)) setPricePage(Math.min(Math.max(1, n), totalPricePages));
  };
  const refreshList = () => { setPricePage(1); setFilterTick((t) => t + 1); };

  // Progress across the whole tender
  const todayForProgress = todayStr();
  const progress = tender.items.reduce(
    (acc, it) => {
      const e = getEntry(it.itemNo);
      if (!e.included) acc.skipped++;
      else if (isEntryComplete(e, todayForProgress)) acc.complete++;
      else acc.incomplete++;
      return acc;
    },
    { complete: 0, incomplete: 0, skipped: 0 }
  );

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all',        label: 'All',         count: tender.items.length },
    { key: 'incomplete', label: 'Incomplete',  count: progress.incomplete },
    { key: 'complete',   label: 'Complete',    count: progress.complete },
    { key: 'skipped',    label: 'Not bidding', count: progress.skipped },
  ];

  const rangeFrom = filteredItems.length === 0 ? 0 : (safePricePage - 1) * pageSize + 1;
  const rangeTo   = Math.min(safePricePage * pageSize, filteredItems.length);

  // Review step: paging over the items being bid on
  const totalReviewPages = Math.max(1, Math.ceil(items.length / REVIEW_PER_PAGE));
  const safeReviewPage   = Math.min(reviewPage, totalReviewPages);
  const pagedReviewItems = items.slice((safeReviewPage - 1) * REVIEW_PER_PAGE, safeReviewPage * REVIEW_PER_PAGE);

  const validate = () => {
    const e: string[] = [];
    if (step === 0 && !confirmed) e.push('Please confirm eligibility');
    if (step === 1) {
      if (includedItems.length === 0) {
        e.push('Select at least one item to bid on');
      } else {
        const today = todayStr();

        const badPrice = includedItems.filter((i) => !(getEntry(i.itemNo).unitPrice > 0));
        const badDetails = includedItems.filter((i) => {
          const en = getEntry(i.itemNo);
          return !en.countryOfOrigin.trim() || !en.packSize.trim() || !en.expiryDate;
        });
        const badExpiry = includedItems.filter((i) => {
          const en = getEntry(i.itemNo);
          return en.expiryDate && en.expiryDate <= today;
        });

        if (badPrice.length > 0)
          e.push(`Enter a unit price for ${badPrice.length} item(s): ${listItemNos(badPrice.map((i) => i.itemNo))}`);
        if (badDetails.length > 0)
          e.push(`Country of origin, pack size and expiry date are required for ${badDetails.length} item(s): ${listItemNos(badDetails.map((i) => i.itemNo))}`);
        if (badExpiry.length > 0)
          e.push(`Expiry date must be in the future for ${badExpiry.length} item(s): ${listItemNos(badExpiry.map((i) => i.itemNo))}`);

        // Show the supplier every problem row at once
        if (badPrice.length + badDetails.length + badExpiry.length > 0) {
          setSearch('');
          setStatusFilter('incomplete');
          setPricePage(1);
          setFilterTick((t) => t + 1);
        }
      }
    }
    if (step === 2 && !finalConfirm) e.push('Please confirm bid accuracy');
    setErrors(e);
    return e.length === 0;
  };

  const next = () => { if (validate()) { void saveDraft(); setStep((s) => s + 1); } };
  const back = () => { void saveDraft(); setStep((s) => s - 1); };

  const submit = async () => {
    if (!validate()) return;

    if (!canBid) {
      addToast(complianceReason || 'Please resolve your document issues before submitting a bid', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const bidData = {
        bidId:         `BID-${Date.now().toString(36).toUpperCase()}`,
        tenderId:      tender.id,
        supplierId:    user?.id,
        items: items.map((item) => ({
          itemNo:          item.itemNo,
          tenderItemId:    item.tenderItemId,
          description:     item.description,
          unit:            item.unit,
          quantity:        item.supplierQuantity, // equals tender quantity
          unitPrice:       item.unitPrice,
          total:           item.total,
          countryOfOrigin: item.countryOfOrigin,
          packSize:        item.packSize,
          expiryDate:      item.expiryDate,
        })),
        grandTotal,
        status:        'Submitted',
        submittedDate: todayStr(),
      };

      const response = await submitBid(bidData);

      if (response.status === 201) {
        setSubmitted(true);
        setSubmittedBidId(response.data?.bid?.bidId || bidData.bidId);
        const warningMsg = response.data?.warning?.message || null;
        setBidWarning(warningMsg);
        addToast('Bid submitted successfully!', 'success');
        if (warningMsg) addToast(warningMsg, 'warning');
      } else {
        addToast(response.data?.message || 'Failed to submit bid', 'error');
      }
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      if (error.response?.status === 403 || error.response?.status === 400) {
        addToast(error.response?.data?.message || 'Failed to submit bid', 'error');
      } else {
        addToast('Failed to submit bid. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!submittedBidId) return;
    setDownloadingReceipt(true);
    try {
      await downloadBidReceipt(submittedBidId);
      addToast('Bid receipt downloaded successfully', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to download receipt', 'error');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const discardDraft = async () => {
    if (!window.confirm('Discard your saved draft and clear all entered prices?')) return;
    try {
      await deleteBidDraft(tender.id);
      dirtyRef.current = new Set();
      setItemEntries({});
      setSavedAt(null);
      setSaveState('idle');
      setPricePage(1);
      setFilterTick((t) => t + 1);
      addToast('Draft discarded', 'success');
    } catch {
      addToast('Failed to discard draft', 'error');
    }
  };

    // Wait for any in-flight save, save pending edits, wait again
  const flushDraft = async () => {
    const waitIdle = async () => {
      for (let i = 0; i < 50 && savingRef.current; i++) await new Promise((r) => setTimeout(r, 100));
    };
    await waitIdle();
    await saveDraft();
    await waitIdle();
  };

  const handleDownloadTemplate = async () => {
    setExcelBusy('download');
    try {
      await flushDraft();
      if (dirtyRef.current.size > 0) {
        addToast('Your latest changes could not be saved yet. Check your connection and try again.', 'error');
        return;
      }
      await downloadBidTemplate(tender.id);
    } catch (err: any) {
      addToast(err.message || 'Failed to download the template', 'error');
    } finally {
      setExcelBusy(null);
    }
  };

  const handleTemplateFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be chosen again
    if (!file) return;

    setExcelBusy('upload');
    setImportReport(null);
    try {
      await flushDraft();
      if (dirtyRef.current.size > 0) {
        addToast('Your latest changes could not be saved yet. Check your connection and try again.', 'error');
        return;
      }

      const res = await importBidDraft(tender.id, file);

      // The server draft is now the source of truth: reload the form from it
      const draftRes = await getBidDraft(tender.id);
      const saved = draftRes.data?.draft;
      const restored: Record<number, ItemEntry> = {};
      if (saved?.entries) {
        tender.items.forEach((ti) => {
          const en = saved.entries[ti.tenderItemId];
          if (en) restored[ti.itemNo] = { ...DEFAULT_ENTRY, ...en };
        });
      }
      dirtyRef.current = new Set();
      setItemEntries(restored);
      setSavedAt(new Date(res.data.updatedAt ?? saved?.updatedAt ?? Date.now()));
      setSaveState('saved');
      setPricePage(1);
      setFilterTick((t) => t + 1);
      setImportReport({
        imported: res.data.imported,
        unchanged: res.data.unchanged,
        problemCount: res.data.problemCount,
        problems: res.data.problems,
      });
      addToast(`Imported ${res.data.imported} item(s) from Excel`, 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to import the Excel file', 'error');
    } finally {
      setExcelBusy(null);
    }
  };

  if (submitted) {
    return (
      <PortalLayout type="supplier" title="Bid Submitted" breadcrumb={['Supplier', 'Tenders', tender.id, 'Bid']}>
        <div className="flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <CheckCircle size={72} className="text-success mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-2">Bid Submitted Successfully!</h1>
            <div className="glass-card p-4 my-6 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bid Reference:</span>
                <span className="font-bold text-primary">{submittedBidId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tender:</span>
                <span>{tender.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grand Total:</span>
                <span className="font-bold">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            {bidWarning && (
              <div className="p-4 mb-6 rounded-lg bg-yellow-100 text-yellow-800 text-sm text-left flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{bidWarning}</span>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDownloadReceipt}
                disabled={downloadingReceipt}
                className="px-4 py-2 bg-muted rounded-lg text-sm flex items-center gap-1 disabled:opacity-70"
              >
                {downloadingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {downloadingReceipt ? 'Downloading...' : 'Bid Receipt'}
              </button>
              {bidWarning && (
                <button
                  onClick={() => navigate('/supplier/documents')}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium"
                >
                  Renew Documents
                </button>
              )}
              <button
                onClick={() => navigate('/supplier/dashboard')}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  const inputBase =
    'px-2 py-1.5 bg-muted/50 border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

  const toolBtn =
    'inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const iconBtn =
    'inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const fieldBase =
    'h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50';

  return (
    <PortalLayout type="supplier" title={`Bid for ${tender.title}`} breadcrumb={['Supplier', 'Tenders', tender.id, 'Bid']}>
      <div className="max-w-6xl mx-auto animate-fade-in">
        {hasExpiredDocuments && (
          <div className="mb-4 p-4 rounded-lg bg-yellow-100 text-yellow-800 text-sm flex gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {expiredDocuments.length === 1
                  ? 'One of your documents has expired'
                  : `${expiredDocuments.length} of your documents have expired`}
              </p>
              <p>
                You can still submit this bid, but please renew{' '}
                {expiredDocuments.length === 1 ? 'it' : 'them'} before the evaluation process starts.
              </p>
              <button
                type="button"
                onClick={() => navigate('/supplier/documents')}
                className="mt-2 underline font-medium"
              >
                Go to Documents
              </button>
            </div>
          </div>
        )}

        {/* Draft Indicator */}
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground mb-2 min-h-[1rem]">
          {saveState === 'saving' && <span>Saving draft...</span>}
          {saveState === 'error' && (
            <span className="text-destructive">Couldn't save your draft. We'll retry on your next change.</span>
          )}
          {(saveState === 'saved' || saveState === 'idle') && savedAt && (
            <span>Draft saved at {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
          {savedAt && (
            <button type="button" onClick={discardDraft} className="underline hover:text-foreground">
              Discard draft
            </button>
          )}
        </div>

        <StepIndicator steps={steps} currentStep={step} />

        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4">
            {errors.join('. ')}
          </div>
        )}

        <div className="glass-card p-6">

          {/* Step 0 - Confirm Eligibility */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Confirm Eligibility</h2>
              {supplier && (
                <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-4 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Company:</span>{' '}
                    <strong>{supplier.companyName}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reg No:</span>{' '}
                    <strong>{supplier.registrationNumber}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact:</span>{' '}
                    <strong>{supplier.contactPerson}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <strong>{supplier.email}</strong>
                  </div>
                </div>
              )}
              <label
                className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
                  !canBid
                    ? 'bg-muted/30 border-muted cursor-not-allowed opacity-60'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={!canBid}
                />
                I confirm my company meets all requirements for this tender
              </label>
              {!canBid && complianceReason && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {complianceReason}
                </p>
              )}
            </div>
          )}

          {/* Step 1 - Price Items */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-1">Price Your Items</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tick the items you want to bid on. Quantity is fixed to the requested quantity. Enter your
                unit price, country of origin, pack size and expiry date for each item.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={excelBusy !== null || !canBid}
                  className={toolBtn}
                >
                  {excelBusy === 'download'
                    ? <Loader2 size={15} className="animate-spin text-primary" />
                    : <FileSpreadsheet size={15} className="text-primary" />}
                  {excelBusy === 'download' ? 'Preparing...' : 'Download Excel template'}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={excelBusy !== null || !canBid}
                  className={toolBtn}
                >
                  {excelBusy === 'upload'
                    ? <Loader2 size={15} className="animate-spin text-primary" />
                    : <Upload size={15} className="text-primary" />}
                  {excelBusy === 'upload' ? 'Importing...' : 'Upload filled template'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleTemplateFile}
                />
                <span className="text-xs text-muted-foreground">
                  Prefer to work offline? Download, fill in, and upload. The upload updates your saved draft.
                </span>
              </div>

              {importReport && (
                <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 text-sm">
                  <div className="flex justify-between items-start gap-3">
                    <p>
                      Imported <strong>{importReport.imported}</strong> item(s)
                      {importReport.unchanged > 0 && `; ${importReport.unchanged} row(s) left unchanged because nothing was entered`}
                      {importReport.problemCount > 0 && (
                        <span className="text-destructive font-medium">
                          {' '}— {importReport.problemCount} problem(s) need attention
                        </span>
                      )}
                    </p>
                    <button type="button" className="underline text-xs shrink-0" onClick={() => setImportReport(null)}>
                      Dismiss
                    </button>
                  </div>
                  {importReport.problems.length > 0 && (
                    <ul className="mt-2 max-h-40 overflow-y-auto text-xs space-y-1">
                      {importReport.problems.map((p, i) => (
                        <li key={i}>
                          Excel row {p.row}{p.itemNo ? ` (item ${p.itemNo})` : ''}: {p.message}
                        </li>
                      ))}
                      {importReport.problemCount > importReport.problems.length && (
                        <li>...and {importReport.problemCount - importReport.problems.length} more.</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border bg-muted/20 p-3 mb-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="search"
                      placeholder="Search item no. or description"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPricePage(1); }}
                      className={`${fieldBase} w-full pl-9`}
                    />
                  </div>

                  <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-border bg-muted/40 p-0.5">
                    {filterTabs.map((t) => {
                      const active = statusFilter === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => { setStatusFilter(t.key); setPricePage(1); }}
                          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {t.label}
                          <span
                            className={`text-xs tabular-nums px-1.5 rounded-full ${
                              active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {t.count.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPricePage(1); }}
                      className={`${fieldBase} appearance-none pr-9 cursor-pointer`}
                      aria-label="Rows per page"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>{n} per page</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Showing {filteredItems.length.toLocaleString()} of {tender.items.length.toLocaleString()} items
                  </span>
                  {statusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={refreshList}
                      title="Rows stay in the list while you edit them. Refresh to remove the ones you have finished."
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <RefreshCw size={12} />
                      Refresh list
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-center p-3">Bid?</th>
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-center p-3">Unit</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-left p-3">Country of Origin</th>
                      <th className="text-left p-3">Pack Size</th>
                      <th className="text-left p-3">Expiry Date</th>
                      <th className="text-right p-3">Unit Price (GHS)</th>
                      <th className="text-right p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>

                    {pagedPriceItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-muted-foreground">
                          No items match the current search or filter.
                        </td>
                      </tr>
                    )}

                    {pagedPriceItems.map((item) => {
                      const entry = getEntry(item.itemNo);
                      const included = entry.included;
                      const rowTotal = item.quantity * entry.unitPrice;
                      const disabled = !canBid || !included;
                      return (
                        <tr
                          key={item.itemNo}
                          className={`border-b border-border/50 ${included ? '' : 'opacity-50 bg-muted/10'}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={included}
                              onChange={() => toggleIncluded(item.itemNo)}
                              disabled={!canBid}
                              className="accent-primary"
                              aria-label={`Bid on item ${item.itemNo}`}
                            />
                          </td>
                          <td className="p-3 text-muted-foreground">{item.itemNo}</td>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-center">{item.unit}</td>
                          <td className="p-3 text-right font-medium">{item.quantity}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="e.g. India"
                              maxLength={100}
                              value={entry.countryOfOrigin}
                              onChange={(e) => updateEntry(item.itemNo, 'countryOfOrigin', e.target.value)}
                              className={`w-32 ${inputBase}`}
                              disabled={disabled}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              placeholder="e.g. 10 x 10 tabs"
                              maxLength={100}
                              value={entry.packSize}
                              onChange={(e) => updateEntry(item.itemNo, 'packSize', e.target.value)}
                              className={`w-32 ${inputBase}`}
                              disabled={disabled}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="date"
                              min={tomorrowStr()}
                              value={entry.expiryDate}
                              onChange={(e) => updateEntry(item.itemNo, 'expiryDate', e.target.value)}
                              className={`w-36 ${inputBase}`}
                              disabled={disabled}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={entry.unitPrice || ''}
                              onChange={(e) =>
                                updateEntry(item.itemNo, 'unitPrice', parseFloat(e.target.value) || 0)
                              }
                              className={`w-28 ml-auto block text-right ${inputBase}`}
                              disabled={disabled}
                            />
                          </td>
                          <td className="p-3 text-right font-medium whitespace-nowrap">
                            {included ? formatCurrency(rowTotal) : <span className="text-muted-foreground">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={9} className="p-3 text-right font-bold">
                        Grand Total ({includedItems.length} of {tender.items.length} items):
                      </td>
                      <td className="p-3 text-right font-bold text-lg whitespace-nowrap">
                        {formatCurrency(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {totalPricePages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <span className="text-sm text-muted-foreground">
                    Showing{' '}
                    <span className="font-medium text-foreground">
                      {rangeFrom.toLocaleString()}–{rangeTo.toLocaleString()}
                    </span>{' '}
                    of {filteredItems.length.toLocaleString()} items
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setPricePage(1)} disabled={safePricePage <= 1}
                      className={iconBtn} aria-label="First page" title="First page">
                      <ChevronsLeft size={16} />
                    </button>
                    <button type="button" onClick={() => setPricePage((p) => Math.max(1, p - 1))} disabled={safePricePage <= 1}
                      className={iconBtn} aria-label="Previous page" title="Previous page">
                      <ChevronLeft size={16} />
                    </button>

                    <span className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                      Page
                      <input
                        key={safePricePage}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        defaultValue={safePricePage}
                        onKeyDown={(e) => { if (e.key === 'Enter') goToPage((e.target as HTMLInputElement).value); }}
                        onBlur={(e) => goToPage(e.target.value)}
                        className={`${fieldBase} w-16 px-1 text-center`}
                        aria-label="Go to page"
                      />
                      of {totalPricePages.toLocaleString()}
                    </span>

                    <button type="button" onClick={() => setPricePage((p) => Math.min(totalPricePages, p + 1))} disabled={safePricePage >= totalPricePages}
                      className={iconBtn} aria-label="Next page" title="Next page">
                      <ChevronRight size={16} />
                    </button>
                    <button type="button" onClick={() => setPricePage(totalPricePages)} disabled={safePricePage >= totalPricePages}
                      className={iconBtn} aria-label="Last page" title="Last page">
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 - Review & Submit */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Review & Submit</h2>
              <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                <h4 className="font-semibold">Company: {supplier?.companyName}</h4>
                <p className="text-muted-foreground">
                  Tender: {tender.title} ({tender.id})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2">Description</th>
                      <th className="text-center p-2">Unit</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-left p-2">Country of Origin</th>
                      <th className="text-left p-2">Pack Size</th>
                      <th className="text-left p-2">Expiry Date</th>
                      <th className="text-right p-2">Unit Price (GHS)</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedReviewItems.map((i) => (
                      <tr key={i.itemNo} className="border-b border-border/50">
                        <td className="p-2">{i.description}</td>
                        <td className="p-2 text-center">{i.unit}</td>
                        <td className="p-2 text-right">{i.supplierQuantity}</td>
                        <td className="p-2">{i.countryOfOrigin}</td>
                        <td className="p-2">{i.packSize}</td>
                        <td className="p-2">{i.expiryDate}</td>
                        <td className="p-2 text-right whitespace-nowrap">{formatCurrency(i.unitPrice)}</td>
                        <td className="p-2 text-right whitespace-nowrap">{formatCurrency(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="p-2 text-right font-bold">
                        Grand Total:
                      </td>
                      <td className="p-2 text-right font-bold whitespace-nowrap">{formatCurrency(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {totalReviewPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Showing {(safeReviewPage - 1) * REVIEW_PER_PAGE + 1}–{Math.min(safeReviewPage * REVIEW_PER_PAGE, items.length)} of {items.length} items. The grand total covers all of them.
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setReviewPage((p) => Math.max(1, p - 1))} disabled={safeReviewPage <= 1} className={toolBtn}>
                      Previous
                    </button>
                    <span className="text-muted-foreground">Page {safeReviewPage} of {totalReviewPages}</span>
                    <button type="button" onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))} disabled={safeReviewPage >= totalReviewPages} className={toolBtn}>
                      Next
                    </button>
                  </div>
                </div>
              )}

              <label
                className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
                  !canBid
                    ? 'bg-muted/30 border-muted cursor-not-allowed opacity-60'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={finalConfirm}
                  onChange={(e) => setFinalConfirm(e.target.checked)}
                  disabled={!canBid}
                />
                I confirm this bid is accurate and I am authorised to submit it
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            {step > 0 ? (
              <button onClick={back} className="px-4 py-2 bg-muted rounded-lg text-sm">
                Back
              </button>
            ) : (
              <div />
            )}
            {step < 2 ? (
              <button
                onClick={next}
                disabled={!canBid && step === 0}
                className={`px-6 py-2 rounded-lg text-sm font-medium ${
                  !canBid && step === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/80'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting || !canBid}
                className="px-8 py-2.5 bg-success text-success-foreground rounded-lg font-bold disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Bid'}
              </button>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
