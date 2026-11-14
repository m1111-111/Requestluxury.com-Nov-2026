'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Gavel, Heart, MapPin, Sparkles } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { Price } from '@/components/ui/Price';
import { useNow } from '@/components/ui/useNow';
import { getVertical } from '@/lib/constants';
import { timeLeft } from '@/lib/format';
import { imageSrcSet, imageUrl } from '@/lib/images';
import { cardFacts } from '@/lib/listing-facts';
import { useSaved } from '@/lib/saved';
import type { Listing } from '@/types';

const MAX_SLIDES = 8;

export function ListingCard({ listing, eager = false }: { listing: Listing; eager?: boolean }) {
  const { t } = usePreferences();
  const { isSaved, toggle } = useSaved();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const now = useNow(listing.is_auction);

  const images = listing.images.slice(0, MAX_SLIDES);
  const href = `/listing/${listing.slug}`;
  const saved = isSaved(listing.id);
  const vertical = getVertical(listing.vertical);
  const facts = cardFacts(listing);

  const countdown = listing.is_auction && now !== null ? timeLeft(listing.auction_end_time, now) : null;
  const auctionLive = Boolean(countdown && !countdown.ended);
  const verified = Boolean(listing.dealer?.is_verified) && !listing.is_showcase;

  const goTo = useCallback((next: number) => {
    const element = scroller.current;
    if (!element) return;
    element.scrollTo({ left: next * element.clientWidth, behavior: 'smooth' });
  }, []);

  const onScroll = useCallback(() => {
    const element = scroller.current;
    if (!element || element.clientWidth === 0) return;
    setIndex(Math.round(element.scrollLeft / element.clientWidth));
  }, []);

  return (
    <article className="group/card flex h-full flex-col bg-white shadow-card transition-shadow duration-500 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-graphite">
        {images.length > 0 ? (
          <div
            ref={scroller}
            dir="ltr"
            onScroll={onScroll}
            className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto"
          >
            {images.map((src, slide) => (
              <Link key={src} href={href} tabIndex={slide === 0 ? 0 : -1} aria-label={listing.title} className="relative h-full w-full shrink-0 snap-center">
                {failed.includes(slide) ? (
                  <span className="hero-poster flex h-full w-full items-center justify-center font-serif text-xl tracking-[0.2em] text-gold/70">
                    {vertical?.label.toUpperCase()}
                  </span>
                ) : (
                  <img
                    src={imageUrl(src, 800)}
                    srcSet={imageSrcSet(src, [480, 800, 1200])}
                    sizes="(min-width: 1280px) 30vw, (min-width: 640px) 46vw, 94vw"
                    alt={slide === 0 ? listing.title : `${listing.title}, photo ${slide + 1}`}
                    loading={eager && slide === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={() => setFailed((current) => (current.includes(slide) ? current : [...current, slide]))}
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover/card:scale-[1.03]"
                  />
                )}
              </Link>
            ))}
          </div>
        ) : (
          <Link href={href} className="hero-poster flex h-full w-full items-center justify-center font-serif text-xl tracking-[0.2em] text-gold/70">
            {vertical?.label.toUpperCase()}
          </Link>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />

        <div className="pointer-events-none absolute start-3 top-3 flex max-w-[78%] flex-wrap gap-1.5">
          {auctionLive && countdown && (
            <span className="badge glass">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              {t('card.live_auction')} • {countdown.label}
            </span>
          )}
          {listing.is_auction && countdown?.ended && <span className="badge glass">{t('card.ended')}</span>}
          {verified && (
            <span className="badge glass">
              <BadgeCheck aria-hidden="true" className="h-3 w-3 text-gold" />
              {t('card.verified')}
            </span>
          )}
          {listing.is_showcase && (
            <span className="badge glass">
              <Sparkles aria-hidden="true" className="h-3 w-3 text-gold" />
              {t('card.showcase')}
            </span>
          )}
          {listing.quality_score >= 80 && (
            <span className="badge glass">
              {t('card.quality')} {listing.quality_score}/100
            </span>
          )}
        </div>

        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? t('card.saved') : t('card.save')}
          onClick={() => toggle(listing.id)}
          className="glass absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:border-gold"
        >
          <Heart aria-hidden="true" className={`h-4 w-4 ${saved ? 'fill-gold text-gold' : 'text-white'}`} />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => goTo((index - 1 + images.length) % images.length)}
              className="glass absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-hover/card:opacity-100"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => goTo((index + 1) % images.length)}
              className="glass absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-hover/card:opacity-100"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((src, dot) => (
                <span key={src} className={`h-1 rounded-full transition-all duration-300 ${dot === index ? 'w-5 bg-white' : 'w-1 bg-white/55'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone">
          <MapPin aria-hidden="true" className="h-3 w-3 text-gold-deep" />
          {listing.city}, {listing.country}
        </p>
        <h3 className="mt-2 font-serif text-[1.5rem] leading-[1.15] text-obsidian">
          <Link href={href} className="transition-colors hover:text-gold-deep">
            {listing.title}
          </Link>
        </h3>
        {facts && <p className="mt-2 text-[13px] text-stone">{facts}</p>}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-sand pt-4">
          <div className="mt-4">
            {listing.is_auction ? (
              <>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone">
                  <Gavel aria-hidden="true" className="h-3 w-3" />
                  {listing.bid_count > 0 ? t('card.current_bid') : t('card.starting_bid')}
                </p>
                <Price
                  usd={listing.bid_count > 0 ? listing.current_highest_bid_usd : listing.starting_bid_usd}
                  className="mt-1 block text-lg font-semibold text-obsidian"
                />
              </>
            ) : (
              <Price usd={listing.public_price_usd} className="block text-lg font-semibold text-obsidian" />
            )}
          </div>
          {listing.is_auction ? (
            <span className="chip">{listing.bid_count} {t('card.bids')}</span>
          ) : listing.sale_mode === 'direct_buy' ? (
            <span className="chip chip-gold">{t('card.buy_now')}</span>
          ) : listing.sale_mode === 'hold_deposit' ? (
            <span className="chip chip-gold">{t('card.deposit')}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
