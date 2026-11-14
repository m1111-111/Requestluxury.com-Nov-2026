import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { SITE } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { JOURNAL, getArticle } from '@/lib/journal';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return JOURNAL.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/journal/${article.slug}` },
    openGraph: {
      type: 'article',
      title: `${article.title} · ${SITE.name}`,
      description: article.excerpt,
      url: `${SITE.url}/journal/${article.slug}`,
      publishedTime: article.publishedAt,
      images: [{ url: imageUrl(article.image, 1200), width: 1200, alt: article.title }],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    image: imageUrl(article.image, 1200),
    author: { '@type': 'Organization', name: SITE.name },
    publisher: { '@type': 'Organization', name: SITE.name },
    mainEntityOfPage: `${SITE.url}/journal/${article.slug}`,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <header className="container-rl max-w-4xl pt-12 md:pt-16">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone">
          <Link href="/journal" className="hover:text-gold-deep">
            Journal
          </Link>
          <ChevronRight aria-hidden="true" className="h-3 w-3 rtl:rotate-180" />
          <span>{article.category}</span>
        </nav>
        <h1 className="display mt-6 text-4xl text-obsidian md:text-6xl">{article.title}</h1>
        <p className="mt-5 text-sm text-stone">
          {formatDate(article.publishedAt)} · {article.readMinutes} min read · RequestLuxury Concierge
        </p>
      </header>
      <div className="container-rl mt-10 max-w-5xl">
        <img src={imageUrl(article.image, 1600)} alt="" fetchPriority="high" className="aspect-[21/9] w-full object-cover" />
      </div>
      <div className="prose-rl container-rl max-w-3xl py-12 text-[1.06rem] md:py-16">
        <p className="font-serif text-2xl leading-snug text-obsidian">{article.excerpt}</p>
        {article.sections.map((section, index) => (
          <section key={section.heading ?? index}>
            {section.heading && <h2>{section.heading}</h2>}
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </section>
        ))}
        <div className="mt-12 border-t border-sand pt-8">
          <p className="text-sm text-stone">This article is general information, not legal, tax or financial advice.</p>
          <Link href="/contact" className="btn btn-dark mt-6 !text-gold !no-underline">
            Ask the concierge desk
          </Link>
        </div>
      </div>
    </article>
  );
}
