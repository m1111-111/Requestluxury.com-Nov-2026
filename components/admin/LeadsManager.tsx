'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { createReferralDeal, forwardLead, setLeadStatus, setReferralDealStatus } from '@/app/admin/actions';
import { Modal } from '@/components/ui/Modal';
import { FEES, LEAD_TYPES, LEAD_TYPE_LABELS, leadFeeTierGbp } from '@/lib/constants';
import { formatDate, formatNumber } from '@/lib/format';
import type { Lead, LeadType, ReferralDeal } from '@/types';
import { NoticeBar, useAdminAction } from './useAdminAction';

type StatusTab = Lead['admin_status'] | 'all';

const TABS: Array<{ id: StatusTab; label: string }> = [
  { id: 'new', label: 'New' },
  { id: 'forwarded_to_dealer', label: 'Forwarded' },
  { id: 'closed_won', label: 'Closed won' },
  { id: 'archived', label: 'Archived' },
  { id: 'all', label: 'All' },
];

const STATUS_CHIP: Record<Lead['admin_status'], string> = { new: 'chip-gold', forwarded_to_dealer: 'chip-dark', closed_won: 'chip-green', archived: '' };

interface DealerOption {
  id: string;
  company_name: string;
  status: string;
}

export function LeadsManager({ leads, deals, dealers }: { leads: Lead[]; deals: ReferralDeal[]; dealers: DealerOption[] }) {
  const [tab, setTab] = useState<StatusTab>('new');
  const [type, setType] = useState<LeadType | ''>('');
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [converting, setConverting] = useState<Lead | null>(null);
  const [dealType, setDealType] = useState<'commission_share' | 'lead_fee'>('commission_share');
  const [salePrice, setSalePrice] = useState('');
  const [commission, setCommission] = useState('');
  const [share, setShare] = useState(String(FEES.referralShareRate * 100));
  const { pending, notice, setNotice, run } = useAdminAction();

  const dealerNames = useMemo(() => new Map(dealers.map((dealer) => [dealer.id, dealer.company_name])), [dealers]);
  const leadRefs = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);
  const approved = dealers.filter((dealer) => dealer.status === 'approved');
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: leads.length };
    for (const lead of leads) result[lead.admin_status] = (result[lead.admin_status] ?? 0) + 1;
    return result;
  }, [leads]);
  const visible = leads.filter((lead) => (tab === 'all' || lead.admin_status === tab) && (!type || lead.lead_type === type));

  const openConvert = (lead: Lead) => {
    setConverting(lead);
    setDealType('commission_share');
    setSalePrice(lead.listing?.public_price_usd ? String(lead.listing.public_price_usd) : '');
    setCommission('');
    setShare(String(FEES.referralShareRate * 100));
  };

  const onConvert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!converting) return;
    const notes = String(new FormData(event.currentTarget).get('notes') ?? '');
    run(
      () => createReferralDeal({ lead_id: converting.id, deal_type: dealType, sale_price_usd: salePrice, gross_commission_usd: commission, referral_share_rate: Number(share) / 100, notes }),
      () => setConverting(null),
    );
  };

  const payout = (Number(commission.replace(/[,\s]/g, '')) || 0) * ((Number(share) || 0) / 100);
  const tierFee = converting ? (Number(converting.lead_fee_tier_gbp) > 0 ? Number(converting.lead_fee_tier_gbp) : leadFeeTierGbp(Number(salePrice.replace(/[,\s]/g, '')) || 0)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">12-month protection & referral tracker</p>
        <h1 className="mt-2 font-serif text-4xl text-obsidian md:text-5xl">Leads</h1>
      </div>
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand">
        <div role="tablist" aria-label="Lead status" className="flex overflow-x-auto scrollbar-none">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${tab === item.id ? 'border-gold text-obsidian' : 'border-transparent text-stone hover:text-obsidian'}`}
            >
              {item.label} <span className="ms-1 text-stone">{counts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <select aria-label="Lead type" value={type} onChange={(event) => setType(event.target.value as LeadType | '')} className="input mb-2 !min-h-10 w-full !py-2 sm:w-64">
          <option value="">All lead types</option>
          {LEAD_TYPES.map((item) => (
            <option key={item} value={item}>
              {LEAD_TYPE_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">No leads match this view.</p>
      ) : (
        <div className="grid gap-4">
          {visible.map((lead) => {
            const selected = choice[lead.id] ?? lead.dealer_id ?? '';
            const details = Object.entries(lead.metadata ?? {}).filter(([key, value]) => value !== '' && !['source', 'user_id'].includes(key));
            return (
              <article key={lead.id} className="border border-sand bg-white">
                <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_1.5fr]">
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-obsidian">{lead.lead_reference_code}</span>
                      <span className={`chip ${STATUS_CHIP[lead.admin_status]}`}>{lead.admin_status.replace(/_/g, ' ')}</span>
                      <span className="chip">{LEAD_TYPE_LABELS[lead.lead_type]}</span>
                    </p>
                    <p className="mt-3 font-serif text-2xl leading-tight text-obsidian">{lead.buyer_name}</p>
                    <p className="mt-1 text-sm">
                      <a href={`mailto:${lead.buyer_email}`} className="text-gold-deep underline underline-offset-2">
                        {lead.buyer_email}
                      </a>
                      {lead.buyer_phone ? ` · ${lead.buyer_phone}` : ''}
                    </p>
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-stone">
                      <dt>Received</dt>
                      <dd className="text-charcoal">{formatDate(lead.created_at, true)}</dd>
                      <dt>Protected until</dt>
                      <dd className="text-charcoal">{formatDate(lead.protection_expires_at)}</dd>
                      <dt>Lead fee tier</dt>
                      <dd className="text-charcoal">{Number(lead.lead_fee_tier_gbp) > 0 ? `£${Number(lead.lead_fee_tier_gbp)}` : 'Not applicable'}</dd>
                      {lead.dealer_id && (
                        <>
                          <dt>Partner</dt>
                          <dd className="text-charcoal">
                            {dealerNames.get(lead.dealer_id) ?? 'Unknown dealer'}
                            {lead.forwarded_at ? ` · forwarded ${formatDate(lead.forwarded_at)}` : ''}
                          </dd>
                        </>
                      )}
                    </dl>
                  </div>
                  <div className="min-w-0">
                    {lead.listing ? (
                      <p className="text-sm">
                        <span className="label !mb-1">Asset</span>
                        <a href={`/listing/${lead.listing.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-obsidian underline underline-offset-2 hover:text-gold-deep">
                          {lead.listing.title}
                        </a>
                        {lead.listing.public_price_usd ? ` · $${formatNumber(lead.listing.public_price_usd)}` : ''}
                      </p>
                    ) : (
                      <p className="label !mb-1">No listing attached</p>
                    )}
                    {lead.message && <p className="mt-3 whitespace-pre-line break-words border-s-2 border-sand ps-4 text-sm leading-relaxed text-charcoal">{lead.message}</p>}
                    {details.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {details.map(([key, value]) => (
                          <li key={key} className="chip">
                            {key.replace(/_/g, ' ')}: {String(value)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-sand bg-ivory px-5 py-3">
                  <label className="sr-only" htmlFor={`dealer-${lead.id}`}>
                    Partner dealer
                  </label>
                  <select id={`dealer-${lead.id}`} value={selected} onChange={(event) => setChoice((current) => ({ ...current, [lead.id]: event.target.value }))} className="input !min-h-10 w-full !py-2 sm:w-64">
                    <option value="">Choose partner dealer…</option>
                    {approved.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>
                        {dealer.company_name}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={pending || !selected} onClick={() => run(() => forwardLead(lead.id, selected))} className="btn btn-dark btn-sm">
                    <Send aria-hidden="true" className="h-3.5 w-3.5" />
                    {lead.admin_status === 'forwarded_to_dealer' ? 'Resend certificate' : 'Forward to Partner Dealer & Send 12-Month Registration Certificate'}
                  </button>
                  <button type="button" disabled={pending} onClick={() => openConvert(lead)} className="btn btn-gold btn-sm">
                    Convert to referral deal
                  </button>
                  {lead.admin_status !== 'archived' ? (
                    <button type="button" disabled={pending} onClick={() => run(() => setLeadStatus(lead.id, 'archived'))} className="btn btn-outline btn-sm ms-auto">
                      Archive
                    </button>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => run(() => setLeadStatus(lead.id, 'new'))} className="btn btn-outline btn-sm ms-auto">
                      Restore
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section id="deals" className="scroll-mt-8 border border-sand bg-white">
        <h2 className="border-b border-sand px-5 py-4 font-serif text-2xl text-obsidian">Referral deals</h2>
        {deals.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone">No deals yet. Convert a closed lead to record the commission share or lead fee due.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-rl">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Partner</th>
                  <th>Type</th>
                  <th>Sale price</th>
                  <th>Due to RequestLuxury</th>
                  <th>Closed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id}>
                    <td className="font-mono text-xs">{leadRefs.get(deal.lead_id ?? '')?.lead_reference_code ?? '—'}</td>
                    <td>{dealerNames.get(deal.dealer_id ?? '') ?? '—'}</td>
                    <td className="whitespace-nowrap">{deal.deal_type === 'commission_share' ? `${Math.round(Number(deal.referral_share_rate) * 100)}% commission share` : 'Tiered lead fee'}</td>
                    <td className="whitespace-nowrap">{Number(deal.sale_price_usd) > 0 ? `$${formatNumber(Number(deal.sale_price_usd))}` : '—'}</td>
                    <td className="whitespace-nowrap font-semibold">
                      {deal.deal_type === 'commission_share' ? `$${formatNumber(Number(deal.referral_payout_usd))}` : `£${formatNumber(Number(deal.lead_fee_gbp))}`}
                    </td>
                    <td className="whitespace-nowrap text-stone">{formatDate(deal.closed_at)}</td>
                    <td>
                      <select
                        aria-label="Deal status"
                        value={deal.status}
                        disabled={pending}
                        onChange={(event) => run(() => setReferralDealStatus(deal.id, event.target.value as ReferralDeal['status']))}
                        className="input !min-h-9 !py-1.5 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="invoiced">Invoiced</option>
                        <option value="paid">Paid</option>
                        <option value="void">Void</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={converting !== null} onClose={() => setConverting(null)} title={`Convert ${converting?.lead_reference_code ?? ''} to a referral deal`} size="lg">
        <form onSubmit={onConvert} className="grid gap-5">
          <div role="radiogroup" aria-label="How RequestLuxury is paid" className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['commission_share', 'Broker commission share', `${Math.round(FEES.referralShareMin * 100)}–${Math.round(FEES.referralShareMax * 100)}% of the partner's commission`],
                ['lead_fee', 'Tiered lead fee', '£25, £75 or £150 by asset value'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={dealType === value}
                onClick={() => setDealType(value)}
                className={`border p-4 text-start ${dealType === value ? 'border-gold bg-ivory' : 'border-sand bg-white'}`}
              >
                <span className="block text-sm font-semibold text-obsidian">{label}</span>
                <span className="mt-1 block text-xs text-stone">{hint}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="deal-price">
              Sale price (USD)
            </label>
            <input id="deal-price" inputMode="decimal" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} className="input" />
          </div>
          {dealType === 'commission_share' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="deal-commission">
                  Partner&apos;s gross commission (USD)
                </label>
                <input id="deal-commission" inputMode="decimal" required value={commission} onChange={(event) => setCommission(event.target.value)} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="deal-share">
                  Our share (%)
                </label>
                <input id="deal-share" type="number" min={FEES.referralShareMin * 100} max={FEES.referralShareMax * 100} step="1" required value={share} onChange={(event) => setShare(event.target.value)} className="input" />
              </div>
              <p className="border border-gold/40 bg-ivory p-4 text-sm sm:col-span-2">
                Due to RequestLuxury: <strong className="font-serif text-2xl text-obsidian">${formatNumber(Math.round(payout * 100) / 100)}</strong>
              </p>
            </div>
          ) : (
            <p className="border border-gold/40 bg-ivory p-4 text-sm">
              Lead fee due: <strong className="font-serif text-2xl text-obsidian">£{tierFee}</strong>
              <span className="mt-1 block text-xs text-stone">Under $1M: £25 · $1M to $3M: £75 · over $3M: £150</span>
            </p>
          )}
          <div>
            <label className="label" htmlFor="deal-notes">
              Notes
            </label>
            <textarea id="deal-notes" name="notes" maxLength={2000} className="input !min-h-20" />
          </div>
          <button type="submit" disabled={pending} className="btn btn-dark">
            {pending ? 'Saving…' : 'Record referral deal'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
