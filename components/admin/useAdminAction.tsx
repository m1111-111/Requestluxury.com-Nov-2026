'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

export interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

interface Result {
  ok: boolean;
  error?: string;
  message?: string;
}

/** Runs a server action, shows its outcome, and refreshes the page data on success. */
export function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice | null>(null);

  const run = useCallback(
    <T extends Result>(action: () => Promise<T>, onSuccess?: (result: T) => void) => {
      setNotice(null);
      startTransition(async () => {
        try {
          const result = await action();
          if (!result.ok) {
            setNotice({ tone: 'error', text: result.error ?? 'The change could not be saved.' });
            return;
          }
          if (result.message) setNotice({ tone: 'ok', text: result.message });
          onSuccess?.(result);
          router.refresh();
        } catch {
          setNotice({ tone: 'error', text: 'Your session has expired or you are not authorised. Please sign in again.' });
        }
      });
    },
    [router],
  );

  return { pending, notice, setNotice, run };
}

export function NoticeBar({ notice, onDismiss }: { notice: Notice | null; onDismiss?: () => void }) {
  if (!notice) return null;
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-4 border px-4 py-3 text-sm leading-relaxed ${
        notice.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-900'
      }`}
    >
      <span>{notice.text}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100">
          Dismiss
        </button>
      )}
    </div>
  );
}
