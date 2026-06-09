import { useState } from 'react';
import { Download, Printer, Loader2, X, CheckCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/utils/helpers';

interface AwardLetterProps {
  tender: {
    id: string;
    title: string;
    description: string;
    reference: string;
    tenderNumber?: string;
  };
  supplier: {
    id: string;
    companyName: string;
    contactPerson: string;
    address: string;
    city: string;
    country: string;
    location?: string;
  };
  bidDetails: {
    amount: number;
    items: Array<{
      id: number;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
  awardDetails: {
    awardDate: string;
    deliveryStart: Date;
    deliveryEnd: Date;
    contractPeriod: number;
    warrantyPeriod: number;
    paymentTerms: string;
  };
  onClose: () => void;
}

export default function AwardLetter({
  tender,
  supplier,
  bidDetails,
  awardDetails,
  onClose,
}: AwardLetterProps) {
  const [loading, setLoading] = useState(false);

  // ── Number-to-words converter ──────────────────────────────────────────────

  const formatWordNumber = (amount: number): string => {
    const numberWords = (num: number): string => {
      const ones  = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const teens = ['Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens  = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

      if (num === 0)      return '';
      if (num < 10)      return ones[num];
      if (num > 10 && num < 20) return teens[num - 11];
      if (num < 100)     return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
      if (num < 1000)    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + numberWords(num % 100) : '');
      if (num < 1000000) return numberWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberWords(num % 1000) : '');
      return 'Number too large';
    };

    const [cedis, pesewas] = amount.toFixed(2).split('.');
    const cedisPart   = numberWords(parseInt(cedis));
    const pesewasPart = parseInt(pesewas);

    if (cedisPart) {
      return `${cedisPart} Ghana Cedis${pesewasPart > 0 ? `, ${numberWords(pesewasPart)} Pesewas` : ''} Only`;
    }
    return `${pesewasPart} Pesewas Only`;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    setLoading(true);
    try {
      handlePrint();
    } finally {
      setLoading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentDate          = formatDate(new Date().toISOString());
  const deliveryStartFormatted = awardDetails.deliveryStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const deliveryEndFormatted   = awardDetails.deliveryEnd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const wordAmount             = formatWordNumber(bidDetails.amount);
  const totalBid               = formatCurrency(bidDetails.amount);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Print-only global styles ── */}
      <style>{`
        @media print {
          body > *:not(#award-letter-root) { display: none !important; }
          #award-letter-root { position: static !important; background: white !important; }
          .no-print { display: none !important; }
          .letter-body { box-shadow: none !important; max-height: none !important; overflow: visible !important; }
        }
      `}</style>

      <div id="award-letter-root" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh]">

          {/* ── Toolbar ── */}
          <div className="no-print flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Award Letter</span>
              <span className="text-xs text-gray-400 font-mono ml-1">#{tender.reference}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <Printer size={13} /> Print
              </button>
              <button
                onClick={onClose}
                className="ml-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Scrollable letter body ── */}
          <div className="letter-body overflow-y-auto flex-1">
            <div
              className="p-12 text-[13.5px] leading-relaxed text-gray-900"
              style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
            >

              {/* ── Letterhead ── */}
              <div className="text-center mb-8">
                {/* Top rule */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-0.5 bg-gray-800" />
                  <div className="w-2 h-2 rounded-full bg-gray-800" />
                  <div className="flex-1 h-0.5 bg-gray-800" />
                </div>

                <h1
                  className="text-2xl font-black tracking-widest uppercase text-gray-900 mb-1"
                  style={{ letterSpacing: '0.18em' }}
                >
                  The Trust Hospital
                </h1>
                <p className="text-xs text-gray-500 tracking-wide">
                  P. O. Box LG 25, Legon, Accra, Ghana
                </p>
                <p className="text-xs text-gray-500 tracking-wide">
                  Tel: +233 (0) 30 123 4567 &nbsp;|&nbsp; procurement@trusthospital.org
                </p>

                {/* Bottom double rule */}
                <div className="mt-4 space-y-0.5">
                  <div className="h-0.5 bg-gray-800 w-full" />
                  <div className="h-[2px] bg-gray-800 w-full" />
                </div>
              </div>

              {/* ── Date ── */}
              <div className="text-right mb-6">
                <p className="text-sm">{currentDate}</p>
              </div>

              {/* ── Reference & Award Label ── */}
              <div className="mb-6 space-y-0.5">
                <p className="font-bold text-sm tracking-wide">OUR REF: {tender.reference}</p>
                <div className="inline-block mt-2 px-4 py-1 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase">
                  Award Notification
                </div>
              </div>

              {/* ── Addressee ── */}
              <div className="mb-6 space-y-0.5">
                <p className="font-bold uppercase text-xs tracking-wider text-gray-500">To:</p>
                <p className="font-bold">The Managing Director</p>
                <p className="font-semibold">{supplier.companyName}</p>
                <p>{supplier.address}</p>
                {supplier.location && <p>{supplier.location}</p>}
                <p>{supplier.city}</p>
                <p>{supplier.country}</p>
              </div>

              {/* ── Consignee ── */}
              <div className="mb-6 pl-4 border-l-2 border-gray-300">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Consignee &amp; Notification
                </p>
                <p className="font-bold">Pharmacy — The Trust Hospital</p>
                <p className="font-bold">P. O. Box LG 25, Legon, Accra, Ghana</p>
              </div>

              {/* ── Subject ── */}
              <div className="mb-6">
                <p>Dear Sir / Madam,</p>
                <p className="mt-3 font-bold text-center uppercase underline tracking-wide">
                  Re: Supply of {tender.title}
                </p>
                <p className="text-center text-xs text-gray-500 mt-0.5">
                  Award Reference: {tender.reference}
                </p>
              </div>

              {/* ── Opening paragraph ── */}
              <div className="mb-6 text-justify space-y-3">
                <p>
                  The Trust Hospital is pleased to inform you that your firm has been awarded a contract for the
                  supply of <span className="font-semibold uppercase">{tender.title}</span> to the Hospital, based on
                  your quotation, including all technical specifications and documentation submitted.
                </p>
                <p>
                  This <span className="font-bold">Agreed Contract, made on {currentDate}</span>, is between{' '}
                  <span className="font-bold">The Trust Hospital</span> (hereinafter called &ldquo;the Purchaser&rdquo;)
                  on the one part, and{' '}
                  <span className="font-bold">
                    {supplier.companyName}, {supplier.city}, {supplier.country}
                  </span>{' '}
                  (hereinafter called &ldquo;the Supplier&rdquo;) on the other part.
                </p>
                <p>
                  The Purchaser invited quotations for the goods listed herein, and the Supplier&apos;s offer has been
                  accepted in the sum of{' '}
                  <span className="font-bold">{totalBid}</span>, to be executed from{' '}
                  <span className="font-bold">{deliveryStartFormatted}</span> to{' '}
                  <span className="font-bold">{deliveryEndFormatted}</span>.
                </p>
              </div>

              {/* ── Items table ── */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className="border border-gray-700 px-3 py-2 text-center font-semibold">No.</th>
                      <th className="border border-gray-700 px-3 py-2 text-left font-semibold">Description</th>
                      <th className="border border-gray-700 px-3 py-2 text-center font-semibold">Unit</th>
                      <th className="border border-gray-700 px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="border border-gray-700 px-3 py-2 text-right font-semibold">Unit Price (GHS)</th>
                      <th className="border border-gray-700 px-3 py-2 text-right font-semibold">Total (GHS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bidDetails.items.map((item, idx) => (
                      <tr key={item.id || `item-${idx}`}>  // ← Use item.id as key
                        <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.description}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{item.unit}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{item.quantity.toLocaleString()}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-mono">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-900 text-white font-bold">
                      <td colSpan={5} className="border border-gray-700 px-3 py-2 text-right tracking-wide">
                        GRAND TOTAL
                      </td>
                      <td className="border border-gray-700 px-3 py-2 text-right font-mono">{totalBid}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── Amount in words ── */}
              <div className="mb-6 p-4 border border-gray-300 bg-gray-50 rounded">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Contract Value (in words)
                </p>
                <p className="font-bold text-sm">{wordAmount}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Delivery DDP: <span className="font-semibold text-gray-700">{totalBid}</span>
                </p>
              </div>

              {/* ── Terms & Conditions ── */}
              <div className="mb-6 space-y-4 text-justify">
                <p className="font-bold uppercase tracking-wider text-xs border-b border-gray-200 pb-1">
                  Terms &amp; Conditions
                </p>

                <p>
                  We request that, within <span className="font-bold">7 days</span> from the date of this letter, you
                  confirm your acceptance in writing, accompanied by a <span className="font-bold">Proforma Invoice</span>{' '}
                  indicating separately: Quantity of Units, Unit Cost, and Total Cost.{' '}
                  <span className="font-bold">
                    Delivery shall be DDP, at The Trust Hospital Medical Stores, Legon, Accra.
                  </span>
                </p>

                <ol className="space-y-3 list-none">
                  {[
                    <>
                      Words and expressions in this agreement shall have the same meaning as assigned in the conditions
                      of contract. All disputes shall be settled in accordance with what is stated in the tender document.
                    </>,
                    <>
                      Should you fail to perform your contractual obligations, the declaration in your{' '}
                      <span className="font-bold">Tender Securing Declaration (TSD)</span> shall apply.
                    </>,
                    <>
                      This <span className="font-bold">framework agreement</span> shall remain in force for{' '}
                      <span className="font-bold">Twelve (12) months</span> and may be extended upon satisfactory
                      performance. In the event of non-satisfactory performance, the agreement may be revoked without
                      reservation at any time before the expiry of the initial term.
                    </>,
                    <>
                      <span className="font-bold">Delivery</span> shall be on a{' '}
                      <span className="font-bold">call-off or as-needed</span> basis, made quarterly or as deemed
                      necessary, but shall <span className="font-bold">NOT</span> exceed{' '}
                      <span className="font-bold">5 working days</span> after receipt of a call-off notice. Failure
                      to deliver within the stated period may result in cancellation and the TSD shall apply.
                    </>,
                    <>
                      In consideration of the payment to be made by the Purchaser, the Supplier covenants to provide
                      the goods and remedy any defects in conformity with the specifications and provisions of the contract.
                    </>,
                    <>
                      The product warranty shall remain valid for{' '}
                      <span className="font-bold">{awardDetails.warrantyPeriod} months</span> for each call-off, from
                      delivery to the destination indicated in the contract and to the satisfaction of the Purchaser.
                    </>,
                    <>
                      This contract is valid for{' '}
                      <span className="font-bold">
                        Three Hundred and Sixty-Five ({awardDetails.contractPeriod}) days
                      </span>
                      ; delivery shall commence immediately a call-off order is placed.
                    </>,
                    <>
                      <span className="font-bold">Payment Terms:</span> {awardDetails.paymentTerms}
                    </>,
                  ].map((clause, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-bold flex-shrink-0 w-5 text-right">{i + 1}.</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ol>

                <p className="text-center font-bold mt-4 py-2 border-t border-b border-gray-300 tracking-wide uppercase text-xs">
                  The Contract Price shall remain fixed over the contract period ({awardDetails.contractPeriod} days).
                </p>

                <p>
                  The total amount includes all local and foreign taxes at the applicable rate at the time of payment,
                  in accordance with the Ghana Revenue Act, Act 592 as amended by Acts 622, 628, 699, 700 &amp; 710.
                  In witness whereof, the parties hereto have caused this agreement to be executed in accordance with
                  the respective laws, on the day and year first above written.
                </p>
              </div>

              {/* ── Signature block ── */}
              <div className="mt-10 space-y-6">
                {/* For the Purchaser */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">For the Purchaser</p>
                  <div className="w-64 border-b border-gray-800 mb-1" />
                  <p className="font-bold text-sm">DR DANIEL ASARE</p>
                  <p className="text-xs text-gray-600">Chief Executive Officer, The Trust Hospital</p>
                </div>

                {/* Copy list */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Copy To:</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-xs text-gray-700">
                    {[
                      'Director of Medical Affairs',
                      'Director of Operations',
                      'Director of Pharmacy',
                      'Director of Nursing',
                      'Director of Finance',
                      'Director of Internal Audit',
                      'Head of Medical Stores',
                    ].map(name => (
                      <p key={name} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                        {name}
                      </p>
                    ))}
                  </div>
                </div>

                {/* For the Supplier */}
                <div className="pt-6 border-t border-gray-300">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">For the Supplier</p>
                  <p className="text-sm">
                    Signed, Sealed and Delivered by{' '}
                    <span className="inline-block w-56 border-b border-gray-800 mx-1 align-bottom" />{' '}
                    on the{' '}
                    <span className="inline-block w-24 border-b border-gray-800 mx-1 align-bottom" />
                  </p>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="mt-10 pt-4 text-center text-[11px] text-gray-400 border-t border-gray-200 space-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <p className="tracking-widest uppercase">The Trust Hospital &mdash; Committed to Quality Healthcare</p>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <p>get real P.O.Box &nbsp;|&nbsp; Tel: real telephone</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}