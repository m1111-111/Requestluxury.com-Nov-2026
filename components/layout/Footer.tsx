import Link from 'next/link';
import { T } from '@/components/ui/T';
import { CONCIERGE_SERVICES } from '@/lib/concierge';
import { SITE, VERTICALS } from '@/lib/constants';
import type { TranslationKey } from '@/lib/i18n';
import { Logo } from './Logo';

export function Footer() {
  const year = new Date().getUTCFullYear();
  const link = 'block py-1.5 text-sm text-white/70 transition-colors hover:text-gold';
  return (
    <footer className="no-print bg-obsidian text-white">
      <div className="container-rl grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/65">
            <T k="footer.blurb" />
          </p>
          <a href={`mailto:${SITE.conciergeEmail}`} className="mt-6 inline-block text-sm text-gold hover:text-gold-light">
            {SITE.conciergeEmail}
          </a>
        </div>
        <nav aria-label="Marketplace">
          <p className="eyebrow eyebrow-light mb-4">
            <T k="footer.marketplace" />
          </p>
          {VERTICALS.map((vertical) => (
            <Link key={vertical.slug} href={`/${vertical.slug}`} className={link}>
              <T k={`nav.${vertical.slug}` as TranslationKey} />
            </Link>
          ))}
          <Link href="/auctions" className={link}>
            <T k="nav.auctions" />
          </Link>
        </nav>
        <nav aria-label="Concierge">
          <p className="eyebrow eyebrow-light mb-4">
            <T k="nav.concierge" />
          </p>
          {CONCIERGE_SERVICES.map((service) => (
            <Link key={service.slug} href={`/concierge/${service.slug}`} className={link}>
              {service.navLabel}
            </Link>
          ))}
        </nav>
        <nav aria-label="Company">
          <p className="eyebrow eyebrow-light mb-4">
            <T k="footer.company" />
          </p>
          <Link href="/sell-with-us" className={link}>
            <T k="nav.sell" />
          </Link>
          <Link href="/journal" className={link}>
            <T k="nav.journal" />
          </Link>
          <Link href="/buyer-protection" className={link}>
            <T k="footer.protection" />
          </Link>
          <Link href="/contact" className={link}>
            <T k="footer.contact" />
          </Link>
          <Link href="/terms" className={link}>
            <T k="footer.terms" />
          </Link>
          <Link href="/privacy" className={link}>
            <T k="footer.privacy" />
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="container-rl flex flex-col gap-2 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} RequestLuxury. <T k="footer.rights" />
          </p>
          <p>Prices are shown in your chosen currency at indicative rates. Listings marked “Showcase” are illustrative.</p>
        </div>
      </div>
    </footer>
  );
}
