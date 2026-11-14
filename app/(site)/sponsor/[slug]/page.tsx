import type { Metadata } from 'next';
import { Eye, MousePointerClick, Percent } from 'lucide-react';
import { getSponsorReport } from '@/lib/data';
import { formatDate, formatNumber } from '@/lib/format';
import type { SponsorCount } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sponsor performance report',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function ctr(count: SponsorCount): string {
  return count.impressions > 0 ? `${((count.clicks / count.impressions) * 100).toFixed(2)}%` : '0.00%';
}

function countryName(code: string): string {
  if (code === 'ZZ') return 'Unknown';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default async function SponsorReportPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { key } = await searchParams;
  const report = await getSponsorReport(slug, typeof key === 'string' && /^[a-f0-9]{16,64}$/.test(key) ? key : null);

  if (!report) {
    return (
      <section className="container-rl flex min-h-[60vh] items-center justify-center py-20">
        <div className="max-w-md text-center">
          <p className="eyebrow">Private report</p>
          <h1 className="display mt-4 text-4xl">This report needs its access key</h1>
          <p className="mt-5 text-sm leading-relaxed text-stone">
            Sponsor reports open from the private link sent by your account manager. Paste the key from that link below.
          </p>
          <form method="get" className="mt-8 flex gap-2">
            <label className="sr-only" htmlFor="report-key">
              Access key
            </label>
            <input id="report-key" name="key" required pattern="[a-f0-9]{16,64}" autoComplete="off" placeholder="Access key" className="input" />
            <button type="submit" className="btn btn-dark shrink-0">
              Open
            </button>
          </form>
        </div>
      </section>
    );
  }

  const maxDay = Math.max(1, ...report.by_day.map((day) => day.impressions));
  const tiles = [
    { label: 'Impressions', value: formatNumber(report.totals.impressions), sub: `${formatNumber(report.last_30_days.impressions)} in the last 30 days`, icon: Eye },
    { label: 'Clicks', value: formatNumber(report.totals.clicks), sub: `${formatNumber(report.last_30_days.clicks)} in the last 30 days`, icon: MousePointerClick },
    { label: 'Click-through rate', value: ctr(report.totals), sub: `${ctr(report.last_30_days)} in the last 30 days`, icon: Percent },
  ];

  return (
    <section className="container-rl py-14 md:py-20">
      <p className="eyebrow">Sponsor performance report</p>
      <h1 className="display mt-4 text-4xl md:text-6xl">{report.sponsor.name}</h1>
      <p className="mt-4 max-w-2xl text-[15px] text-stone">
        “{report.sponsor.headline}” · {report.sponsor.is_active ? 'Live' : 'Paused'} since {formatDate(report.sponsor.created_at)} ·{' '}
        {report.sponsor.verticals.length > 0 ? report.sponsor.verticals.join(', ') : 'all placements'}
      </p>

      <div className="mt-10 grid gap-px border border-sand bg-sand md:grid-cols-3">
        {tiles.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="bg-white p-7">
            <div className="flex items-center justify-between">
              <p className="label !mb-0">{label}</p>
              <Icon aria-hidden="true" className="h-5 w-5 text-gold-deep" strokeWidth={1.5} />
            </div>
            <p className="mt-4 font-serif text-5xl text-obsidian">{value}</p>
            <p className="mt-2 text-xs text-stone">{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 border border-sand bg-white p-7">
        <h2 className="font-serif text-2xl text-obsidian">Daily impressions, last 30 days</h2>
        <div role="img" aria-label="Bar chart of daily impressions over the last 30 days" className="mt-6 flex h-44 items-end gap-1">
          {report.by_day.map((day) => (
            <div key={day.day} title={`${day.day}: ${day.impressions} impressions, ${day.clicks} clicks`} className="group relative flex h-full flex-1 items-end">
              <div className="w-full bg-gold/70 transition-colors group-hover:bg-gold-deep" style={{ height: `${Math.max(day.impressions > 0 ? 3 : 0, (day.impressions / maxDay) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-stone">
          <span>{report.by_day[0]?.day}</span>
          <span>{report.by_day[report.by_day.length - 1]?.day}</span>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <div className="border border-sand bg-white">
          <h2 className="border-b border-sand px-7 py-5 font-serif text-2xl text-obsidian">Visitors by country</h2>
          {report.by_country.length === 0 ? (
            <p className="px-7 py-8 text-sm text-stone">No impressions have been recorded yet.</p>
          ) : (
            <table className="table-rl">
              <thead>
                <tr>
                  <th className="!ps-7">Country</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                </tr>
              </thead>
              <tbody>
                {report.by_country.map((row) => (
                  <tr key={row.country}>
                    <td className="!ps-7">{countryName(row.country)}</td>
                    <td>{formatNumber(row.impressions)}</td>
                    <td>{formatNumber(row.clicks)}</td>
                    <td>{ctr(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border border-sand bg-white">
          <h2 className="border-b border-sand px-7 py-5 font-serif text-2xl text-obsidian">By placement</h2>
          {report.by_vertical.length === 0 ? (
            <p className="px-7 py-8 text-sm text-stone">No impressions have been recorded yet.</p>
          ) : (
            <table className="table-rl">
              <thead>
                <tr>
                  <th className="!ps-7">Placement</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                </tr>
              </thead>
              <tbody>
                {report.by_vertical.map((row) => (
                  <tr key={row.vertical}>
                    <td className="!ps-7 capitalize">{row.vertical}</td>
                    <td>{formatNumber(row.impressions)}</td>
                    <td>{formatNumber(row.clicks)}</td>
                    <td>{ctr(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p className="mt-8 text-xs text-stone">
        Figures update in real time. An impression is counted once per page view when at least half of the banner is on screen. Country is taken from the visitor&apos;s
        network location.
      </p>
    </section>
  );
}
