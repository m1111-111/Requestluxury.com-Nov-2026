'use client';

import { useState, type FormEvent } from 'react';
import { CreditCard } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { FEES } from '@/lib/constants';

/** "Pay £750 deposit" for the custom showroom build: collects the brief, then opens Stripe Checkout. */
export function ShowroomDeposit() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'showroom_deposit', ...data }),
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; message?: string; error?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setNotice({ tone: response.ok ? 'ok' : 'error', text: body.message || body.error || 'Something went wrong. Please try again.' });
    } catch {
      setNotice({ tone: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-gold w-full sm:w-auto">
        <CreditCard aria-hidden="true" className="h-4 w-4" />
        Pay £{FEES.showroomDepositGbp} deposit & start
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Start your showroom build" size="lg">
        {notice?.tone === 'ok' ? (
          <p role="status" className="border border-gold/50 bg-ivory p-5 text-[15px] leading-relaxed text-charcoal">
            {notice.text}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <p className="text-sm leading-relaxed text-stone">
              Tell us about your business, then pay the £{FEES.showroomDepositGbp} deposit by card or bank transfer through Stripe. The balance of £
              {FEES.showroomPriceGbp - FEES.showroomDepositGbp} is due when your showroom is delivered.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="sd-name">
                  Your name
                </label>
                <input id="sd-name" name="name" required minLength={2} maxLength={160} autoComplete="name" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="sd-company">
                  Company
                </label>
                <input id="sd-company" name="company" required minLength={2} maxLength={160} autoComplete="organization" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="sd-email">
                  Work email
                </label>
                <input id="sd-email" name="email" type="email" required maxLength={320} autoComplete="email" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="sd-phone">
                  Phone / WhatsApp
                </label>
                <input id="sd-phone" name="phone" type="tel" maxLength={40} autoComplete="tel" className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sd-site">
                Current website (if any)
              </label>
              <input id="sd-site" name="website_url" maxLength={300} placeholder="https://" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="sd-message">
                What do you sell, and what should the showroom achieve?
              </label>
              <textarea id="sd-message" name="message" maxLength={2000} className="input" />
            </div>
            {notice?.tone === 'error' && (
              <p role="alert" className="text-sm text-red-700">
                {notice.text}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn btn-gold w-full">
              <CreditCard aria-hidden="true" className="h-4 w-4" />
              {busy ? 'Opening secure checkout…' : `Continue to pay £${FEES.showroomDepositGbp}`}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
