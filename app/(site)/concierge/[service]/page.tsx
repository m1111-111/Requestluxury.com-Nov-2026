import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { LeadForm } from '@/components/forms/LeadForm';
import { AFFILIATES, CONCIERGE_SERVICES, getConciergeService } from '@/lib/concierge';
import { SITE } from '@/lib/constants';
import { imageUrl } from '@/lib/images';

interface PageProps {
  params: Promise<{ service: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return CONCIERGE_SERVICES.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service: slug } = await params;
  const service = getConciergeService(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.summary,
    alternates: { canonical: `/concierge/${service.slug}` },
    openGraph: {
      title: `${service.title} · ${SITE.name}`,
      description: service.summary,
      url: `${SITE.url}/concierge/${service.slug}`,
      images: [{ url: imageUrl(service.image, 1200), width: 1200, alt: service.title }],
    },
  };
}

export default async function ConciergeServicePage({ params }: PageProps) {
  const { service: slug } = await params;
  const service = getConciergeService(slug);
  if (!service) notFound();

  const partner =
    service.slug === 'private-jet-charter'
      ? { label: 'Compare aircraft on Villiers Jets', href: AFFILIATES.villiersJets }
      : service.slug === 'yacht-charter' && AFFILIATES.yachtCharter
        ? { label: 'Browse yachts with our charter partner', href: AFFILIATES.yachtCharter }
        : null;

  const onward = partner ? (
    <a href={partner.href} target="_blank" rel="sponsored noopener noreferrer" className="btn btn-gold w-full">
      {partner.label}
      <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
    </a>
  ) : null;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-obsidian text-white">
        <img src={imageUrl(service.image, 1800, 60)} alt="" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-40" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-obsidian via-obsidian/65 to-obsidian/45" />
        <div className="container-rl py-20 md:py-28">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/60">
            <Link href="/concierge" className="hover:text-gold">
              Concierge
            </Link>
            <ChevronRight aria-hidden="true" className="h-3 w-3 rtl:rotate-180" />
            <span aria-current="page">{service.navLabel}</span>
          </nav>
          <p className="eyebrow eyebrow-light mt-8">{service.eyebrow}</p>
          <h1 className="display mt-4 max-w-4xl text-5xl md:text-7xl">{service.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">{service.summary}</p>
        </div>
      </section>

      <section className="container-rl grid gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
        <div>
          <div className="prose-rl max-w-2xl text-[1.05rem]">
            {service.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-12 grid gap-px border border-sand bg-sand sm:grid-cols-3">
            {service.highlights.map((highlight) => (
              <div key={highlight.title} className="bg-white p-6">
                <h2 className="font-serif text-2xl leading-tight text-obsidian">{highlight.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-stone">{highlight.text}</p>
              </div>
            ))}
          </div>
          {service.disclosure && <p className="mt-8 max-w-2xl text-xs leading-relaxed text-stone">{service.disclosure}</p>}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-sand bg-white p-6 shadow-card md:p-8">
            <p className="eyebrow">Request this service</p>
            <h2 className="mb-6 mt-2 font-serif text-3xl text-obsidian">Tell us what you need</h2>
            <LeadForm
              leadType={service.leadType}
              fields={service.fields}
              metadata={{ service: service.slug, source: 'concierge-page' }}
              messageLabel={service.messageLabel}
              messagePlaceholder={service.messagePlaceholder}
              afterSuccess={onward}
            />
          </div>
        </aside>
      </section>
    </>
  );
}
