import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StepIndicator from '@/components/StepIndicator';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getTenderById, getSupplierById, submitBid } from '@/services/api';
import { formatCurrency, generateId } from '@/utils/helpers';
import { CheckCircle, Download, Loader2, AlertTriangle } from 'lucide-react';
import ExpiredDocumentsWarning from '@/components/ExpiredDocumentsWarning';
import { useSupplierCompliance } from '@/hooks/useSupplierCompliance';

const steps = ['Confirm Eligibility', 'Price Items', 'Review & Submit'];

interface TenderItem {
  itemNo: number;
  tenderItemId: string ;
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

// Tracks whether the supplier is bidding on the item, plus quantity and unit price
interface ItemEntry {
  included: boolean;
  quantity: number;
  unitPrice: number;
}

export default function BidSubmission() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useNotification();
  const navigate = useNavigate();

  const [tender, setTender] = useState<Tender | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [bidRef] = useState(generateId('BID-2026'));
  const [confirmed, setConfirmed] = useState(false);
  // Now stores both quantity and unitPrice per itemNo
  const [itemEntries, setItemEntries] = useState<Record<number, ItemEntry>>({});
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pagination for the Price Items table
  const PRICE_ITEMS_PER_PAGE = 10;
  const [pricePage, setPricePage] = useState(1);

  const { hasExpiredDocuments, expiredDocuments, canParticipate, loading: complianceLoading } =
    useSupplierCompliance(user?.id || '');

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
    if (!canParticipate && !loading && tender?.status === 'Open') {
      addToast('You have expired documents. Please renew them before submitting a bid.', 'warning');
    }
  }, [canParticipate, loading, tender?.status, addToast]);

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

  if (!canParticipate && hasExpiredDocuments) {
    return (
      <PortalLayout type="supplier" title="Cannot Submit Bid" breadcrumb={['Supplier', 'Tenders', tender.id, 'Bid']}>
        <div className="max-w-2xl mx-auto">
          <ExpiredDocumentsWarning expiredDocuments={expiredDocuments} type="bid" />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => navigate('/supplier/documents')}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Go to Documents
            </button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Helper to get entry for an item. Items are included by default so the
  // existing "bid on everything" flow is preserved; suppliers can untick to skip.
  const getEntry = (itemNo: number): ItemEntry =>
    itemEntries[itemNo] || { included: true, quantity: 0, unitPrice: 0 };

  const updateEntry = (itemNo: number, field: 'quantity' | 'unitPrice', value: number) => {
    setItemEntries((prev) => ({
      ...prev,
      [itemNo]: { ...getEntry(itemNo), [field]: value },
    }));
  };

  const toggleIncluded = (itemNo: number) => {
    setItemEntries((prev) => {
      const current = prev[itemNo] || { included: true, quantity: 0, unitPrice: 0 };
      return { ...prev, [itemNo]: { ...current, included: !current.included } };
    });
  };

  // Only the items the supplier chose to bid on
  const includedItems = tender.items.filter((i) => getEntry(i.itemNo).included);

  // Build the final items array using supplier's entered quantity & price
  const items = includedItems.map((i) => {
    const entry = getEntry(i.itemNo);
    return {
      ...i,
      supplierQuantity: entry.quantity,
      unitPrice:        entry.unitPrice,
      total:            entry.quantity * entry.unitPrice,
    };
  });

  const grandTotal = items.reduce((a, i) => a + i.total, 0);

  // Pagination derived values for the Price Items table
  const totalPricePages = Math.max(1, Math.ceil(tender.items.length / PRICE_ITEMS_PER_PAGE));
  const safePricePage   = Math.min(pricePage, totalPricePages);
  const pagedPriceItems = tender.items.slice(
    (safePricePage - 1) * PRICE_ITEMS_PER_PAGE,
    safePricePage * PRICE_ITEMS_PER_PAGE
  );

  const validate = () => {
    const e: string[] = [];
    if (step === 0 && !confirmed) e.push('Please confirm eligibility');
    if (step === 1) {
      if (includedItems.length === 0) {
        e.push('Select at least one item to bid on');
      } else {
        const invalid = includedItems.filter((i) => {
          const entry = getEntry(i.itemNo);
          return entry.quantity <= 0 || entry.unitPrice <= 0;
        });
        if (invalid.length > 0) {
          e.push(
            `Enter a quantity and unit price for every selected item (check item ${invalid
              .map((i) => i.itemNo)
              .join(', ')})`
          );
          // Jump to the page holding the first incomplete item so it's visible
          const firstInvalidIndex = tender.items.findIndex((t) => t.itemNo === invalid[0].itemNo);
          if (firstInvalidIndex >= 0) {
            setPricePage(Math.floor(firstInvalidIndex / PRICE_ITEMS_PER_PAGE) + 1);
          }
        }
      }
    }
    if (step === 2 && !finalConfirm) e.push('Please confirm bid accuracy');
    setErrors(e);
    return e.length === 0;
  };

  const next = () => { if (validate()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    if (!validate()) return;

    if (!canParticipate) {
      addToast('Please renew your expired documents before submitting a bid', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const bidData = {
        bidId:         `BID-${Date.now().toString(36).toUpperCase()}`,
        tenderId:      tender.id,
        supplierId:    user?.id,
        items: items.map((item) => ({
          itemNo:       item.itemNo,
          tenderItemId: item.tenderItemId,
          description:  item.description,
          unit:         item.unit,
          quantity:     item.supplierQuantity,   // supplier's qty
          unitPrice:    item.unitPrice,
          total:        item.total,
        })),
        grandTotal,
        status:        'Submitted',
        submittedDate: new Date().toISOString().split('T')[0],
      };

      const response = await submitBid(bidData);

      if (response.status === 201) {
        setSubmitted(true);
        addToast('Bid submitted successfully!', 'success');
      } else {
        addToast(response.data?.message || 'Failed to submit bid', 'error');
      }
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      if (error.response?.status === 403) {
        addToast(error.response?.data?.message || 'Failed to submit bid', 'error');
      } else if (error.response?.status === 400) {
        addToast(error.response?.data?.message || 'You have already submitted a bid for this tender', 'error');
      } else {
        addToast('Failed to submit bid. Please try again.', 'error');
      }
    } finally {
      setSubmitting(false);
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
                <span className="font-bold text-primary">{bidRef}</span>
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
            <div className="flex gap-3 justify-center">
              <button className="px-4 py-2 bg-muted rounded-lg text-sm flex items-center gap-1">
                <Download size={14} /> Bid Receipt
              </button>
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

  return (
    <PortalLayout type="supplier" title={`Bid for ${tender.title}`} breadcrumb={['Supplier', 'Tenders', tender.id, 'Bid']}>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {hasExpiredDocuments && (
          <div className="mb-4">
            <ExpiredDocumentsWarning expiredDocuments={expiredDocuments} type="bid" />
          </div>
        )}

        <StepIndicator steps={steps} currentStep={step} />

        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4">
            {errors.join('. ')}
          </div>
        )}

        <div className="glass-card p-6">

          {/* Step 0 — Confirm Eligibility */}
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
                  !canParticipate
                    ? 'bg-muted/30 border-muted cursor-not-allowed opacity-60'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={!canParticipate}
                />
                I confirm my company meets all requirements for this tender
              </label>
              {!canParticipate && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  You cannot proceed because you have expired documents.
                </p>
              )}
            </div>
          )}

          {/* Step 1 — Price Items */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold mb-1">Price Your Items</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tick the items you want to bid on, then enter the quantity you can supply and your
                unit price. Untick any item you wish to skip.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-center p-3">Bid?</th>
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-center p-3">Unit</th>
                      <th className="text-right p-3">Qty Requested</th>
                      <th className="text-right p-3">Bid Qty</th>
                      <th className="text-right p-3">Bid Unit Price (GHS)</th>
                      <th className="text-right p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPriceItems.map((item) => {
                      const entry = getEntry(item.itemNo);
                      const included = entry.included;
                      const rowTotal = entry.quantity * entry.unitPrice;
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
                              disabled={!canParticipate}
                              className="accent-primary"
                              aria-label={`Bid on item ${item.itemNo}`}
                            />
                          </td>
                          <td className="p-3 text-muted-foreground">{item.itemNo}</td>
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-center">{item.unit}</td>
                          {/* Avg Qty Requested — read-only from tender */}
                          <td className="p-3 text-right text-muted-foreground">{item.quantity}</td>
                          {/* Supplier enters their own qty */}
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={entry.quantity || ''}
                              onChange={(e) =>
                                updateEntry(item.itemNo, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-24 ml-auto block px-2 py-1.5 bg-muted/50 border border-border rounded text-sm text-right outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!canParticipate || !included}
                            />
                          </td>
                          {/* Unit price input */}
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
                              className="w-28 ml-auto block px-2 py-1.5 bg-muted/50 border border-border rounded text-sm text-right outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={!canParticipate || !included}
                            />
                          </td>
                          <td className="p-3 text-right font-medium">
                            {included ? formatCurrency(rowTotal) : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="p-3 text-right font-bold">
                        Grand Total ({includedItems.length} of {tender.items.length} items):
                      </td>
                      <td className="p-3 text-right font-bold text-lg">
                        {formatCurrency(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {totalPricePages > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">
                    Page {safePricePage} of {totalPricePages} · {tender.items.length} items
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPricePage((p) => Math.max(1, p - 1))}
                      disabled={safePricePage <= 1}
                      className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricePage((p) => Math.min(totalPricePages, p + 1))}
                      disabled={safePricePage >= totalPricePages}
                      className="px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Review & Submit */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Review & Submit</h2>
              <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                <h4 className="font-semibold">Company: {supplier?.companyName}</h4>
                <p className="text-muted-foreground">
                  Tender: {tender.title} ({tender.id})
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-2">Description</th>
                    <th className="text-center p-2">Unit</th>
                    <th className="text-right p-2">Bid Qty</th>
                    <th className="text-right p-2">Bid Unit Price (GHS)</th>
                    <th className="text-right p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.itemNo} className="border-b border-border/50">
                      <td className="p-2">{i.description}</td>
                      <td className="p-2 text-center">{i.unit}</td>
                      <td className="p-2 text-right">{i.supplierQuantity}</td>
                      <td className="p-2 text-right">{formatCurrency(i.unitPrice)}</td>
                      <td className="p-2 text-right">{formatCurrency(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30">
                    <td colSpan={4} className="p-2 text-right font-bold">
                      Grand Total:
                    </td>
                    <td className="p-2 text-right font-bold">{formatCurrency(grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
              <label
                className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
                  !canParticipate
                    ? 'bg-muted/30 border-muted cursor-not-allowed opacity-60'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={finalConfirm}
                  onChange={(e) => setFinalConfirm(e.target.checked)}
                  disabled={!canParticipate}
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
                disabled={!canParticipate && step === 0}
                className={`px-6 py-2 rounded-lg text-sm font-medium ${
                  !canParticipate && step === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/80'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting || !canParticipate}
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