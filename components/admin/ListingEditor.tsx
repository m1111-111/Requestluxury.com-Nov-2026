'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CURRENCIES, SALE_MODES, VERTICALS, getVertical } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { DOC_KINDS, type ListingFormInput } from '@/lib/listing-form';
import type { ManagedListing } from '@/types';
import { ImageManager } from './ImageManager';
import { NoticeBar, useAdminAction } from './useAdminAction';

interface SaveResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export type EditorIntent = 'save' | 'approve' | 'reject' | 'archive';

interface Props {
  listing: ManagedListing | null;
  mode: 'admin' | 'dealer';
  dealers?: Array<{ id: string; company_name: string }>;
  onClose: () => void;
  save: (input: ListingFormInput, intent: EditorIntent) => Promise<SaveResult>;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initial(listing: ManagedListing | null): ListingFormInput {
  return {
    id: listing?.id ?? null,
    dealer_id: listing?.dealer_id ?? '',
    title: listing?.title ?? '',
    vertical: listing?.vertical ?? 'residences',
    description: listing?.description ?? '',
    price_usd: listing ? String(listing.price_usd) : '',
    display_currency: listing?.display_currency ?? 'USD',
    price_on_request: listing?.price_on_request ?? false,
    sale_mode: listing?.sale_mode ?? 'inquire_only',
    deposit_amount_usd: listing?.deposit_amount_usd ? String(listing.deposit_amount_usd) : '',
    country: listing?.country ?? '',
    city: listing?.city ?? '',
    exact_address: listing?.exact_address ?? '',
    property_status: listing?.property_status ?? 'ready_built',
    trakheesi_permit_number: listing?.trakheesi_permit_number ?? '',
    images: listing?.images ?? [],
    video_url: listing?.video_url ?? '',
    specs: JSON.stringify(listing?.specs ?? {}, null, 2),
    deal_room_docs: (listing?.deal_room_docs ?? []).map((doc) => ({ title: doc.title, kind: doc.kind, access: doc.access, url: doc.url ?? '' })),
    auction_end_time: toLocalInput(listing?.auction_end_time ?? null),
    starting_bid_usd: listing?.starting_bid_usd ? String(listing.starting_bid_usd) : '',
    reserve_price_usd: listing?.reserve_price_usd ? String(listing.reserve_price_usd) : '',
    is_featured: listing?.is_featured ?? false,
    is_showcase: listing?.is_showcase ?? false,
    admin_notes: listing?.admin_notes ?? '',
  };
}

/** Full listing editor, used by admins in the moderation queue and by dealers in their portal. */
export function ListingEditor({ listing, mode, dealers = [], onClose, save }: Props) {
  const [form, setForm] = useState<ListingFormInput>(() => initial(listing));
  const { pending, notice, setNotice, run } = useAdminAction();
  const isAdmin = mode === 'admin';

  const set = <K extends keyof ListingFormInput>(key: K, value: ListingFormInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const vertical = getVertical(form.vertical);
  const isResidence = form.vertical === 'residences';
  const needsPermit = isResidence && form.city.trim().toLowerCase() === 'dubai';
  const price = Number(String(form.price_usd).replace(/[,\s]/g, ''));
  const belowFloor = Boolean(vertical && price > 0 && price < vertical.priceFloorUsd);

  // Mirrors the listings_quality_score trigger so editors see the effect of each change.
  const quality = useMemo(() => {
    const parts = [
      { label: '8+ photos', points: 30, met: form.images.length >= 8 },
      { label: '300+ character description', points: 25, met: form.description.trim().length >= 300 },
      { label: 'Public price', points: 20, met: !form.price_on_request && price > 0 },
      { label: 'Video', points: 15, met: form.video_url.trim() !== '' },
      { label: 'Exact address', points: 10, met: form.exact_address.trim() !== '' },
    ];
    return { parts, score: parts.reduce((sum, part) => sum + (part.met ? part.points : 0), 0) };
  }, [form.images.length, form.description, form.price_on_request, form.video_url, form.exact_address, price]);

  const submit = (intent: EditorIntent) => {
    const payload: ListingFormInput = { ...form, auction_end_time: form.auction_end_time ? new Date(form.auction_end_time).toISOString() : '' };
    run(() => save(payload, intent), onClose);
  };

  const setDoc = (index: number, key: 'title' | 'kind' | 'access' | 'url', value: string) =>
    set('deal_room_docs', form.deal_room_docs.map((doc, item) => (item === index ? { ...doc, [key]: value } : doc)));

  return (
    <Modal open onClose={onClose} title={listing ? `Edit: ${listing.title}` : 'New listing'} size="xl">
      <div className="grid gap-6">
        <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label className="label" htmlFor="le-title">
              Title
            </label>
            <input id="le-title" maxLength={200} value={form.title} onChange={(event) => set('title', event.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="le-vertical">
              Category
            </label>
            <select
              id="le-vertical"
              value={form.vertical}
              onChange={(event) => setForm((current) => ({ ...current, vertical: event.target.value, sale_mode: event.target.value === 'residences' ? 'inquire_only' : current.sale_mode }))}
              className="input"
            >
              {VERTICALS.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="le-mode">
              Sale mode
            </label>
            <select id="le-mode" value={form.sale_mode} disabled={isResidence} onChange={(event) => set('sale_mode', event.target.value)} className="input disabled:bg-ivory">
              {SALE_MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {isResidence && <p className="mt-1.5 text-xs text-stone">Residences are always enquiry-led.</p>}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="le-description">
              Description
            </label>
            <span className={`text-xs ${form.description.trim().length >= 300 ? 'text-green-800' : 'text-stone'}`}>{form.description.trim().length} / 300 characters</span>
          </div>
          <textarea id="le-description" rows={7} maxLength={20000} value={form.description} onChange={(event) => set('description', event.target.value)} className="input" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label" htmlFor="le-price">
              Price (USD)
            </label>
            <input id="le-price" inputMode="decimal" value={form.price_usd} onChange={(event) => set('price_usd', event.target.value)} className="input" />
            {vertical && (
              <p className={`mt-1.5 text-xs ${belowFloor ? 'font-semibold text-red-700' : 'text-stone'}`}>
                {vertical.label} minimum ${formatNumber(vertical.priceFloorUsd)}
              </p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="le-currency">
              Display currency
            </label>
            <select id="le-currency" value={form.display_currency} onChange={(event) => set('display_currency', event.target.value)} className="input">
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 self-end pb-3 text-sm">
            <input type="checkbox" checked={form.price_on_request} onChange={(event) => set('price_on_request', event.target.checked)} className="h-4 w-4 accent-[#8a6d2f]" />
            Price on request (keeps the figure private)
          </label>
          {form.sale_mode === 'hold_deposit' && (
            <div>
              <label className="label" htmlFor="le-deposit">
                Hold deposit (USD)
              </label>
              <input id="le-deposit" inputMode="decimal" value={form.deposit_amount_usd} onChange={(event) => set('deposit_amount_usd', event.target.value)} className="input" />
            </div>
          )}
        </div>

        {form.sale_mode === 'timed_auction' && (
          <div className="grid gap-4 border border-gold/40 bg-ivory p-4 md:grid-cols-3">
            <div>
              <label className="label" htmlFor="le-end">
                Auction closes (your local time)
              </label>
              <input id="le-end" type="datetime-local" value={form.auction_end_time} onChange={(event) => set('auction_end_time', event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="le-start">
                Opening bid (USD)
              </label>
              <input id="le-start" inputMode="decimal" value={form.starting_bid_usd} onChange={(event) => set('starting_bid_usd', event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="le-reserve">
                Reserve (USD, private)
              </label>
              <input id="le-reserve" inputMode="decimal" placeholder="0 = no reserve" value={form.reserve_price_usd} onChange={(event) => set('reserve_price_usd', event.target.value)} className="input" />
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label" htmlFor="le-city">
              City
            </label>
            <input id="le-city" maxLength={120} value={form.city} onChange={(event) => set('city', event.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="le-country">
              Country
            </label>
            <input id="le-country" maxLength={120} value={form.country} onChange={(event) => set('country', event.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="le-address">
              Exact address (private)
            </label>
            <input id="le-address" maxLength={300} value={form.exact_address} onChange={(event) => set('exact_address', event.target.value)} className="input" />
          </div>
        </div>

        {isResidence && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="le-status">
                Property status
              </label>
              <select id="le-status" value={form.property_status} onChange={(event) => set('property_status', event.target.value)} className="input">
                <option value="ready_built">Ready built</option>
                <option value="off_plan">Off-plan</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="le-permit">
                Trakheesi permit number {needsPermit ? '(required for Dubai)' : '(Dubai only)'}
              </label>
              <input
                id="le-permit"
                maxLength={60}
                value={form.trakheesi_permit_number}
                onChange={(event) => set('trakheesi_permit_number', event.target.value)}
                className={`input ${needsPermit && !form.trakheesi_permit_number.trim() ? '!border-red-400' : ''}`}
              />
              {needsPermit && (
                <p className="mt-1.5 text-xs text-stone">
                  {isAdmin ? 'Verify this number with the Dubai Land Department before approving.' : 'Dubai residences cannot be listed without a valid permit.'}
                </p>
              )}
            </div>
          </div>
        )}

        <ImageManager images={form.images} onChange={(images) => set('images', images)} />

        <div>
          <label className="label" htmlFor="le-video">
            Video link (mp4, YouTube or Vimeo)
          </label>
          <input id="le-video" type="url" maxLength={500} placeholder="https://" value={form.video_url} onChange={(event) => set('video_url', event.target.value)} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="le-specs">
            Specifications (JSON)
          </label>
          <textarea id="le-specs" rows={7} spellCheck={false} value={form.specs} onChange={(event) => set('specs', event.target.value)} className="input font-mono !text-[13px]" />
          <p className="mt-1.5 text-xs text-stone">Name and value pairs shown in the specification grid, for example {'{"year": 2023, "mileage_km": 4200}'}.</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="label">Deal room documents</span>
            <button
              type="button"
              onClick={() => set('deal_room_docs', [...form.deal_room_docs, { title: '', kind: 'document', access: 'registered', url: '' }])}
              className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-deep"
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" /> Add document
            </button>
          </div>
          {form.deal_room_docs.length === 0 && <p className="text-xs text-stone">No gated documents. Add floor plans, provenance or reports to capture qualified enquiries.</p>}
          <div className="grid gap-2">
            {form.deal_room_docs.map((doc, index) => (
              <div key={index} className="grid gap-2 border border-sand bg-white p-2 md:grid-cols-[1.4fr_0.9fr_1fr_1.6fr_auto]">
                <input aria-label="Document title" placeholder="Title" maxLength={120} value={doc.title} onChange={(event) => setDoc(index, 'title', event.target.value)} className="input" />
                <select aria-label="Document type" value={doc.kind} onChange={(event) => setDoc(index, 'kind', event.target.value)} className="input capitalize">
                  {DOC_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                <select aria-label="Who can open it" value={doc.access} onChange={(event) => setDoc(index, 'access', event.target.value)} className="input">
                  <option value="registered">Anyone who registers</option>
                  <option value="verified">Verified buyers only</option>
                </select>
                <input aria-label="Document link" type="url" placeholder="https://… link to the PDF" value={doc.url} onChange={(event) => setDoc(index, 'url', event.target.value)} className="input" />
                <button type="button" aria-label="Remove document" onClick={() => set('deal_room_docs', form.deal_room_docs.filter((_, item) => item !== index))} className="flex h-12 w-10 items-center justify-center text-stone hover:text-red-700">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-sand bg-ivory p-4">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Quality score preview</span>
            <span className="font-serif text-2xl text-obsidian">{quality.score}/100</span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {quality.parts.map((part) => (
              <li key={part.label} className={`chip ${part.met ? 'chip-green' : ''}`}>
                {part.met ? '✓' : '+'} {part.points} {part.label}
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && (
          <div className="grid gap-4 border-t border-sand pt-6 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="le-dealer">
                Dealer
              </label>
              <select id="le-dealer" value={form.dealer_id ?? ''} onChange={(event) => set('dealer_id', event.target.value)} className="input">
                <option value="">House listing (no dealer)</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.company_name}
                  </option>
                ))}
              </select>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(form.is_featured)} onChange={(event) => set('is_featured', event.target.checked)} className="h-4 w-4 accent-[#8a6d2f]" />
                  Featured on the home page
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(form.is_showcase)} onChange={(event) => set('is_showcase', event.target.checked)} className="h-4 w-4 accent-[#8a6d2f]" />
                  Showcase (illustrative, not for sale)
                </label>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="le-notes">
                Admin note (required to reject; shown to the dealer)
              </label>
              <textarea id="le-notes" rows={3} maxLength={2000} value={form.admin_notes ?? ''} onChange={(event) => set('admin_notes', event.target.value)} className="input !min-h-[5.5rem]" />
            </div>
          </div>
        )}

        {!isAdmin && listing?.admin_notes && (
          <p className="border-s-2 border-gold bg-ivory px-4 py-3 text-sm leading-relaxed text-charcoal">
            <strong className="font-semibold">Note from our moderators:</strong> {listing.admin_notes}
          </p>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center gap-3 border-t border-sand bg-alabaster px-6 py-4">
          {isAdmin ? (
            <>
              <button type="button" disabled={pending} onClick={() => submit('approve')} className="btn btn-gold">
                Approve & Publish
              </button>
              <button type="button" disabled={pending} onClick={() => submit('save')} className="btn btn-dark">
                Save Edits
              </button>
              <button type="button" disabled={pending} onClick={() => submit('reject')} className="btn btn-outline !border-red-300 !text-red-800">
                Reject with Note
              </button>
              {listing && listing.moderation_status !== 'archived' && (
                <button type="button" disabled={pending} onClick={() => submit('archive')} className="btn btn-outline">
                  Archive
                </button>
              )}
            </>
          ) : (
            <button type="button" disabled={pending} onClick={() => submit('save')} className="btn btn-dark">
              {listing ? 'Save & resubmit for review' : 'Submit for review'}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-outline ms-auto">
            Cancel
          </button>
          {pending && <span className="text-sm text-stone">Saving…</span>}
        </div>
      </div>
    </Modal>
  );
}
