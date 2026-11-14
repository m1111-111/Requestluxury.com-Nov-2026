'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { BadgeCheck, CreditCard, FileText, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { LeadForm } from '@/components/forms/LeadForm';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { Modal } from '@/components/ui/Modal';
import { FEES, canCheckoutOnline } from '@/lib/constants';
import { recallContact, rememberContact } from '@/lib/contact-memory';
import type { Listing } from '@/types';
import { AuctionBox } from './AuctionBox';

type Panel = null | 'dossier' | 'whatsapp' | 'checkout';
type CheckoutKind = 'direct_buy' | 'hold_deposit' | 'auction_settlement';

const stripeLive = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').startsWith('pk_live_');

/**
 * Sticky contact card. Residences (regulated real estate) are always enquiry-led:
 * WhatsApp and the private dossier, with no checkout or fees. Other assets add
 * Stripe "Reserve / Buy" or the live auction box, depending on how they are sold.
 */
export function ContactCard({ listing }: { listing: Listing }) {
  const { price, t } = usePreferences();
  const [panel, setPanel] = useState<Panel>(null);
  const [checkoutKind, setCheckoutKind] = useState<CheckoutKind>('direct_buy');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const remembered = recallContact();
    if (remembered) {
      setName(remembered.name);
      setEmail(remembered.email);
    }
  }, []);

  const online = canCheckoutOnline(listing.vertical, listing.sale_mode);
  const isAuction = listing.sale_mode === 'timed_auction';
  const showcaseBlocked = listing.is_showcase && stripeLive;
  const feePercent = (FEES.buyerServiceFeeRate * 100).toFixed(1);
  const dealer = listing.dealer;

  const openWhatsApp = async (contact: { name: string; email: string }) => {
    // Open the tab during the click so pop-up blockers allow it, then point it at WhatsApp.
    const popup = window.open('about:blank', '_blank');
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_type: 'whatsapp_click',
          listing_id: listing.id,
          name: contact.name,
          email: contact.email,
          phone: recallContact()?.phone ?? '',
          metadata: { source: 'listing-whatsapp' },
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { receipt?: { reference: string }; whatsapp_url?: string | null; error?: string };
      if (!response.ok || !body.receipt) {
        popup?.close();
        setNotice({ tone: 'error', text: body.error || t('form.error') });
        return;
      }
      rememberContact({ name: contact.name, email: contact.email, phone: recallContact()?.phone ?? '' });
      setPanel(null);
      if (body.whatsapp_url) {
        if (popup) {
          popup.opener = null;
          popup.location.replace(body.whatsapp_url);
        } else {
          window.location.assign(body.whatsapp_url);
        }
        setNotice({ tone: 'ok', text: `Enquiry registered as ${body.receipt.reference}. WhatsApp is opening.` });
      } else {
        popup?.close();
        setNotice({ tone: 'ok', text: `Enquiry registered as ${body.receipt.reference}. Our concierge will reply by email shortly.` });
      }
    } catch {
      popup?.close();
      setNotice({ tone: 'error', text: t('form.error') });
    } finally {
      setBusy(false);
    }
  };

  const onWhatsAppClick = () => {
    const remembered = recallContact();
    if (remembered?.name && remembered.email) void openWhatsApp(remembered);
    else setPanel('whatsapp');
  };

  const startCheckout = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: checkoutKind, listing_id: listing.id, name, email }),
      });
      const body = (await response.json().catch(() => ({}))) as { url?: string; reference?: string; message?: string; error?: string };
      rememberContact({ name, email, phone: recallContact()?.phone ?? '' });
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      setPanel(null);
      setNotice({
        tone: response.ok ? 'ok' : 'error',
        text: body.message || body.error || t('form.error'),
      });
    } catch {
      setNotice({ tone: 'error', text: t('form.error') });
    } finally {
      setBusy(false);
    }
  };

  const beginCheckout = (kind: CheckoutKind) => {
    setCheckoutKind(kind);
    setPanel('checkout');
  };

  const total = listing.public_price_usd !== null ? listing.public_price_usd * (1 + FEES.buyerServiceFeeRate) : null;

  return (
    <div className="border border-sand bg-white shadow-card">
      <div className="p-6">
        {isAuction ? (
          <AuctionBox listing={listing} onSettle={() => beginCheckout('auction_settlement')} />
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
              {listing.price_on_request ? 'Guide price' : listing.vertical === 'residences' ? 'Asking price' : 'Price'}
            </p>
            <p className="mt-1 font-serif text-[2.6rem] leading-none text-obsidian">
              {listing.public_price_usd === null ? t('card.poa') : price(listing.public_price_usd)}
            </p>
            {listing.public_price_usd !== null && listing.display_currency !== 'USD' && (
              <p className="mt-2 text-xs text-stone">Converted at today&apos;s indicative rate. Listed in {listing.display_currency}.</p>
            )}

            {online && !showcaseBlocked && listing.sale_mode === 'direct_buy' && total !== null && (
              <dl className="mt-5 space-y-1.5 border-t border-sand pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-stone">Buyer&apos;s Service Fee ({feePercent}%)</dt>
                  <dd>{price(total - (listing.public_price_usd ?? 0))}</dd>
                </div>
                <div className="flex justify-between gap-4 font-semibold text-obsidian">
                  <dt>Total today</dt>
                  <dd>{price(total)}</dd>
                </div>
              </dl>
            )}
            {online && !showcaseBlocked && listing.sale_mode === 'hold_deposit' && (
              <dl className="mt-5 space-y-1.5 border-t border-sand pt-4 text-sm">
                <div className="flex justify-between gap-4 font-semibold text-obsidian">
                  <dt>Refundable hold deposit</dt>
                  <dd>{price(listing.deposit_amount_usd)}</dd>
                </div>
                <p className="text-xs leading-relaxed text-stone">
                  Credited against the purchase price. A {feePercent}% Buyer&apos;s Service Fee applies only if you complete through RequestLuxury.
                </p>
              </dl>
            )}
          </>
        )}

        <div className="mt-6 grid gap-2.5">
          {online && !isAuction && !showcaseBlocked && (
            <button type="button" onClick={() => beginCheckout(listing.sale_mode === 'direct_buy' ? 'direct_buy' : 'hold_deposit')} className="btn btn-gold w-full">
              <CreditCard aria-hidden="true" className="h-4 w-4" />
              {listing.sale_mode === 'direct_buy' ? t('detail.buy') : t('detail.reserve')}
            </button>
          )}
          <button type="button" onClick={onWhatsAppClick} disabled={busy} className="btn btn-whatsapp w-full">
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            {t('detail.whatsapp')}
          </button>
          <button type="button" onClick={() => setPanel('dossier')} className="btn btn-dark w-full">
            <FileText aria-hidden="true" className="h-4 w-4" />
            {t('detail.dossier')}
          </button>
        </div>

        {notice && (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-4 text-sm leading-relaxed ${notice.tone === 'error' ? 'text-red-700' : 'text-green-800'}`}>
            {notice.text}
          </p>
        )}

        {showcaseBlocked && online && (
          <p className="mt-4 text-xs leading-relaxed text-stone">This is a showcase piece, so online checkout is switched off. Ask the concierge to source one like it.</p>
        )}
        {listing.vertical === 'residences' && (
          <p className="mt-4 text-xs leading-relaxed text-stone">
            Property transactions are concluded directly with the licensed agent and your own legal advisers. RequestLuxury charges buyers no fee.
          </p>
        )}

        <p className="mt-5 flex items-start gap-2 border-t border-sand pt-4 text-xs leading-relaxed text-stone">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
          {t('detail.protected')}
        </p>
      </div>

      {dealer && (
        <div className="flex items-center gap-3 border-t border-sand bg-ivory px-6 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-gold/50 bg-white font-serif text-xl text-gold-deep">
            {dealer.company_name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-obsidian">{dealer.company_name}</p>
            <p className="flex items-center gap-1.5 text-xs text-stone">
              {listing.is_showcase || dealer.is_showcase ? (
                <>
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-gold-deep" />
                  Showcase partner · {dealer.city}
                </>
              ) : dealer.is_verified ? (
                <>
                  <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 text-gold-deep" />
                  {t('card.verified')} · {dealer.city}
                </>
              ) : (
                <>
                  {dealer.city}, {dealer.country}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <Modal open={panel === 'dossier'} onClose={() => setPanel(null)} title={t('detail.dossier')}>
        <p className="mb-5 text-sm leading-relaxed text-stone">
          Receive the full dossier for <strong className="font-semibold text-charcoal">{listing.title}</strong>. Your enquiry is registered under a
          private reference and protected for {FEES.protectionMonths} months.
        </p>
        <LeadForm
          leadType="asset_inquiry"
          listingId={listing.id}
          metadata={{ source: 'listing-dossier' }}
          messagePlaceholder="Preferred viewing dates, questions for the specialist…"
          submitLabel={t('detail.dossier')}
        />
      </Modal>

      <Modal open={panel === 'whatsapp'} onClose={() => setPanel(null)} title={t('detail.whatsapp')}>
        <p className="mb-5 text-sm leading-relaxed text-stone">
          Tell us who is enquiring and WhatsApp opens with your reference already in the message. You only need to do this once.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void openWhatsApp({ name, email });
          }}
          className="grid gap-4"
        >
          <div>
            <label className="label" htmlFor="wa-name">
              {t('form.name')}
            </label>
            <input id="wa-name" required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="wa-email">
              {t('form.email')}
            </label>
            <input id="wa-email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" />
          </div>
          <button type="submit" disabled={busy} className="btn btn-whatsapp w-full">
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            {busy ? t('form.sending') : 'Open WhatsApp'}
          </button>
        </form>
      </Modal>

      <Modal
        open={panel === 'checkout'}
        onClose={() => setPanel(null)}
        title={checkoutKind === 'direct_buy' ? t('detail.buy') : checkoutKind === 'hold_deposit' ? t('detail.reserve') : 'Settle your winning bid'}
      >
        <p className="mb-5 text-sm leading-relaxed text-stone">
          You will continue to Stripe&apos;s secure checkout to pay by card or bank transfer. Enter the name and email for your receipt.
        </p>
        <form onSubmit={startCheckout} className="grid gap-4">
          <div>
            <label className="label" htmlFor="co-name">
              {t('form.name')}
            </label>
            <input id="co-name" required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="co-email">
              {t('form.email')}
            </label>
            <input id="co-email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" />
          </div>
          <button type="submit" disabled={busy} className="btn btn-gold w-full">
            <CreditCard aria-hidden="true" className="h-4 w-4" />
            {busy ? t('form.sending') : 'Continue to secure checkout'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
