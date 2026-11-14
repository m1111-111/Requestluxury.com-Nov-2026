'use client';

import { useState, type FormEvent } from 'react';
import { BadgeCheck, CreditCard, FileSpreadsheet, Plus } from 'lucide-react';
import { importDealerListings, saveDealerListing, updateDealerProfile, withdrawDealerListing, type DealerImportResult } from '@/app/(site)/dealer/actions';
import { ListingEditor } from '@/components/admin/ListingEditor';
import { NoticeBar, useAdminAction } from '@/components/admin/useAdminAction';
import { FEES, LEAD_TYPE_LABELS, getVertical } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import type { Lead, ManagedDealer, ManagedListing, ModerationStatus } from '@/types';

type Tab = 'listings' | 'leads' | 'profile';

const STATUS_CHIP: Record<ModerationStatus, string> = { pending_review: 'chip-gold', approved: 'chip-green', rejected: 'chip-red', archived: '' };
const STATUS_LABEL: Record<ModerationStatus, string> = { pending_review: 'In review', approved: 'Live', rejected: 'Changes needed', archived: 'Withdrawn' };

export function DealerPortal({ dealer, listings, leads, payoutsNotice }: { dealer: ManagedDealer; listings: ManagedListing[]; leads: Lead[]; payoutsNotice: string | null }) {
  const [tab, setTab] = useState<Tab>('listings');
  const [editing, setEditing] = useState<ManagedListing | 'new' | null>(null);
  const [importResult, setImportResult] = useState<DealerImportResult | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const { pending, notice, setNotice, run } = useAdminAction();

  const startStripe = async (path: string, body: Record<string, unknown>) => {
    setRedirecting(true);
    setNotice(null);
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (response.ok && result.url) {
        window.location.assign(result.url);
        return;
      }
      setNotice({ tone: 'error', text: result.error || 'Stripe could not be opened. Please try again.' });
    } catch {
      setNotice({ tone: 'error', text: 'Stripe could not be opened. Please try again.' });
    }
    setRedirecting(false);
  };

  const onImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setImportResult(null);
    run(
      () => importDealerListings(data),
      (result) => {
        setImportResult(result);
        form.reset();
      },
    );
  };

  const onProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() => updateDealerProfile(data));
  };

  const tabs: Array<[Tab, string]> = [
    ['listings', `Listings (${listings.length})`],
    ['leads', `Introductions (${leads.length})`],
    ['profile', 'Profile, plan & payouts'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dealer portal</p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 font-serif text-4xl text-obsidian md:text-5xl">
            {dealer.company_name}
            {dealer.is_verified && <BadgeCheck aria-label="Verified partner" className="h-7 w-7 text-gold-deep" />}
          </h1>
          <p className="mt-2 text-sm text-stone">
            {getVertical(dealer.vertical_focus)?.label ?? 'Partner'} · {dealer.city}, {dealer.country} ·{' '}
            {dealer.subscription_tier === 'founding_free' ? 'Founding Partner' : `${dealer.subscription_tier === 'pro' ? 'Pro' : 'Elite'} Partner`}
          </p>
        </div>
        {tab === 'listings' && (
          <button type="button" onClick={() => setEditing('new')} className="btn btn-dark">
            <Plus aria-hidden="true" className="h-4 w-4" /> Add listing
          </button>
        )}
      </div>

      {dealer.status === 'pending_review' && (
        <p className="border-s-2 border-gold bg-white px-5 py-4 text-sm leading-relaxed text-charcoal">
          <strong className="font-semibold">Your application is being reviewed.</strong> You can add listings now; they will be published once your profile and each
          listing have been approved.
        </p>
      )}
      {payoutsNotice && <p className="border-s-2 border-gold bg-white px-5 py-4 text-sm leading-relaxed text-charcoal">{payoutsNotice}</p>}
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div role="tablist" aria-label="Dealer portal" className="flex overflow-x-auto border-b border-sand scrollbar-none">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${tab === id ? 'border-gold text-obsidian' : 'border-transparent text-stone hover:text-obsidian'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <>
          {listings.length === 0 ? (
            <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">No listings yet. Add your first, or import a file below.</p>
          ) : (
            <div className="overflow-x-auto border border-sand bg-white">
              <table className="table-rl">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Price (USD)</th>
                    <th>Quality</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="min-w-[18rem]">
                        <div className="flex gap-3">
                          <div className="h-14 w-20 shrink-0 overflow-hidden bg-ivory">
                            {listing.images[0] && <img src={imageUrl(listing.images[0], 160, 60)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-obsidian">{listing.title}</p>
                            <p className="mt-0.5 text-xs text-stone">
                              {getVertical(listing.vertical)?.label} · {listing.city}, {listing.country} · {listing.images.length} photos
                            </p>
                            {listing.moderation_status === 'rejected' && listing.admin_notes && <p className="mt-1 text-xs text-red-800">Moderator note: {listing.admin_notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap font-semibold">${formatNumber(Number(listing.price_usd))}</td>
                      <td>{listing.quality_score}/100</td>
                      <td>
                        <span className={`chip ${STATUS_CHIP[listing.moderation_status]}`}>{STATUS_LABEL[listing.moderation_status]}</span>
                      </td>
                      <td className="whitespace-nowrap text-stone">{formatDate(listing.updated_at)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {listing.moderation_status === 'approved' && (
                            <a href={`/listing/${listing.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                              View
                            </a>
                          )}
                          <button type="button" onClick={() => setEditing(listing)} className="btn btn-outline btn-sm">
                            Edit
                          </button>
                          {listing.moderation_status !== 'archived' && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                if (window.confirm(`Withdraw "${listing.title}" from the marketplace?`)) run(() => withdrawDealerListing(listing.id));
                              }}
                              className="btn btn-outline btn-sm"
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <section className="border border-sand bg-white p-6">
            <h2 className="flex items-center gap-2 font-serif text-2xl text-obsidian">
              <FileSpreadsheet aria-hidden="true" className="h-5 w-5 text-gold-deep" /> Bulk upload
            </h2>
            <p className="mt-1 text-sm text-stone">
              Upload up to 200 listings as CSV or XML. Start from the{' '}
              <a href="/samples/listings-template.csv" download className="text-gold-deep underline underline-offset-2">
                CSV template
              </a>{' '}
              or the{' '}
              <a href="/samples/dealer-feed-example.xml" download className="text-gold-deep underline underline-offset-2">
                XML example
              </a>
              .
            </p>
            <form onSubmit={onImport} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="dp-file">
                Inventory file
              </label>
              <input id="dp-file" name="file" type="file" required accept=".csv,.xml,text/csv,application/xml,text/xml" className="input !py-2.5" />
              <button type="submit" disabled={pending} className="btn btn-dark shrink-0">
                {pending ? 'Uploading…' : 'Upload for review'}
              </button>
            </form>
            {importResult && importResult.rejected.length > 0 && (
              <div className="mt-4 max-h-56 overflow-auto border border-sand">
                <table className="table-rl">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Title</th>
                      <th>Why it was not imported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.rejected.map((row, index) => (
                      <tr key={`${row.row}-${index}`}>
                        <td>{row.row}</td>
                        <td>{row.title}</td>
                        <td>{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'leads' &&
        (leads.length === 0 ? (
          <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">
            Buyer introductions appear here once our concierge has forwarded them to you, each with its 12-month registration certificate.
          </p>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <article key={lead.id} className="border border-sand bg-white p-5">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-obsidian">{lead.lead_reference_code}</span>
                  <span className="chip">{LEAD_TYPE_LABELS[lead.lead_type]}</span>
                  <span className="text-xs text-stone">Registered until {formatDate(lead.protection_expires_at)}</span>
                </p>
                <p className="mt-3 font-serif text-2xl text-obsidian">{lead.buyer_name}</p>
                <p className="mt-1 text-sm">
                  <a href={`mailto:${lead.buyer_email}`} className="text-gold-deep underline underline-offset-2">
                    {lead.buyer_email}
                  </a>
                  {lead.buyer_phone ? ` · ${lead.buyer_phone}` : ''}
                </p>
                {lead.listing && <p className="mt-2 text-sm text-charcoal">Asset: {lead.listing.title}</p>}
                {lead.message && <p className="mt-3 whitespace-pre-line break-words border-s-2 border-sand ps-4 text-sm leading-relaxed text-charcoal">{lead.message}</p>}
              </article>
            ))}
          </div>
        ))}

      {tab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={onProfile} className="grid gap-4 border border-sand bg-white p-6">
            <h2 className="font-serif text-2xl text-obsidian">Contact details</h2>
            <div>
              <label className="label" htmlFor="dp-contact">
                Contact name
              </label>
              <input id="dp-contact" name="contact_name" maxLength={160} defaultValue={dealer.contact_name ?? ''} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dp-email">
                Email for buyer introductions
              </label>
              <input id="dp-email" name="contact_email" type="email" required maxLength={320} defaultValue={dealer.contact_email} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dp-whatsapp">
                WhatsApp number (with country code)
              </label>
              <input id="dp-whatsapp" name="whatsapp_number" type="tel" maxLength={40} defaultValue={dealer.whatsapp_number ?? ''} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dp-website">
                Website
              </label>
              <input id="dp-website" name="website_url" type="url" maxLength={300} placeholder="https://" defaultValue={dealer.website_url ?? ''} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dp-feed">
                XML feed URL
              </label>
              <input id="dp-feed" name="feed_url" type="url" maxLength={500} placeholder="https://" defaultValue={dealer.feed_url ?? ''} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dp-orn">
                RERA ORN (Dubai brokerages)
              </label>
              <input id="dp-orn" name="rera_orn_number" maxLength={60} defaultValue={dealer.rera_orn_number ?? ''} className="input" />
            </div>
            <button type="submit" disabled={pending} className="btn btn-dark justify-self-start">
              {pending ? 'Saving…' : 'Save details'}
            </button>
          </form>

          <div className="space-y-6">
            <section className="border border-sand bg-white p-6">
              <h2 className="font-serif text-2xl text-obsidian">Payouts</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone">
                Connect a Stripe account to receive the proceeds of “Buy via Stripe” sales directly. Buyers pay the {(FEES.buyerServiceFeeRate * 100).toFixed(1)}%
                service fee on top of your price.
              </p>
              <button type="button" disabled={redirecting || dealer.status !== 'approved'} onClick={() => void startStripe('/api/stripe/connect', {})} className="btn btn-dark mt-4">
                <CreditCard aria-hidden="true" className="h-4 w-4" />
                {dealer.stripe_account_id ? 'Manage Stripe payouts' : 'Connect Stripe payouts'}
              </button>
              {dealer.status !== 'approved' && <p className="mt-2 text-xs text-stone">Available once your profile is approved.</p>}
            </section>

            <section className="border border-sand bg-white p-6">
              <h2 className="font-serif text-2xl text-obsidian">Partner plan</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone">
                You are on the <strong className="font-semibold text-charcoal">{dealer.subscription_tier === 'founding_free' ? 'Founding Partner (free)' : dealer.subscription_tier}</strong> plan.
                Paid plans add priority placement and are billed monthly through Stripe; cancel at any time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(['pro', 'elite'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    disabled={redirecting || dealer.subscription_tier === tier}
                    onClick={() => void startStripe('/api/stripe/checkout', { kind: 'dealer_subscription', tier, name: dealer.contact_name || dealer.company_name, email: dealer.contact_email })}
                    className="btn btn-outline"
                  >
                    {dealer.subscription_tier === tier ? `Current: ${tier}` : `${tier === 'pro' ? 'Pro' : 'Elite'} · £${FEES.dealerPlansGbp[tier]}/month`}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {editing && (
        <ListingEditor
          key={editing === 'new' ? 'new' : editing.id}
          listing={editing === 'new' ? null : editing}
          mode="dealer"
          onClose={() => setEditing(null)}
          onSaved={(message) => setNotice({ tone: 'ok', text: message })}
          save={(input) => saveDealerListing(input)}
        />
      )}
    </div>
  );
}
