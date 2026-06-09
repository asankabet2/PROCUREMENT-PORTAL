import { useEffect, useRef } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: '1. Who we are',
    body: `This Privacy Policy applies to the Trust Hospital Procurement Portal ("the Platform"), operated by The Trust Hospital. When we refer to "we", "us", or "our", 
    we mean The Trust Hospital and its authorised staff responsible for managing the Platform.

For questions about how we handle your data, please contact the Trust Hospital Procurement Office through the contact details on the main hospital website.`,
  },
  {
    title: '2. What information we collect',
    body: `We collect the following categories of information when you use the Platform:

Company & registration information
• Company name, registration number, and type
• Tax Identification Number (TIN)
• Date and country of incorporation
• Physical address, region, and city

Contact information
• Contact person name and designation
• Email address and phone number

Documents
• Uploaded certificates, clearance letters, financial statements, and other compliance documents
• Experience proof documents

Account information
• Login email address and encrypted password
• Account creation date and last login timestamp

Activity data
• Tenders you have expressed interest in
• Bids you have submitted, including pricing and item details
• Document upload and verification history
• Notifications sent and read status`,
  },
  {
    title: '3. How we use your information',
    body: `We use the information we collect strictly for the following purposes:

• To process your supplier registration and manage your account.
• To verify your eligibility to participate in procurement activities.
• To evaluate bids and award contracts in a fair and transparent manner.
• To notify you of tender opportunities, bid outcomes, and document status updates.
• To comply with public procurement regulations in Ghana.
• To maintain audit trails for accountability and governance purposes.
• To contact you regarding your account or submitted documents.

We do not use your information for marketing, advertising, or any purpose unrelated to procurement.`,
  },
  {
    title: '4. Legal basis for processing',
    body: `We process your personal data on the following legal grounds:

• Contractual necessity — to manage your supplier registration and participation in procurement processes.
• Legal obligation — to comply with Ghana's Public Procurement Act and related regulations.
• Legitimate interests — to maintain platform security, prevent fraud, and ensure the integrity of the procurement process.`,
  },
  {
    title: '5. How we store your information',
    body: `Your data is stored on secure servers within a managed database environment. We implement appropriate technical and organisational measures to protect your information against unauthorised access, loss, or disclosure, including:

• Encrypted password storage (your password is never stored in plain text).
• Access controls limiting data visibility to authorised administrators only.
• Secure HTTPS connections for all data transmitted between your browser and our servers.

Uploaded documents are stored in a protected file system accessible only to authorised personnel and to you as the account holder.`,
  },
  {
    title: '6. Who we share your information with',
    body: `We do not sell your data. We do not share your personal information with third parties for commercial purposes.

Your information may be shared in the following limited circumstances:

• With Trust Hospital staff — administrators and procurement officers who need access to evaluate bids and verify documents.
• With regulators or law enforcement — if required by law or in response to a valid legal request.
• In an audit or investigation — where disclosure is necessary to protect the integrity of the procurement process.

Bid prices and award decisions may be disclosed as required under Ghana's public procurement transparency obligations.`,
  },
  {
    title: '7. How long we keep your information',
    body: `We retain your data for as long as your supplier account is active and for a period thereafter as required by applicable law and procurement regulations.

Specifically:
• Account and registration data — retained for a minimum of 7 years after last activity, in line with procurement audit requirements.
• Submitted bids and documents — retained for the duration required by the Public Procurement Authority of Ghana.
• Inactive accounts — may be archived or deactivated after an extended period of inactivity.

You may request deletion of your account by contacting the Procurement Office. Note that some records may be retained to meet legal or regulatory obligations even after a deletion request.`,
  },
  {
    title: '8. Your rights',
    body: `You have the following rights regarding your personal data:

• Access — you can view your company profile, submitted documents, and bid history through your supplier dashboard at any time.
• Correction — you can update your contact details and company information through your profile. For document corrections, contact the Procurement Office.
• Deletion — you may request that your account and associated data be deleted, subject to our legal retention obligations.
• Objection — you may object to certain uses of your data by contacting us directly.

To exercise any of these rights, please contact the Trust Hospital Procurement Office.`,
  },
  {
    title: '9. Cookies & tracking',
    body: `The Platform uses only essential session-based mechanisms to keep you logged in while using the Platform. We do not use advertising cookies, third-party trackers, or analytics services that share your data externally.

No cookies are used for marketing or behavioural profiling.`,
  },
  {
    title: '10. Children\'s privacy',
    body: `The Platform is intended for use by registered businesses and their authorised representatives. It is not directed at individuals under the age of 18. We do not knowingly collect personal data from minors.`,
  },
  {
    title: '11. Changes to this policy',
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Where changes are material, we will notify registered users via the Platform. The date at the top of this policy indicates when it was last revised.

Continued use of the Platform after changes are posted constitutes acceptance of the revised policy.`,
  },
  {
    title: '12. Contact us',
    body: `If you have any questions, concerns, or requests regarding this Privacy Policy or how your data is handled, please contact:

Trust Hospital Procurement Office
The Trust Hospital
Please refer to the main Trust Hospital website for current contact details and office hours.`,
  },
];

export default function PrivacyPolicyModal({ open, onClose }: PrivacyPolicyModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative bg-background w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85dvh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl border border-border animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ShieldCheck size={16} className="text-primary" />
            </div>
            <div>
              <h2 id="privacy-title" className="font-bold text-base">Privacy Policy</h2>
              <p className="text-xs text-muted-foreground">Last updated: June 2025</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6 text-sm leading-relaxed">

          {/* Intro */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm text-muted-foreground">
            Your privacy matters to us. This policy explains what information we collect when you use the Trust Hospital Procurement Portal, how we use it, and the rights you have over your data.
          </div>

          {/* Sections */}
          {SECTIONS.map(({ title, body }) => (
            <section key={title}>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground whitespace-pre-line">{body}</p>
            </section>
          ))}

          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} The Trust Hospital. All rights reserved.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}