import { useEffect, useRef } from 'react';
import { X, ScrollText } from 'lucide-react';

interface TermsOfUseModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: `By accessing or using the Trust Hospital Procurement Portal ("the Platform"), you agree to be bound by these Terms of Use. If you do not agree, please do not use the Platform. These terms apply to all users, including registered suppliers, administrators, and visitors.`,
  },
  {
    title: '2. Who may use this platform',
    body: `The Platform is intended for use by:
• Suppliers who have registered and been approved by Trust Hospital administration.
• Trust Hospital staff with administrator access.

You must provide accurate, current, and complete information during registration. Access is granted at the sole discretion of Trust Hospital and may be revoked at any time.`,
  },
  {
    title: '3. Supplier responsibilities',
    body: `As a registered supplier, you agree to:
• Submit only truthful, accurate bids and documentation.
• Keep your company profile, documents, and contact details up to date.
• Notify Trust Hospital promptly if any submitted information changes materially.
• Not share your account credentials with any third party.
• Comply with all applicable Ghanaian laws and Public Procurement Authority (PPA) regulations.

Submitting false or misleading information may result in immediate disqualification, account suspension, and referral to relevant authorities.`,
  },
  {
    title: '4. Procurement process',
    body: `The Platform facilitates a transparent and competitive procurement process. Trust Hospital reserves the right to:
• Accept or reject any bid at its discretion, with or without providing reasons.
• Cancel or reissue any tender at any time before award.
• Conduct due diligence on any supplier or bid.
• Disqualify bids that do not meet the stated requirements.

Submission of a bid does not guarantee award of a contract. All awards are subject to final approval by authorised Trust Hospital personnel.`,
  },
  {
    title: '5. Confidentiality',
    body: `Information submitted through the Platform — including bid prices, company financials, and supporting documents — is treated as confidential. Trust Hospital will not disclose your information to third parties except as required by law or as necessary to administer the procurement process.

Suppliers must not disclose bid-related communications or award decisions to unauthorised parties.`,
  },
  {
    title: '6. Document verification',
    body: `All uploaded documents are subject to verification by Trust Hospital administrators. Submission of forged, altered, or fraudulent documents is a serious violation and will result in permanent disqualification and may be reported to law enforcement.

Documents with expiry dates (e.g. GRA and SSNIT clearance certificates) must be renewed promptly. It is your responsibility to ensure all required documents remain valid.`,
  },
  {
    title: '7. Intellectual property',
    body: `All content on the Platform — including the design, logos, text, and software — is the property of Trust Hospital or its licensors. You may not copy, reproduce, or redistribute any part of the Platform without prior written consent.`,
  },
  {
    title: '8. Limitation of liability',
    body: `Trust Hospital provides the Platform on an "as is" basis. While we strive for reliability, we do not guarantee uninterrupted or error-free access. To the maximum extent permitted by law, Trust Hospital shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.`,
  },
  {
    title: '9. Account suspension & termination',
    body: `Trust Hospital reserves the right to suspend or terminate any account that:
• Violates these Terms of Use.
• Is found to have submitted fraudulent information.
• Engages in collusive, corrupt, or anti-competitive conduct.
• Has remained inactive for an extended period.

You may request account deactivation by contacting the procurement office directly.`,
  },
  {
    title: '10. Changes to these terms',
    body: `We may update these Terms of Use from time to time. Where changes are material, we will notify registered users via the Platform. Continued use after changes are posted constitutes acceptance of the revised terms.`,
  },
  {
    title: '11. Governing law',
    body: `These Terms of Use are governed by the laws of the Republic of Ghana. Any disputes arising from the use of this Platform shall be subject to the exclusive jurisdiction of the courts of Ghana.`,
  },
  {
    title: '12. Contact',
    body: `For questions about these terms or the procurement process, please contact the Trust Hospital Procurement Office directly through the contact details provided on the main hospital website.`,
  },
];

export default function TermsOfUseModal({ open, onClose }: TermsOfUseModalProps) {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const drawerRef   = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll when open
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
        ref={drawerRef}
        className="relative bg-background w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85dvh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl border border-border animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ScrollText size={16} className="text-primary" />
            </div>
            <div>
              <h2 id="terms-title" className="font-bold text-base">Terms of Use</h2>
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
            These terms govern your use of the Trust Hospital Procurement Portal. We've written them to be clear and straightforward — please read them before using the platform.
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