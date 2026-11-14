'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, Search } from 'lucide-react';
import { setBuyerVerified } from '@/app/admin/actions';
import { formatDate } from '@/lib/format';
import type { Profile } from '@/types';
import { NoticeBar, useAdminAction } from './useAdminAction';

/** Members and bidder verification: only verified buyers can bid or open "verified" deal-room documents. */
export function BuyersManager({ profiles }: { profiles: Profile[] }) {
  const [query, setQuery] = useState('');
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const { pending, notice, setNotice, run } = useAdminAction();

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (onlyUnverified && profile.is_verified_buyer) return false;
      return !term || `${profile.email} ${profile.full_name ?? ''}`.toLowerCase().includes(term);
    });
  }, [profiles, query, onlyUnverified]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Bidder verification</p>
        <h1 className="mt-2 font-serif text-4xl text-obsidian md:text-5xl">Buyers</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone">
          Verify a member once you are satisfied about their identity and funds. Verified buyers can bid in auctions and open deal-room documents marked “verified
          buyers only”.
        </p>
      </div>
      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <input type="search" aria-label="Find a member" placeholder="Find by name or email…" value={query} onChange={(event) => setQuery(event.target.value)} className="input !min-h-10 ps-10 !py-2" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyUnverified} onChange={(event) => setOnlyUnverified(event.target.checked)} className="h-4 w-4 accent-[#8a6d2f]" />
          Awaiting verification only
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-sand bg-white px-6 py-14 text-center text-sm text-stone">No members match.</p>
      ) : (
        <div className="overflow-x-auto border border-sand bg-white">
          <table className="table-rl">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Bidding</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <span className="block font-semibold text-obsidian">{profile.full_name || 'Name not given'}</span>
                    <a href={`mailto:${profile.email}`} className="text-xs text-gold-deep underline underline-offset-2">
                      {profile.email}
                    </a>
                  </td>
                  <td className="capitalize">{profile.role}</td>
                  <td className="whitespace-nowrap text-stone">{formatDate(profile.created_at)}</td>
                  <td>
                    {profile.is_verified_buyer ? (
                      <span className="chip chip-green">
                        <BadgeCheck aria-hidden="true" className="me-1 h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="chip">Not verified</span>
                    )}
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => setBuyerVerified(profile.id, !profile.is_verified_buyer))}
                      className={`btn btn-sm ${profile.is_verified_buyer ? 'btn-outline' : 'btn-gold'}`}
                    >
                      {profile.is_verified_buyer ? 'Remove verification' : 'Verify buyer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
