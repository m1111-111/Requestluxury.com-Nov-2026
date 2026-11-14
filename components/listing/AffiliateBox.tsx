import Link from 'next/link';
import { ArrowUpRight, Landmark, Plane, Umbrella } from 'lucide-react';
import { AFFILIATES } from '@/lib/concierge';
import type { Vertical } from '@/types';

/** Contextual concierge offers shown under the contact card, ordered by what matters for the asset. */
export function AffiliateBox({ vertical }: { vertical: Vertical }) {
  const jet = {
    key: 'jet',
    icon: Plane,
    title: 'Fly private via Villiers Jets',
    text: 'Charter a jet to the viewing. Compare aircraft and prices in minutes.',
    href: AFFILIATES.villiersJets,
    external: true,
  };
  const fx = {
    key: 'fx',
    icon: Landmark,
    title: 'Save up to 2% on international FX wires',
    text: 'Compare a specialist rate against your bank before you transfer.',
    href: '/concierge/fx-transfers',
    external: false,
  };
  const insurance = {
    key: 'insurance',
    icon: Umbrella,
    title: 'Specialist asset insurance',
    text: 'Agreed-value cover in place from the moment of purchase.',
    href: '/concierge/asset-insurance',
    external: false,
  };

  const order =
    vertical === 'residences' ? [fx, jet, insurance] : vertical === 'horology' || vertical === 'jewelry' ? [insurance, fx, jet] : [jet, fx, insurance];

  return (
    <aside aria-label="Concierge services" className="border border-sand bg-ivory">
      <p className="eyebrow border-b border-sand px-5 py-3.5">Concierge for this purchase</p>
      <ul>
        {order.map(({ key, icon: Icon, title, text, href, external }) => {
          const content = (
            <>
              <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-obsidian group-hover:text-gold-deep">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-stone">{text}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-stone group-hover:text-gold-deep" />
            </>
          );
          return (
            <li key={key} className="border-b border-sand last:border-b-0">
              {external ? (
                <a href={href} target="_blank" rel="sponsored noopener noreferrer" className="group flex gap-3.5 px-5 py-4">
                  {content}
                </a>
              ) : (
                <Link href={href} className="group flex gap-3.5 px-5 py-4">
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-sand px-5 py-3 text-[11px] leading-relaxed text-stone">
        Partner services. RequestLuxury may receive a referral fee, at no cost to you.
      </p>
    </aside>
  );
}
