'use client';

import { useState } from 'react';
import { BadgeCheck, Copy, RefreshCw } from 'lucide-react';
import { syncDealerFeed, updateDealer } from '@/app/admin/actions';
import { getVertical } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { ManagedDealer } from '@/types';
import { NoticeBar, useAdminAction } from './useAdminAction';

const STATUS_CHIP: Record<ManagedDealer['status'], string> = { pending_review: 'chip-gold', approved: 'chip-green', suspended: 'chip-red' };

export function DealersManager({ dealers, listingCounts }: { dealers: ManagedDealer[]; listingCounts: Record<string, number> }) {
  const { pending, notice, setNotice, run } = useAdminAction();
  const [feedDrafts, setFeedDrafts] = useState<Record<string, string>>({});
  const pendingCount = dealers.filter((dealer) => dealer.status === 'pending_review').length;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: 'ok', text: 'Copied to the clipboard.' });
    } catch {
      setNotice({ tone: 'error', text: 'Copy failed. Select the text and copy it manually.' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Dealer approvals</p>
        <h1 className="mt-2 font-serif text-4xl text-obsidian md:text-5xl">Dealers</h1>
        <p className="mt-2 text-sm text-stone">
          {dealers.length} partners · {pendingCount} awaiting approval
        </p>
      </div>
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      {dealers.length === 0 ? (
        <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">No dealer applications yet.</p>
      ) : (
        <div className="grid gap-4">
          {dealers.map((dealer) => {
            const feed = feedDrafts[dealer.id] ?? dealer.feed_url ?? '';
            return (
              <article key={dealer.id} className="border border-sand bg-white">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand p-5">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 font-serif text-2xl text-obsidian">
                      {dealer.company_name}
                      {dealer.is_verified && <BadgeCheck aria-label="Verified" className="h-5 w-5 text-gold-deep" />}
                      <span className={`chip ${STATUS_CHIP[dealer.status]}`}>{dealer.status.replace(/_/g, ' ')}</span>
                      {dealer.is_showcase && <span className="chip">Showcase</span>}
                    </h2>
                    <p className="mt-1 text-sm text-stone">
                      {getVertical(dealer.vertical_focus)?.label ?? 'No category'} · {dealer.city}, {dealer.country} · {listingCounts[dealer.id] ?? 0} listings · applied{' '}
                      {formatDate(dealer.created_at)}
                    </p>
                    <p className="mt-2 text-sm text-charcoal">
                      {dealer.contact_name ? `${dealer.contact_name} · ` : ''}
                      <a href={`mailto:${dealer.contact_email}`} className="text-gold-deep underline underline-offset-2">
                        {dealer.contact_email}
                      </a>
                      {dealer.whatsapp_number ? ` · WhatsApp ${dealer.whatsapp_number}` : ''}
                      {dealer.rera_orn_number ? ` · RERA ORN ${dealer.rera_orn_number}` : ''}
                      {dealer.website_url ? (
                        <>
                          {' · '}
                          <a href={dealer.website_url} target="_blank" rel="noopener noreferrer nofollow" className="text-gold-deep underline underline-offset-2">
                            Website
                          </a>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-stone">
                      {dealer.owner_id ? 'Linked to a member account' : 'No member account linked'} · {dealer.stripe_account_id ? 'Stripe payouts connected' : 'Stripe payouts not connected'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dealer.status !== 'approved' && (
                      <button type="button" disabled={pending} onClick={() => run(() => updateDealer(dealer.id, { status: 'approved' }))} className="btn btn-gold btn-sm">
                        {dealer.status === 'suspended' ? 'Reinstate' : 'Approve'}
                      </button>
                    )}
                    {dealer.status !== 'suspended' && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm(`Suspend ${dealer.company_name}? Their live listings will be archived.`)) run(() => updateDealer(dealer.id, { status: 'suspended' }));
                        }}
                        className="btn btn-outline btn-sm !border-red-300 !text-red-800"
                      >
                        Suspend
                      </button>
                    )}
                    <button type="button" disabled={pending} onClick={() => run(() => updateDealer(dealer.id, { is_verified: !dealer.is_verified }))} className="btn btn-outline btn-sm">
                      {dealer.is_verified ? 'Remove verification' : 'Mark verified'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr]">
                  <div>
                    <label className="label" htmlFor={`tier-${dealer.id}`}>
                      Partner tier
                    </label>
                    <select
                      id={`tier-${dealer.id}`}
                      value={dealer.subscription_tier}
                      disabled={pending}
                      onChange={(event) => run(() => updateDealer(dealer.id, { subscription_tier: event.target.value }))}
                      className="input"
                    >
                      <option value="founding_free">Founding Partner (free)</option>
                      <option value="pro">Pro</option>
                      <option value="elite">Elite</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`feed-${dealer.id}`}>
                      XML / CSV sync URL
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id={`feed-${dealer.id}`}
                        type="url"
                        placeholder="https://dealer.com/feed.xml"
                        value={feed}
                        onChange={(event) => setFeedDrafts((current) => ({ ...current, [dealer.id]: event.target.value }))}
                        className="input"
                      />
                      {feed !== (dealer.feed_url ?? '') && (
                        <button type="button" disabled={pending} onClick={() => run(() => updateDealer(dealer.id, { feed_url: feed }))} className="btn btn-dark shrink-0">
                          Save
                        </button>
                      )}
                      {dealer.feed_url && (
                        <>
                          <button type="button" aria-label="Copy feed URL" onClick={() => void copy(dealer.feed_url ?? '')} className="btn btn-outline shrink-0">
                            <Copy aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <button type="button" disabled={pending} onClick={() => run(() => syncDealerFeed(dealer.id))} className="btn btn-outline shrink-0">
                            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} /> Sync now
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
