import { BuyersManager } from '@/components/admin/BuyersManager';
import { requireAdmin } from '@/lib/auth';
import type { Profile } from '@/types';

export const metadata = { title: 'Buyers' };

export default async function AdminBuyersPage() {
  const { supabase } = await requireAdmin('/admin/buyers');
  const { data } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,is_verified_buyer,created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  return <BuyersManager profiles={(data ?? []) as Profile[]} />;
}
