import { ListingsManager } from '@/components/admin/ListingsManager';
import { requireAdmin } from '@/lib/auth';
import type { ManagedDealer, ManagedListing } from '@/types';

export const metadata = { title: 'Listings' };

export default async function AdminListingsPage() {
  const { supabase } = await requireAdmin('/admin/listings');
  const [{ data: listings }, { data: dealers }] = await Promise.all([
    supabase.rpc('manage_listings').order('updated_at', { ascending: false }).limit(1000),
    supabase.rpc('manage_dealers').order('company_name'),
  ]);
  return (
    <ListingsManager
      listings={(listings ?? []) as ManagedListing[]}
      dealers={((dealers ?? []) as ManagedDealer[]).map((dealer) => ({ id: dealer.id, company_name: dealer.company_name }))}
    />
  );
}
