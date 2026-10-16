import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '@/components/PortalLayout';
import StepIndicator from '@/components/StepIndicator';
import EmptyState from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { getTenderById, getSupplierById, submitBid } from '@/services/api';
import { formatCurrency } from '@/utils/helpers';
import { CheckCircle, Download, Loader2, AlertTriangle } from 'lucide-react';
import ExpiredDocumentsWarning from '@/components/ExpiredDocumentsWarning';
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
  const [submittedBidId, setSubmittedBidId] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [itemEntries, setItemEntries] = useState<Record<number, ItemEntry>>({});
  const [finalConfirm, setFinalConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pagination for the Price Items table
  const PRICE_ITEMS_PER_PAGE = 10;
  const [pricePage, setPricePage] = useState(1);

  const {
    hasExpiredDocuments, expiredDocuments, canParticipate,
    complianceReason, loading: complianceLoading,
  } = useSupplierCompliance(user?.id || '');

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
    if (!canParticipate && !loading && tender?.status === 'Open' && complianceReason) {
      addToast(complianceReason, 'warning');
    }
  }, [canParticipate, loading, tender?.status, complianceReason, addToast]);

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
          {complianceReason && (
            <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
              {complianceReason}
            </div>
          )}
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

  // Items are included by default; suppliers can untick to skip.
  const getEntry = (itemNo: number): ItemEntry => itemEntries[itemNo] || DEFAULT_ENTRY;

  const updateEntry = <K extends keyof ItemEntry>(itemNo: number, field: K, value: ItemEntry[K]) => {
    setItemEntries((prev) => ({
      ...prev,
      [itemNo]: { ...(prev[itemNo] || DEFAULT_ENTRY), [field]: value },
    }));
  };

  const toggleIncluded = (itemNo: number) => {
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
          e.push(`Enter a unit price for item ${badPrice.map((i) => i.itemNo).join(', ')}`);
        if (badDetails.length > 0)
          e.push(`Country of origin, pack size and expiry date are required for item ${badDetails.map((i) => i.itemNo).join(', ')}`);
        if (badExpiry.length > 0)
          e.push(`Expiry date must be in the future for item ${badExpiry.map((i) => i.itemNo).join(', ')}`);

        // Jump to the page holding the first incomplete item so it's visible
        const firstBad = [...badPrice, ...badDetails, ...badExpiry]
          .sort((a, b) => a.itemNo - b.itemNo)[0];
        if (firstBad) {
          const idx = tender.items.findIndex((t) => t.itemNo === firstBad.itemNo);
          if (idx >= 0) setPricePage(Math.floor(idx / PRICE_ITEMS_PER_PAGE) + 1);
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
        addToast('Bid submitted successfully!', 'success');
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

  const inputBase =
    'px-2 py-1.5 bg-muted/50 border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <PortalLayout type="supplier" title={`Bid for ${tender.title}`} breadcrumb={['Supplier', 'Tenders', tender.id, 'Bid']}>
      <div className="max-w-6xl mx-auto animate-fade-in">
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
              {!canParticipate && complianceReason && (
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
                    {pagedPriceItems.map((item) => {
                      const entry = getEntry(item.itemNo);
                      const included = entry.included;
                      const rowTotal = item.quantity * entry.unitPrice;
                      const disabled = !canParticipate || !included;
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
                          <td className="p-3 text-right font-medium">
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
                    {items.map((i) => (
                      <tr key={i.itemNo} className="border-b border-border/50">
                        <td className="p-2">{i.description}</td>
                        <td className="p-2 text-center">{i.unit}</td>
                        <td className="p-2 text-right">{i.supplierQuantity}</td>
                        <td className="p-2">{i.countryOfOrigin}</td>
                        <td className="p-2">{i.packSize}</td>
                        <td className="p-2">{i.expiryDate}</td>
                        <td className="p-2 text-right">{formatCurrency(i.unitPrice)}</td>
                        <td className="p-2 text-right">{formatCurrency(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={7} className="p-2 text-right font-bold">
                        Grand Total:
                      </td>
                      <td className="p-2 text-right font-bold">{formatCurrency(grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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