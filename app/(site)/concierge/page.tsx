import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CONCIERGE_SERVICES } from '@/lib/concierge';
import { imageUrl } from '@/lib/images';

export const metadata: Metadata = {
  title: 'Private Concierge: Charter, Sourcing, Education, FX & Residency',
  description:
    'One desk for everything around the purchase: private jet and yacht charter, bespoke asset sourcing, Swiss finishing schools, Executive MBAs, FX transfers, golden visas and specialist insurance.',
  alternates: { canonical: '/concierge' },
};

export default function ConciergePage() {
  return (
    <>
      <section className="bg-obsidian text-white">
        <div className="container-rl py-20 md:py-28">
          <p className="eyebrow eyebrow-light">Private concierge</p>
          <h1 className="display mt-5 max-w-4xl text-5xl md:text-7xl">Everything around the purchase, arranged by one desk</h1>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            Travel to the viewing, move the funds, insure the asset, settle the family. Tell us what you need and a specialist replies personally.
          </p>
        </div>
      </section>
      <section className="container-rl grid gap-6 py-16 sm:grid-cols-2 md:py-24 lg:grid-cols-3">
        {CONCIERGE_SERVICES.map((service) => (
          <Link key={service.slug} href={`/concierge/${service.slug}`} className="group flex flex-col bg-white shadow-card transition-shadow duration-500 hover:shadow-float">
            <div className="aspect-[16/10] overflow-hidden bg-graphite">
              <img src={imageUrl(service.image, 800)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
            </div>
            <div className="flex flex-1 flex-col p-7">
              <p className="eyebrow">{service.eyebrow}</p>
              <h2 className="mt-3 font-serif text-[1.75rem] leading-tight text-obsidian">{service.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone">{service.summary}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">
                Enquire
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
