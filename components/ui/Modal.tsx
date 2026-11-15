'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  tone = 'light',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  tone?: 'light' | 'dark';
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const width = size === 'xl' ? 'max-w-6xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';
  const surface = tone === 'dark' ? 'bg-obsidian text-white border-white/15' : 'bg-alabaster text-charcoal border-sand';

  // Rendered at the end of <body>: a modal opened from inside an animated or transformed
  // section would otherwise be positioned against that section instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-obsidian/75 backdrop-blur-sm" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative max-h-[92vh] w-full ${width} animate-fade-up overflow-y-auto border shadow-float outline-none ${surface}`}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-6 py-4 ${tone === 'dark' ? 'border-white/10 bg-obsidian' : 'border-sand bg-alabaster'}`}>
          <h2 className="font-serif text-2xl leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center hover:text-gold">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
