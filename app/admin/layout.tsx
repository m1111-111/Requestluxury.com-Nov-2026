import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { Logo } from '@/components/layout/Logo';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · RequestLuxury Admin' },
  robots: { index: false, follow: false },
};

interface Overview {
  listings_pending: number;
  dealers_pending: number;
  leads_new: number;
  buyers_unverified: number;
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // middleware.ts already guards /admin; this is the second check, at the data layer.
  const { supabase, user } = await requireAdmin('/admin');
  const { data } = await supabase.rpc('admin_overview');
  const overview = (data ?? {}) as Partial<Overview>;

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-obsidian text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-5 lg:block">
          <Logo tone="light" compact />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45 lg:mt-3">Moderation backend</p>
        </div>
        <AdminNav
          counts={{
            '/admin/listings': overview.listings_pending ?? 0,
            '/admin/dealers': overview.dealers_pending ?? 0,
            '/admin/leads': overview.leads_new ?? 0,
          }}
        />
        <p className="hidden break-all px-4 py-4 text-xs text-white/40 lg:block">{user.email}</p>
      </aside>
      <main className="min-w-0 p-5 md:p-8 lg:p-10">{children}</main>
    </div>
  );
}
