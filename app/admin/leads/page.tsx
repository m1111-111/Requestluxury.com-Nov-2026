import { LeadsManager } from '@/components/admin/LeadsManager';
import { requireAdmin } from '@/lib/auth';
import type { Lead, ManagedDealer, ReferralDeal } from '@/types';

export const metadata = { title: 'Leads & deals' };

export default async function AdminLeadsPage() {
  const { supabase } = await requireAdmin('/admin/leads');
  const [{ data: leads }, { data: deals }, { data: dealers }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, listing:listings(id,title,slug,vertical,public_price_usd)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('referral_deals').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.rpc('manage_dealers').order('company_name'),
  ]);
  return (
    <LeadsManager
      leads={(leads ?? []) as unknown as Lead[]}
      deals={(deals ?? []) as ReferralDeal[]}
      dealers={((dealers ?? []) as ManagedDealer[]).map((dealer) => ({ id: dealer.id, company_name: dealer.company_name, status: dealer.status }))}
    />
  );
}
