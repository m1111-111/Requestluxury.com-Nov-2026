import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { Payment } from '@/types';

export const metadata = { title: 'Overview' };

interface Overview {
  listings_pending: number;
  listings_approved: number;
  dealers_pending: number;
  dealers_approved: number;
  leads_new: number;
  leads_total: number;
  buyers_unverified: number;
  sponsors_active: number;
  deals_open: number;
  payments_paid_30d: number;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin('/admin');
  const [{ data: overviewData }, { data: paymentData }] = await Promise.all([
    supabase.rpc('admin_overview'),
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(12),
  ]);
  const overview = (overviewData ?? {}) as Partial<Overview>;
  const payments = (paymentData ?? []) as Payment[];

  const tiles = [
    { label: 'Listings awaiting review', value: overview.listings_pending ?? 0, href: '/admin/listings', hint: `${overview.listings_approved ?? 0} live`, urgent: true },
    { label: 'Dealer applications', value: overview.dealers_pending ?? 0, href: '/admin/dealers', hint: `${overview.dealers_approved ?? 0} approved partners`, urgent: true },
    { label: 'New leads', value: overview.leads_new ?? 0, href: '/admin/leads', hint: `${overview.leads_total ?? 0} in total`, urgent: true },
    { label: 'Open referral deals', value: overview.deals_open ?? 0, href: '/admin/leads#deals', hint: 'Pending or invoiced' },
    { label: 'Buyers to verify', value: overview.buyers_unverified ?? 0, href: '/admin/buyers', hint: 'Unverified members' },
    { label: 'Active sponsors', value: overview.sponsors_active ?? 0, href: '/admin/sponsors', hint: `${overview.payments_paid_30d ?? 0} payments in 30 days` },
  ];

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-serif text-4xl text-obsidian md:text-5xl">Overview</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="group border border-sand bg-white p-6 transition-shadow hover:shadow-card">
            <p className="label">{tile.label}</p>
            <p className={`mt-2 font-serif text-5xl ${tile.urgent && tile.value > 0 ? 'text-gold-deep' : 'text-obsidian'}`}>{tile.value}</p>
            <p className="mt-3 flex items-center justify-between text-xs text-stone">
              {tile.hint}
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </p>
          </Link>
        ))}
      </div>

      <section className="mt-10 border border-sand bg-white">
        <h2 className="border-b border-sand px-6 py-4 font-serif text-2xl text-obsidian">Recent Stripe payments</h2>
        {payments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-stone">
            No payments recorded yet. Payments appear here once the Stripe webhook is connected (see DEPLOYMENT_GUIDE.md, step 4).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-rl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap">{formatDate(payment.created_at, true)}</td>
                    <td className="capitalize">{payment.kind.replace(/_/g, ' ')}</td>
                    <td>{payment.buyer_email ?? '—'}</td>
                    <td>{payment.lead_reference_code ?? '—'}</td>
                    <td className="whitespace-nowrap font-semibold">{money(Number(payment.amount_total), payment.currency)}</td>
                    <td>
                      <span className={`chip ${payment.status === 'paid' ? 'chip-green' : payment.status === 'pending' ? 'chip-gold' : 'chip-red'}`}>{payment.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
