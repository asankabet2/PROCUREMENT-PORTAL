import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}

/**
 * Renders its children in a centered overlay attached to document.body via a
 * portal. This is important: several cards in the app use `backdrop-filter`
 * (glass-card), which makes them a containing block for position:fixed
 * descendants — a modal nested inside such a card gets clipped by the card's
 * overflow instead of covering the viewport. Portalling to <body> avoids that.
 *
 * The child should be the modal panel itself (e.g. a `relative ... bg-background`
 * box); this wrapper supplies the backdrop, centering, Esc-to-close and scroll lock.
 */
export default function ModalPortal({ open, onClose, children }: ModalPortalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            {children}
        </div>,
        document.body,
    );
}
