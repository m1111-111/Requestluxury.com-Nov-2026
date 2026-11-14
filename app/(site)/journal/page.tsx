import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { JOURNAL } from '@/lib/journal';

export const metadata: Metadata = {
  title: 'The Journal: Guides to Buying, Bidding & Owning',
  description: 'Plain-spoken guides from the RequestLuxury concierge desk on private sales, auctions, fees and due diligence.',
  alternates: { canonical: '/journal' },
};

export default function JournalPage() {
  const [lead, ...rest] = JOURNAL;
  return (
    <section className="container-rl py-16 md:py-24">
      <p className="eyebrow">The Journal</p>
      <h1 className="display mt-4 text-5xl md:text-7xl">Notes from the concierge desk</h1>

      <Link href={`/journal/${lead.slug}`} className="group mt-14 grid overflow-hidden bg-white shadow-card md:grid-cols-2">
        <div className="aspect-[16/10] overflow-hidden bg-graphite md:aspect-auto">
          <img src={imageUrl(lead.image, 1200)} alt="" fetchPriority="high" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
        </div>
        <div className="flex flex-col justify-center p-8 md:p-12">
          <p className="eyebrow">
            {lead.category} · {lead.readMinutes} min read
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-obsidian group-hover:text-gold-deep">{lead.title}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-stone">{lead.excerpt}</p>
          <p className="mt-6 text-xs text-stone">{formatDate(lead.publishedAt)}</p>
        </div>
      </Link>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {rest.map((article) => (
          <Link key={article.slug} href={`/journal/${article.slug}`} className="group flex flex-col bg-white shadow-card">
            <div className="aspect-[16/9] overflow-hidden bg-graphite">
              <img src={imageUrl(article.image, 900)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
            </div>
            <div className="p-8">
              <p className="eyebrow">
                {article.category} · {article.readMinutes} min read
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-obsidian group-hover:text-gold-deep">{article.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-stone">{article.excerpt}</p>
              <p className="mt-5 text-xs text-stone">{formatDate(article.publishedAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
