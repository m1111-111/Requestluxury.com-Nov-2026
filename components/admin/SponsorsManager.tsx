'use client';

import { useState, type FormEvent } from 'react';
import { Copy, ExternalLink, Plus } from 'lucide-react';
import { deleteSponsor, rotateSponsorKey, saveSponsor, type SponsorInput } from '@/app/admin/actions';
import { Modal } from '@/components/ui/Modal';
import { VERTICALS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import type { ManagedSponsor, SponsorCount } from '@/types';
import { NoticeBar, useAdminAction } from './useAdminAction';

function blank(): SponsorInput {
  return { id: null, name: '', slug: '', headline: '', body: '', cta_label: 'Discover more', target_url: '', image_url: '', verticals: [], is_active: true, contact_email: '', monthly_fee_gbp: '' };
}

function fromSponsor(sponsor: ManagedSponsor): SponsorInput {
  return {
    id: sponsor.id,
    name: sponsor.name,
    slug: sponsor.slug,
    headline: sponsor.headline,
    body: sponsor.body ?? '',
    cta_label: sponsor.cta_label,
    target_url: sponsor.target_url,
    image_url: sponsor.image_url ?? '',
    verticals: sponsor.verticals,
    is_active: sponsor.is_active,
    contact_email: sponsor.contact_email ?? '',
    monthly_fee_gbp: String(sponsor.monthly_fee_gbp ?? ''),
  };
}

export function SponsorsManager({ sponsors, stats, siteUrl }: { sponsors: ManagedSponsor[]; stats: Record<string, SponsorCount>; siteUrl: string }) {
  const [editing, setEditing] = useState<SponsorInput | null>(null);
  const { pending, notice, setNotice, run } = useAdminAction();

  const reportLink = (sponsor: ManagedSponsor) => `${siteUrl}/sponsor/${sponsor.slug}?key=${sponsor.report_key}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice({ tone: 'ok', text: 'Private report link copied. Send it to the sponsor.' });
    } catch {
      setNotice({ tone: 'error', text: `Copy failed. The link is: ${text}` });
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    run(() => saveSponsor(editing), () => setEditing(null));
  };

  const set = <K extends keyof SponsorInput>(key: K, value: SponsorInput[K]) => setEditing((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">ROI-tracked banners</p>
          <h1 className="mt-2 font-serif text-4xl text-obsidian md:text-5xl">Sponsors</h1>
        </div>
        <button type="button" onClick={() => setEditing(blank())} className="btn btn-dark">
          <Plus aria-hidden="true" className="h-4 w-4" /> New sponsor
        </button>
      </div>
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      {sponsors.length === 0 ? (
        <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">No sponsors yet. Create a banner to start tracking impressions and clicks.</p>
      ) : (
        <div className="grid gap-4">
          {sponsors.map((sponsor) => {
            const count = stats[sponsor.id] ?? { impressions: 0, clicks: 0 };
            const ctr = count.impressions > 0 ? `${((count.clicks / count.impressions) * 100).toFixed(2)}%` : '0.00%';
            return (
              <article key={sponsor.id} className="grid border border-sand bg-white md:grid-cols-[200px_1fr]">
                <div className="min-h-32 bg-obsidian">
                  {sponsor.image_url && <img src={imageUrl(sponsor.image_url, 400, 60)} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />}
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 font-serif text-2xl text-obsidian">
                        {sponsor.name}
                        <span className={`chip ${sponsor.is_active ? 'chip-green' : ''}`}>{sponsor.is_active ? 'Live' : 'Paused'}</span>
                      </h2>
                      <p className="mt-1 text-sm text-charcoal">“{sponsor.headline}”</p>
                      <p className="mt-1 text-xs text-stone">
                        Shown on: {sponsor.verticals.length > 0 ? sponsor.verticals.join(', ') : 'all placements'} · Links to {sponsor.target_url}
                        {Number(sponsor.monthly_fee_gbp) > 0 ? ` · £${formatNumber(Number(sponsor.monthly_fee_gbp))} / month` : ''}
                      </p>
                    </div>
                    <dl className="flex gap-6 text-end">
                      {[
                        ['Impressions', formatNumber(count.impressions)],
                        ['Clicks', formatNumber(count.clicks)],
                        ['CTR', ctr],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone">{label}</dt>
                          <dd className="font-serif text-2xl text-obsidian">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-sand pt-4">
                    <button type="button" onClick={() => void copy(reportLink(sponsor))} className="btn btn-dark btn-sm">
                      <Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy private ROI report link
                    </button>
                    <a href={reportLink(sponsor)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> Open report
                    </a>
                    <button type="button" onClick={() => setEditing(fromSponsor(sponsor))} className="btn btn-outline btn-sm">
                      Edit banner
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm('Issue a new report link? The current link will stop working.')) run(() => rotateSponsorKey(sponsor.id));
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      New report link
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Delete ${sponsor.name} and all of its statistics?`)) run(() => deleteSponsor(sponsor.id));
                      }}
                      className="btn btn-outline btn-sm ms-auto !border-red-300 !text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? 'Edit sponsor banner' : 'New sponsor banner'} size="lg">
        {editing && (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="sp-name">
                  Sponsor name
                </label>
                <input id="sp-name" required maxLength={120} value={editing.name} onChange={(event) => set('name', event.target.value)} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="sp-slug">
                  Report link name
                </label>
                <input id="sp-slug" maxLength={80} placeholder="made from the name if left empty" value={editing.slug} onChange={(event) => set('slug', event.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sp-headline">
                Banner headline
              </label>
              <input id="sp-headline" required maxLength={160} value={editing.headline} onChange={(event) => set('headline', event.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="sp-body">
                Supporting text
              </label>
              <textarea id="sp-body" maxLength={600} value={editing.body} onChange={(event) => set('body', event.target.value)} className="input !min-h-24" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="sp-cta">
                  Button label
                </label>
                <input id="sp-cta" maxLength={40} value={editing.cta_label} onChange={(event) => set('cta_label', event.target.value)} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="sp-target">
                  Destination link
                </label>
                <input id="sp-target" required maxLength={500} placeholder="https://… or /concierge/…" value={editing.target_url} onChange={(event) => set('target_url', event.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sp-image">
                Banner image link
              </label>
              <input id="sp-image" type="url" maxLength={1000} placeholder="https://" value={editing.image_url} onChange={(event) => set('image_url', event.target.value)} className="input" />
            </div>
            <fieldset>
              <legend className="label">Show on (leave all unticked for every placement)</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {VERTICALS.map((vertical) => (
                  <label key={vertical.slug} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.verticals.includes(vertical.slug)}
                      onChange={(event) => set('verticals', event.target.checked ? [...editing.verticals, vertical.slug] : editing.verticals.filter((item) => item !== vertical.slug))}
                      className="h-4 w-4 accent-[#8a6d2f]"
                    />
                    {vertical.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="sp-email">
                  Sponsor contact email
                </label>
                <input id="sp-email" type="email" maxLength={320} value={editing.contact_email} onChange={(event) => set('contact_email', event.target.value)} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="sp-fee">
                  Monthly fee (GBP)
                </label>
                <input id="sp-fee" inputMode="decimal" value={editing.monthly_fee_gbp} onChange={(event) => set('monthly_fee_gbp', event.target.value)} className="input" />
              </div>
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <input type="checkbox" checked={editing.is_active} onChange={(event) => set('is_active', event.target.checked)} className="h-4 w-4 accent-[#8a6d2f]" />
                Banner is live
              </label>
            </div>
            <button type="submit" disabled={pending} className="btn btn-dark">
              {pending ? 'Saving…' : 'Save sponsor'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
