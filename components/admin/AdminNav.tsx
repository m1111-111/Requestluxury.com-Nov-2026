'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ExternalLink, Inbox, LayoutDashboard, ListChecks, LogOut, Megaphone, UserCheck } from 'lucide-react';

const ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/listings', label: 'Listings', icon: ListChecks },
  { href: '/admin/dealers', label: 'Dealers', icon: Building2 },
  { href: '/admin/leads', label: 'Leads & deals', icon: Inbox },
  { href: '/admin/sponsors', label: 'Sponsors', icon: Megaphone },
  { href: '/admin/buyers', label: 'Buyers', icon: UserCheck },
];

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const count = counts[href] ?? 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-3 px-4 py-3 text-sm transition-colors ${
              active ? 'bg-white/10 text-gold' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            <span className="flex-1 whitespace-nowrap">{label}</span>
            {count > 0 && <span className="bg-gold px-1.5 py-0.5 text-[10px] font-bold leading-none text-obsidian">{count}</span>}
          </Link>
        );
      })}
      <div className="hidden lg:mt-6 lg:block lg:border-t lg:border-white/10 lg:pt-4">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white">
          <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} /> View site
        </Link>
        <form action="/auth/sign-out" method="post">
          <button type="submit" className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm text-white/70 hover:text-white">
            <LogOut aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} /> Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
