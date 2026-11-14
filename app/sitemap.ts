import type { MetadataRoute } from 'next';
import { CONCIERGE_SERVICES } from '@/lib/concierge';
import { SITE, VERTICALS } from '@/lib/constants';
import { getSitemapListings } from '@/lib/data';
import { JOURNAL } from '@/lib/journal';

export const revalidate = 3600;

/** Dynamic sitemap: static pages, the six verticals, concierge services, journal articles and every approved listing. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const url = (path: string) => `${SITE.url}${path}`;

  const pages: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: url('/auctions'), lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: url('/sell-with-us'), lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: url('/concierge'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: url('/journal'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/buyer-protection'), lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: url('/contact'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: url('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: url('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const verticals: MetadataRoute.Sitemap = VERTICALS.map((vertical) => ({
    url: url(`/${vertical.slug}`),
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const services: MetadataRoute.Sitemap = CONCIERGE_SERVICES.map((service) => ({
    url: url(`/concierge/${service.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const articles: MetadataRoute.Sitemap = JOURNAL.map((article) => ({
    url: url(`/journal/${article.slug}`),
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'yearly',
    priority: 0.5,
  }));

  const listings: MetadataRoute.Sitemap = (await getSitemapListings()).map((listing) => ({
    url: url(`/listing/${listing.slug}`),
    lastModified: new Date(listing.updated_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...pages, ...verticals, ...services, ...articles, ...listings];
}
