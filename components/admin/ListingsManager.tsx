'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ExternalLink, FileSpreadsheet, Plus, Search, Star } from 'lucide-react';
import { deleteListing, importListings, moderateListing, saveListing, setListingFeatured, type ImportSummary } from '@/app/admin/actions';
import { VERTICALS, getVertical } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import type { ManagedListing, ModerationStatus } from '@/types';
import { ListingEditor } from './ListingEditor';
import { NoticeBar, useAdminAction } from './useAdminAction';

type Tab = 'pending_review' | 'approved' | 'rejected' | 'all';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const STATUS_CHIP: Record<ModerationStatus, string> = {
  pending_review: 'chip-gold',
  approved: 'chip-green',
  rejected: 'chip-red',
  archived: '',
};

export function ListingsManager({ listings, dealers }: { listings: ManagedListing[]; dealers: Array<{ id: string; company_name: string }> }) {
  const [tab, setTab] = useState<Tab>('pending_review');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ManagedListing | 'new' | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const { pending, notice, setNotice, run } = useAdminAction();

  const dealerNames = useMemo(() => new Map(dealers.map((dealer) => [dealer.id, dealer.company_name])), [dealers]);
  const counts = useMemo(
    () => ({
      pending_review: listings.filter((item) => item.moderation_status === 'pending_review').length,
      approved: listings.filter((item) => item.moderation_status === 'approved').length,
      rejected: listings.filter((item) => item.moderation_status === 'rejected').length,
      all: listings.length,
    }),
    [listings],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listings.filter((item) => {
      if (tab !== 'all' && item.moderation_status !== tab) return false;
      if (!term) return true;
      return `${item.title} ${item.city} ${item.country} ${item.vertical} ${dealerNames.get(item.dealer_id ?? '') ?? ''}`.toLowerCase().includes(term);
    });
  }, [listings, tab, query, dealerNames]);

  const reject = (listing: ManagedListing) => {
    const note = window.prompt('Reason for rejection (sent to the dealer):', listing.admin_notes ?? '');
    if (note === null) return;
    run(() => moderateListing(listing.id, 'rejected', note));
  };

  const remove = (listing: ManagedListing) => {
    if (window.confirm(`Delete "${listing.title}" permanently? This cannot be undone.`)) run(() => deleteListing(listing.id));
  };

  const onImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setImportResult(null);
    run(
      () => importListings(data),
      (result) => {
        setImportResult(result);
        form.reset();
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Submissions queue</p>
          <h1 className="mt-2 font-serif text-4xl text-obsidian md:text-5xl">Listings</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowImporter((open) => !open)} className="btn btn-outline">
            <FileSpreadsheet aria-hidden="true" className="h-4 w-4" /> Bulk import
          </button>
          <button type="button" onClick={() => setEditing('new')} className="btn btn-dark">
            <Plus aria-hidden="true" className="h-4 w-4" /> New listing
          </button>
        </div>
      </div>

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      {showImporter && (
        <section aria-label="Bulk importer" className="border border-gold/40 bg-white p-6">
          <h2 className="font-serif text-2xl text-obsidian">Admin Bulk Importer</h2>
          <p className="mt-1 text-sm text-stone">
            Upload a CSV or XML file, or paste a dealer XML feed URL. Imported listings enter Pending Review. Rows below the price floors are rejected:{' '}
            {VERTICALS.map((vertical) => `${vertical.label} $${formatNumber(vertical.priceFloorUsd)}+`).join(', ')}.
          </p>
          <form onSubmit={onImport} className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="imp-file">
                CSV or XML file
              </label>
              <input id="imp-file" name="file" type="file" accept=".csv,.xml,text/csv,application/xml,text/xml" className="input !py-2.5" />
            </div>
            <div>
              <label className="label" htmlFor="imp-url">
                Or dealer feed URL
              </label>
              <input id="imp-url" name="feed_url" type="url" placeholder="https://dealer.com/feed.xml" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="imp-dealer">
                Assign to dealer
              </label>
              <select id="imp-dealer" name="dealer_id" defaultValue="" className="input">
                <option value="">House listings (no dealer)</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="imp-vertical">
                Category when a row has none
              </label>
              <select id="imp-vertical" name="default_vertical" defaultValue="" className="input">
                <option value="">Reject rows without a category</option>
                {VERTICALS.map((vertical) => (
                  <option key={vertical.slug} value={vertical.slug}>
                    {vertical.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:col-span-2">
              <button type="submit" disabled={pending} className="btn btn-dark">
                {pending ? 'Importing…' : 'Import listings'}
              </button>
              <a href="/samples/listings-template.csv" download className="text-xs font-semibold text-gold-deep underline underline-offset-2">
                CSV template
              </a>
              <a href="/samples/dealer-feed-example.xml" download className="text-xs font-semibold text-gold-deep underline underline-offset-2">
                XML example
              </a>
            </div>
          </form>
          {importResult && importResult.rejected.length > 0 && (
            <div className="mt-5 max-h-64 overflow-auto border border-sand">
              <table className="table-rl">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Title</th>
                    <th>Why it was rejected</th>
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
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand">
        <div role="tablist" aria-label="Moderation status" className="flex overflow-x-auto scrollbar-none">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${tab === item.id ? 'border-gold text-obsidian' : 'border-transparent text-stone hover:text-obsidian'}`}
            >
              {item.label} <span className="ms-1 text-stone">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative mb-2 w-full sm:w-72">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <input type="search" aria-label="Filter listings" placeholder="Filter by title, city, dealer…" value={query} onChange={(event) => setQuery(event.target.value)} className="input !min-h-10 ps-10 !py-2" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">
          {tab === 'pending_review' ? 'The review queue is clear.' : 'No listings here yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto border border-sand bg-white">
          <table className="table-rl">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Dealer</th>
                <th>Price (USD)</th>
                <th>Sale</th>
                <th>Quality</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((listing) => {
                const needsPermit = listing.vertical === 'residences' && listing.city.trim().toLowerCase() === 'dubai';
                return (
                  <tr key={listing.id}>
                    <td className="min-w-[19rem]">
                      <div className="flex gap-3">
                        <div className="h-14 w-20 shrink-0 overflow-hidden bg-ivory">
                          {listing.images[0] && <img src={imageUrl(listing.images[0], 160, 60)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <button type="button" onClick={() => setEditing(listing)} className="text-start font-semibold text-obsidian hover:text-gold-deep">
                            {listing.title}
                          </button>
                          <p className="mt-0.5 text-xs text-stone">
                            {getVertical(listing.vertical)?.label} · {listing.city}, {listing.country} · {listing.images.length} photos
                          </p>
                          <p className="mt-1 flex flex-wrap gap-1.5">
                            {listing.is_showcase && <span className="chip">Showcase</span>}
                            {needsPermit && <span className="chip chip-gold">Trakheesi {listing.trakheesi_permit_number}</span>}
                            {listing.moderation_status === 'approved' && (
                              <a href={`/listing/${listing.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gold-deep underline underline-offset-2">
                                View <ExternalLink aria-hidden="true" className="h-3 w-3" />
                              </a>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>{dealerNames.get(listing.dealer_id ?? '') ?? <span className="text-stone">House</span>}</td>
                    <td className="whitespace-nowrap font-semibold">
                      ${formatNumber(Number(listing.price_usd))}
                      {listing.price_on_request && <span className="block text-xs font-normal text-stone">hidden (POA)</span>}
                    </td>
                    <td className="whitespace-nowrap capitalize">{listing.sale_mode.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={listing.quality_score >= 80 ? 'font-semibold text-green-800' : ''}>{listing.quality_score}</span>
                    </td>
                    <td>
                      <span className={`chip ${STATUS_CHIP[listing.moderation_status]}`}>{listing.moderation_status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="whitespace-nowrap text-stone">{formatDate(listing.updated_at)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={pending}
                          aria-pressed={listing.is_featured}
                          aria-label={listing.is_featured ? 'Remove from featured' : 'Feature on the home page'}
                          title={listing.is_featured ? 'Featured' : 'Feature'}
                          onClick={() => run(() => setListingFeatured(listing.id, !listing.is_featured))}
                          className="flex h-9 w-9 items-center justify-center border border-sand hover:border-gold"
                        >
                          <Star aria-hidden="true" className={`h-4 w-4 ${listing.is_featured ? 'fill-gold text-gold' : 'text-stone'}`} />
                        </button>
                        <button type="button" onClick={() => setEditing(listing)} className="btn btn-outline btn-sm">
                          Edit
                        </button>
                        {listing.moderation_status !== 'approved' && (
                          <button type="button" disabled={pending} onClick={() => run(() => moderateListing(listing.id, 'approved'))} className="btn btn-gold btn-sm">
                            Approve
                          </button>
                        )}
                        {listing.moderation_status !== 'rejected' && (
                          <button type="button" disabled={pending} onClick={() => reject(listing)} className="btn btn-outline btn-sm !border-red-300 !text-red-800">
                            Reject
                          </button>
                        )}
                        <button type="button" disabled={pending} onClick={() => remove(listing)} className="btn btn-outline btn-sm">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ListingEditor
          key={editing === 'new' ? 'new' : editing.id}
          listing={editing === 'new' ? null : editing}
          mode="admin"
          dealers={dealers}
          onClose={() => setEditing(null)}
          onSaved={(message) => setNotice({ tone: 'ok', text: message })}
          save={saveListing}
        />
      )}
    </div>
  );
}
