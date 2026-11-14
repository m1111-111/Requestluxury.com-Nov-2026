'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gavel, Heart, Menu, X } from 'lucide-react';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import { CONCIERGE_SERVICES } from '@/lib/concierge';
import { VERTICALS } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n';
import { useSaved } from '@/lib/saved';
import { Logo } from './Logo';

export function Header() {
  const { t } = usePreferences();
  const pathname = usePathname();
  const { ids } = useSaved();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menus after navigation.
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setDropdownOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const services = CONCIERGE_SERVICES.filter((service) => service.inNav);
  const linkClass = (active: boolean) =>
    `relative whitespace-nowrap py-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] transition-colors hover:text-gold-deep ${
      active ? 'text-gold-deep' : 'text-charcoal'
    }`;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-sand bg-alabaster/92 backdrop-blur-md">
      <div className="container-rl flex h-[4.5rem] items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Marketplace" className="hidden items-center gap-6 xl:flex">
          {VERTICALS.map((vertical) => (
            <Link key={vertical.slug} href={`/${vertical.slug}`} className={linkClass(pathname === `/${vertical.slug}`)}>
              {t(`nav.${vertical.slug}` as TranslationKey)}
            </Link>
          ))}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              onClick={() => setDropdownOpen((open) => !open)}
              className={`${linkClass(pathname.startsWith('/concierge') || pathname.startsWith('/journal'))} inline-flex items-center gap-1.5`}
            >
              {t('nav.concierge_journal')}
              <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="absolute end-0 top-full mt-3 w-[34rem] animate-fade-in border border-sand bg-white p-6 shadow-float">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  <div>
                    <p className="eyebrow mb-3">{t('nav.concierge')}</p>
                    {services.map((service) => (
                      <Link
                        key={service.slug}
                        href={`/concierge/${service.slug}`}
                        className="block py-1.5 text-sm text-charcoal hover:text-gold-deep"
                      >
                        {service.navLabel}
                      </Link>
                    ))}
                  </div>
                  <div>
                    <p className="eyebrow mb-3">{t('nav.journal')}</p>
                    <Link href="/journal" className="block py-1.5 text-sm text-charcoal hover:text-gold-deep">
                      The RequestLuxury Journal
                    </Link>
                    <Link href="/buyer-protection" className="block py-1.5 text-sm text-charcoal hover:text-gold-deep">
                      12-Month Buyer Protection
                    </Link>
                    <Link href="/concierge" className="block py-1.5 text-sm text-charcoal hover:text-gold-deep">
                      All concierge services
                    </Link>
                    <Link href="/contact" className="block py-1.5 text-sm text-charcoal hover:text-gold-deep">
                      Speak to the concierge desk
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/auctions"
            className="hidden items-center gap-2 px-2 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-charcoal hover:text-gold-deep md:inline-flex"
          >
            <Gavel aria-hidden="true" className="h-4 w-4 text-gold-deep" />
            <span className="whitespace-nowrap xl:sr-only 2xl:not-sr-only">{t('nav.auctions')}</span>
          </Link>
          <Link href="/saved" aria-label={t('nav.saved')} className="relative flex h-11 w-11 items-center justify-center text-charcoal hover:text-gold-deep">
            <Heart aria-hidden="true" className="h-5 w-5" />
            {ids.length > 0 && (
              <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center bg-gold px-1 text-[10px] font-bold text-obsidian">
                {ids.length}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label={t('nav.menu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center text-charcoal xl:hidden"
          >
            {menuOpen ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[7rem] z-40 overflow-y-auto border-t border-sand bg-alabaster xl:hidden">
          <nav aria-label="Mobile" className="container-rl py-6">
            <p className="eyebrow mb-2">{t('footer.marketplace')}</p>
            {VERTICALS.map((vertical) => (
              <Link key={vertical.slug} href={`/${vertical.slug}`} className="block border-b border-sand py-3.5 font-serif text-2xl text-obsidian">
                {t(`nav.${vertical.slug}` as TranslationKey)}
              </Link>
            ))}
            <Link href="/auctions" className="block border-b border-sand py-3.5 font-serif text-2xl text-obsidian">
              {t('nav.auctions')}
            </Link>
            <p className="eyebrow mb-2 mt-8">{t('nav.concierge_journal')}</p>
            {services.map((service) => (
              <Link key={service.slug} href={`/concierge/${service.slug}`} className="block py-2.5 text-[15px] text-charcoal">
                {service.navLabel}
              </Link>
            ))}
            <Link href="/journal" className="block py-2.5 text-[15px] text-charcoal">
              {t('nav.journal')}
            </Link>
            <Link href="/sell-with-us" className="btn btn-dark mt-8 w-full">
              {t('nav.sell')}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
