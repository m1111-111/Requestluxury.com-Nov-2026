'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CircleCheck, ShieldCheck } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import type { ConciergeField } from '@/lib/concierge';
import { recallContact, rememberContact } from '@/lib/contact-memory';
import { formatDate } from '@/lib/format';
import type { LeadReceipt, LeadType } from '@/types';

export interface LeadFormProps {
  leadType: LeadType;
  listingId?: string | null;
  /** Extra questions; answers are stored in the lead's metadata. */
  fields?: ConciergeField[];
  /** Fixed metadata sent with the lead (source page, service, and so on). */
  metadata?: Record<string, string | number | boolean>;
  messageLabel?: string;
  messagePlaceholder?: string;
  messageRequired?: boolean;
  submitLabel?: string;
  tone?: 'light' | 'dark';
  /** Shown under the confirmation, for example an onward partner link. */
  afterSuccess?: ReactNode;
  onSuccess?: (receipt: LeadReceipt) => void;
}

export function LeadForm({
  leadType,
  listingId = null,
  fields = [],
  metadata = {},
  messageLabel,
  messagePlaceholder,
  messageRequired = false,
  submitLabel,
  tone = 'light',
  afterSuccess,
  onSuccess,
}: LeadFormProps) {
  const { t } = usePreferences();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<LeadReceipt | null>(null);

  useEffect(() => {
    const remembered = recallContact();
    if (remembered) {
      setName(remembered.name);
      setEmail(remembered.email);
      setPhone(remembered.phone);
    }
  }, []);

  const dark = tone === 'dark';
  const inputClass = dark ? 'input input-dark' : 'input';
  const labelClass = dark ? 'label !text-white/60' : 'label';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    const answers: Record<string, string | number | boolean> = { ...metadata };
    for (const field of fields) {
      const value = (extra[field.name] ?? '').trim();
      if (value) answers[field.name] = field.type === 'number' && /^\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    }
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_type: leadType, listing_id: listingId, name, email, phone, message, metadata: answers, website }),
      });
      const body = (await response.json().catch(() => ({}))) as { receipt?: LeadReceipt; error?: string };
      if (!response.ok || !body.receipt) {
        setStatus('error');
        setError(body.error || t('form.error'));
        return;
      }
      rememberContact({ name, email, phone });
      setReceipt(body.receipt);
      setStatus('idle');
      onSuccess?.(body.receipt);
    } catch {
      setStatus('error');
      setError(t('form.error'));
    }
  };

  if (receipt) {
    return (
      <div role="status" className={`border p-6 ${dark ? 'border-gold/40 bg-white/5 text-white' : 'border-gold/50 bg-ivory text-charcoal'}`}>
        <CircleCheck aria-hidden="true" className="h-7 w-7 text-gold" />
        <p className="mt-3 font-serif text-2xl">{t('form.thanks')}</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className={dark ? 'text-white/60' : 'text-stone'}>{t('form.reference')}</dt>
          <dd className="font-semibold tracking-wide">{receipt.reference}</dd>
          <dt className={dark ? 'text-white/60' : 'text-stone'}>Protected until</dt>
          <dd>{formatDate(receipt.protection_expires_at)}</dd>
        </dl>
        {afterSuccess && <div className="mt-5">{afterSuccess}</div>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate={false}>
      {fields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name}>
              <label className={labelClass} htmlFor={`lead-${leadType}-${field.name}`}>
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  id={`lead-${leadType}-${field.name}`}
                  required={field.required}
                  value={extra[field.name] ?? ''}
                  onChange={(event) => setExtra((current) => ({ ...current, [field.name]: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`lead-${leadType}-${field.name}`}
                  type={field.type === 'number' ? 'text' : field.type}
                  inputMode={field.type === 'number' ? 'decimal' : undefined}
                  required={field.required}
                  placeholder={field.placeholder}
                  maxLength={200}
                  value={extra[field.name] ?? ''}
                  onChange={(event) => setExtra((current) => ({ ...current, [field.name]: event.target.value }))}
                  className={inputClass}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor={`lead-${leadType}-message`}>
          {messageLabel ?? t('form.message')}
        </label>
        <textarea
          id={`lead-${leadType}-message`}
          required={messageRequired}
          maxLength={5000}
          placeholder={messagePlaceholder}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`lead-${leadType}-name`}>
            {t('form.name')}
          </label>
          <input id={`lead-${leadType}-name`} required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`lead-${leadType}-email`}>
            {t('form.email')}
          </label>
          <input id={`lead-${leadType}-email`} type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`lead-${leadType}-phone`}>
          {t('form.phone')}
        </label>
        <input id={`lead-${leadType}-phone`} type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} />
      </div>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
      </div>

      {status === 'error' && (
        <p role="alert" className={`text-sm ${dark ? 'text-red-300' : 'text-red-700'}`}>
          {error}
        </p>
      )}

      <button type="submit" disabled={status === 'sending'} className={`btn ${dark ? 'btn-gold' : 'btn-dark'} w-full`}>
        {status === 'sending' ? t('form.sending') : (submitLabel ?? t('form.send'))}
      </button>
      <p className={`flex items-start gap-2 text-xs leading-relaxed ${dark ? 'text-white/55' : 'text-stone'}`}>
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
        {t('form.privacy')}
      </p>
    </form>
  );
}
