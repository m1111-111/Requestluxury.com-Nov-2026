'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { imageSrcSet, imageUrl } from '@/lib/images';

/** Editorial photo mosaic (up to five frames) with a full-screen lightbox for the whole set. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const { t } = usePreferences();
  const [active, setActive] = useState<number | null>(null);
  const count = images.length;

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (delta: number) => setActive((current) => (current === null ? current : (current + delta + count) % count)),
    [count],
  );

  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [active, close, step]);

  if (count === 0) {
    return <div className="hero-poster hero-lines flex aspect-[21/9] items-center justify-center font-serif text-2xl tracking-[0.2em] text-gold/70">PHOTOGRAPHY ON REQUEST</div>;
  }

  const frames = images.slice(0, 5);
  // Grid placement for 1–5 frames on a 4 × 2 grid.
  const layouts: Record<number, string[]> = {
    1: ['col-span-4 row-span-2'],
    2: ['col-span-2 row-span-2', 'col-span-2 row-span-2'],
    3: ['col-span-2 row-span-2', 'col-span-2', 'col-span-2'],
    4: ['col-span-2 row-span-2', 'col-span-2', 'col-span-1', 'col-span-1'],
    5: ['col-span-2 row-span-2', 'col-span-1', 'col-span-1', 'col-span-1', 'col-span-1'],
  };
  const layout = layouts[frames.length];

  return (
    <>
      {/* Desktop mosaic */}
      <div className="relative hidden h-[min(64vh,620px)] grid-cols-4 grid-rows-2 gap-2 md:grid">
        {frames.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Open photo ${index + 1} of ${count}`}
            className={`group relative overflow-hidden bg-graphite ${layout[index]}`}
          >
            <img
              src={imageUrl(src, index === 0 ? 1400 : 800)}
              srcSet={imageSrcSet(src, index === 0 ? [800, 1400, 2000] : [480, 800, 1200])}
              sizes={index === 0 ? '(min-width: 1320px) 660px, 50vw' : '(min-width: 1320px) 330px, 25vw'}
              alt={index === 0 ? title : `${title}, photo ${index + 1}`}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
            />
          </button>
        ))}
        <button type="button" onClick={() => setActive(0)} className="glass absolute bottom-4 end-4 inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] hover:border-gold">
          <Images aria-hidden="true" className="h-4 w-4" />
          {t('detail.photos')} ({count})
        </button>
      </div>

      {/* Mobile swipe gallery */}
      <div dir="ltr" className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 md:hidden">
        {images.map((src, index) => (
          <button key={src} type="button" onClick={() => setActive(index)} aria-label={`Open photo ${index + 1} of ${count}`} className="relative aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden bg-graphite">
            <img
              src={imageUrl(src, 900)}
              srcSet={imageSrcSet(src, [480, 900, 1400])}
              sizes="88vw"
              alt={index === 0 ? title : `${title}, photo ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover"
            />
            <span className="glass absolute bottom-3 end-3 px-2 py-1 text-[11px] font-semibold">
              {index + 1} / {count}
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {active !== null && (
        <div role="dialog" aria-modal="true" aria-label={`${title}: photo ${active + 1} of ${count}`} className="fixed inset-0 z-50 flex flex-col bg-obsidian/97 text-white">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {active + 1} / {count}
            </p>
            <button type="button" onClick={close} aria-label="Close gallery" autoFocus className="flex h-11 w-11 items-center justify-center hover:text-gold">
              <X aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 md:px-20">
            <img key={images[active]} src={imageUrl(images[active], 2000, 80)} alt={`${title}, photo ${active + 1}`} className="max-h-full max-w-full animate-fade-in object-contain" />
            {count > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="glass absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full hover:border-gold md:left-6">
                  <ChevronLeft aria-hidden="true" className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className="glass absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full hover:border-gold md:right-6">
                  <ChevronRight aria-hidden="true" className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          <div dir="ltr" className="scrollbar-none flex gap-2 overflow-x-auto px-5 pb-5">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === active}
                className={`h-16 w-24 shrink-0 overflow-hidden border ${index === active ? 'border-gold opacity-100' : 'border-transparent opacity-50 hover:opacity-90'}`}
              >
                <img src={imageUrl(src, 240, 60)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
