'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Gavel, ShieldCheck } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { useNow } from '@/components/ui/useNow';
import { FEES, minimumNextBid } from '@/lib/constants';
import { recallContact } from '@/lib/contact-memory';
import { formatNumber, timeLeft } from '@/lib/format';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import type { AuctionState, Listing } from '@/types';

interface StateResponse {
  state: AuctionState | null;
  signed_in: boolean;
  error?: string;
}

/**
 * Live auction box. New bids arrive through Supabase Realtime and a 10-second poll,
 * so the price, bid count and (anti-sniping) end time stay current without a reload.
 */
export function AuctionBox({ listing, onSettle }: { listing: Listing; onSettle: () => void }) {
  const { price, t } = usePreferences();
  const now = useNow(true);
  const [state, setState] = useState<AuctionState | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [verificationRequested, setVerificationRequested] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/bids?listing_id=${listing.id}`, { cache: 'no-store' });
      if (!response.ok) return;
      const body = (await response.json()) as StateResponse;
      if (body.state) setState(body.state);
      setSignedIn(Boolean(body.signed_in));
    } catch {
      // Keep the last known state; the next poll will retry.
    }
  }, [listing.id]);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), 10_000);
    const supabase = getBrowserSupabase();
    const channel = supabase
      ?.channel(`auction:${listing.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `listing_id=eq.${listing.id}` }, () => void refresh())
      .subscribe();
    return () => {
      window.clearInterval(poll);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [listing.id, refresh]);

  const current = state?.current_highest_bid_usd ?? listing.current_highest_bid_usd;
  const bidCount = state?.bid_count ?? listing.bid_count;
  const starting = state?.starting_bid_usd ?? listing.starting_bid_usd;
  const endTime = state?.auction_end_time ?? listing.auction_end_time;
  const minimum = state?.minimum_next_bid_usd ?? minimumNextBid(starting, current, bidCount);
  const hasReserve = state?.has_reserve ?? listing.has_reserve;
  const reserveMet = state?.reserve_met ?? listing.reserve_met;
  const countdown = now !== null ? timeLeft(endTime, now) : null;
  const ended = countdown ? countdown.ended : Boolean(state?.ended);
  const closingSoon = Boolean(countdown && !countdown.ended && countdown.totalSeconds <= 120);
  const premiumPercent = Math.round(FEES.auctionPremiumRate * 100);

  const typed = Number(amount.replace(/[,\s]/g, ''));
  const bidValue = Number.isFinite(typed) && typed > 0 ? typed : minimum;

  const placeBid = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id, amount: bidValue }),
      });
      const body = (await response.json().catch(() => ({}))) as StateResponse;
      if (body.state) setState(body.state);
      if (!response.ok) {
        setMessage({ tone: 'error', text: body.error || t('form.error') });
      } else {
        setAmount('');
        setMessage({ tone: 'ok', text: `Bid of USD ${formatNumber(bidValue)} accepted. You are the highest bidder.` });
      }
    } catch {
      setMessage({ tone: 'error', text: t('form.error') });
    } finally {
      setBusy(false);
    }
  };

  const requestVerification = async () => {
    setBusy(true);
    setMessage(null);
    const contact = recallContact();
    try {
      const response = await fetch('/api/bids/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listing.id, phone: contact?.phone ?? '' }),
      });
      const body = (await response.json().catch(() => ({}))) as { reference?: string; error?: string };
      if (!response.ok) {
        setMessage({ tone: 'error', text: body.error || t('form.error') });
      } else {
        setVerificationRequested(true);
        setMessage({ tone: 'ok', text: `Verification requested (${body.reference}). Our concierge will be in touch shortly.` });
      }
    } catch {
      setMessage({ tone: 'error', text: t('form.error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className={`badge ${ended ? 'bg-sand text-stone' : 'bg-obsidian text-gold'}`}>
          {!ended && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
          {ended ? t('card.ended') : t('card.live_auction')}
        </span>
        {countdown && !ended && (
          <span aria-live="off" className={`font-mono text-sm font-semibold tabular-nums ${closingSoon ? 'text-red-700' : 'text-obsidian'}`}>
            {countdown.label}
          </span>
        )}
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
        {ended ? (bidCount > 0 ? 'Final bid' : 'No bids received') : bidCount > 0 ? t('card.current_bid') : t('card.starting_bid')}
      </p>
      <p className="mt-1 font-serif text-[2.6rem] leading-none text-obsidian">{price(bidCount > 0 ? current : starting)}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone">
        <span>
          {bidCount} {t('card.bids')}
        </span>
        <span aria-hidden="true">·</span>
        <span>{!hasReserve ? 'No reserve' : reserveMet ? 'Reserve met' : 'Reserve not yet met'}</span>
        {state?.my_paddle && (
          <>
            <span aria-hidden="true">·</span>
            <span>Your paddle {state.my_paddle}</span>
          </>
        )}
      </p>
      {closingSoon && <p className="mt-3 text-xs font-semibold text-red-700">Closing: a bid now extends the auction by two minutes.</p>}

      {!ended && (
        <div className="mt-5 border-t border-sand pt-5">
          {!signedIn ? (
            <Link href={`/sign-in?next=${encodeURIComponent(`/listing/${listing.slug}`)}`} className="btn btn-dark w-full">
              <Gavel aria-hidden="true" className="h-4 w-4" />
              Sign in to bid
            </Link>
          ) : state && !state.is_verified_buyer ? (
            <>
              <p className="text-sm leading-relaxed text-charcoal">Bidding is reserved for verified buyers. Verification is free and usually completed the same day.</p>
              <button type="button" disabled={busy || verificationRequested} onClick={requestVerification} className="btn btn-dark mt-4 w-full">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                {verificationRequested ? 'Verification requested' : 'Request bidder verification'}
              </button>
            </>
          ) : (
            <form onSubmit={placeBid}>
              <label className="label" htmlFor="bid-amount">
                Your bid (USD), minimum {formatNumber(minimum)}
              </label>
              <div className="flex gap-2">
                <input
                  id="bid-amount"
                  inputMode="decimal"
                  placeholder={formatNumber(minimum)}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d.,]/g, ''))}
                  className="input"
                />
                <button type="submit" disabled={busy || bidValue < minimum} className="btn btn-dark shrink-0">
                  <Gavel aria-hidden="true" className="h-4 w-4" />
                  {t('detail.bid')}
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-stone">
                A winning bid of {price(bidValue)} totals {price(bidValue * (1 + FEES.auctionPremiumRate))} with the {premiumPercent}% Winning Bidder Premium.
                {state?.i_am_highest ? ' You are currently the highest bidder.' : ''}
              </p>
            </form>
          )}
        </div>
      )}

      {ended && state?.i_am_highest && (!hasReserve || reserveMet) && (
        <div className="mt-5 border-t border-sand pt-5">
          <p className="text-sm leading-relaxed text-charcoal">
            Congratulations, you won this lot. Settle {price(current * (1 + FEES.auctionPremiumRate))} (hammer price plus {premiumPercent}% premium) to complete the purchase.
          </p>
          <button type="button" onClick={onSettle} className="btn btn-dark mt-4 w-full">
            Settle via Stripe
          </button>
        </div>
      )}

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-4 text-sm ${message.tone === 'error' ? 'text-red-700' : 'text-green-800'}`}>
          {message.text}
        </p>
      )}

      {state && state.recent_bids.length > 0 && (
        <div className="mt-5 border-t border-sand pt-4">
          <p className="label">Bid history</p>
          <ul className="space-y-1.5 text-sm">
            {state.recent_bids.map((bid, index) => (
              <li key={`${bid.bidder_paddle}-${bid.bid_amount_usd}`} className="flex items-center justify-between gap-3">
                <span className={index === 0 ? 'font-semibold text-obsidian' : 'text-stone'}>Paddle {bid.bidder_paddle}</span>
                <span className={index === 0 ? 'font-semibold text-obsidian' : 'text-stone'}>{price(bid.bid_amount_usd)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
