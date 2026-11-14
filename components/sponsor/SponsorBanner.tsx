'use client';

import { useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { imageUrl } from '@/lib/images';
import type { Sponsor } from '@/types';

/**
 * Native editorial sponsor banner. An impression is recorded once per page view when
 * the banner is actually seen; clicks pass through /api/sponsor/click, which records
 * the click and the visitor country before redirecting.
 */
export function SponsorBanner({ sponsor, placement }: { sponsor: Sponsor; placement: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const key = `rl_imp:${sponsor.id}:${window.location.pathname}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
    } catch {
      // Session storage unavailable: count the impression once for this mount.
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        try {
          window.sessionStorage.setItem(key, '1');
        } catch {
          // Ignore.
        }
        const payload = JSON.stringify({
          sponsor_id: sponsor.id,
          event_type: 'impression',
          vertical: placement,
          path: window.location.pathname,
        });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/sponsor-events', new Blob([payload], { type: 'application/json' }));
        } else {
          void fetch('/api/sponsor-events', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true });
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [sponsor.id, placement]);

  const href = `/api/sponsor/click?s=${encodeURIComponent(sponsor.slug)}&v=${encodeURIComponent(placement)}`;

  return (
    <aside ref={ref} aria-label={`Sponsored: ${sponsor.name}`} className="grid overflow-hidden bg-obsidian text-white md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col justify-center p-8 md:p-12">
        <p className="eyebrow eyebrow-light">Sponsored · {sponsor.name}</p>
        <h2 className="mt-4 font-serif text-3xl leading-tight md:text-[2.5rem]">{sponsor.headline}</h2>
        {sponsor.body && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">{sponsor.body}</p>}
        <a href={href} rel="sponsored" className="btn btn-gold mt-7 self-start">
          {sponsor.cta_label}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      <div className="relative min-h-[14rem] md:min-h-[20rem]">
        {sponsor.image_url ? (
          <img src={imageUrl(sponsor.image_url, 1200)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-85" />
        ) : (
          <div className="hero-poster hero-lines absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/20 to-transparent rtl:bg-gradient-to-l" />
      </div>
    </aside>
  );
}
