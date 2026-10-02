import { HTMLAttributes, ReactNode, useEffect, useRef } from 'react';

const layers: HTMLElement[] = [];
let originalOverflow = '';
export function ModalLayer({ children, onClose, label, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; onClose: () => void; label: string }) {
  const element = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const root = element.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!layers.length) { originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    layers.push(root);
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length && !el.closest('[hidden], [aria-hidden="true"]'));
    const focusTimer = setTimeout(() => { if (!root.contains(document.activeElement)) (focusable()[0] || root).focus(); }, 0);
    const handleKey = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== root) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); root.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey, true);
      const index = layers.indexOf(root);
      if (index >= 0) layers.splice(index, 1);
      if (!layers.length) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <div {...props} ref={element} className={`modal-layer ${className}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={event => { if (event.target === event.currentTarget) close.current(); }}>{children}</div>;
}
