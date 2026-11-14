import { DealersManager } from '@/components/admin/DealersManager';
import { requireAdmin } from '@/lib/auth';
import type { ManagedDealer } from '@/types';

export const metadata = { title: 'Dealers' };

export default async function AdminDealersPage() {
  const { supabase } = await requireAdmin('/admin/dealers');
  const [{ data: dealers }, { data: listings }] = await Promise.all([
    supabase.rpc('manage_dealers').order('created_at', { ascending: false }),
    supabase.rpc('manage_listings').select('dealer_id').limit(5000),
  ]);
  const listingCounts: Record<string, number> = {};
  for (const row of (listings ?? []) as Array<{ dealer_id: string | null }>) {
    if (row.dealer_id) listingCounts[row.dealer_id] = (listingCounts[row.dealer_id] ?? 0) + 1;
  }
  const order = { pending_review: 0, approved: 1, suspended: 2 } as const;
  const sorted = ((dealers ?? []) as ManagedDealer[]).sort((a, b) => order[a.status] - order[b.status]);
  return <DealersManager dealers={sorted} listingCounts={listingCounts} />;
}
