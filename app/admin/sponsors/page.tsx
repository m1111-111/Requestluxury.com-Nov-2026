import { SponsorsManager } from '@/components/admin/SponsorsManager';
import { requireAdmin } from '@/lib/auth';
import { SITE } from '@/lib/constants';
import type { ManagedSponsor, SponsorCount, SponsorReport } from '@/types';

export const metadata = { title: 'Sponsors' };

export default async function AdminSponsorsPage() {
  const { supabase } = await requireAdmin('/admin/sponsors');
  const { data } = await supabase.rpc('admin_sponsors').order('created_at', { ascending: false });
  const sponsors = (data ?? []) as ManagedSponsor[];

  const stats: Record<string, SponsorCount> = {};
  await Promise.all(
    sponsors.map(async (sponsor) => {
      const { data: report } = await supabase.rpc('sponsor_report', { p_slug: sponsor.slug, p_key: sponsor.report_key });
      stats[sponsor.id] = (report as SponsorReport | null)?.totals ?? { impressions: 0, clicks: 0 };
    }),
  );

  return <SponsorsManager sponsors={sponsors} stats={stats} siteUrl={SITE.url} />;
}
