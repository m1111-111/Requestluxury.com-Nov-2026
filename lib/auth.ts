import { redirect } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { createServerSupabase } from './supabase/server';

export interface SessionContext {
  supabase: SupabaseClient;
  user: User;
  profile: Profile | null;
}

/** The signed-in member, or null. Always verified against Supabase Auth. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,is_verified_buyer,created_at')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, user, profile: (profile as Profile | null) ?? null };
}

export async function requireUser(nextPath: string): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}&reason=auth`);
  return context;
}

/** Second line of defence behind middleware.ts for every /admin page and action. */
export async function requireAdmin(nextPath = '/admin'): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) redirect(`/sign-in?next=${encodeURIComponent(nextPath)}&reason=auth`);
  if (context.profile?.role !== 'admin') redirect(`/sign-in?next=${encodeURIComponent(nextPath)}&reason=admin`);
  return context;
}

/** Only same-site relative paths are accepted as a post-sign-in destination. */
export function safeNextPath(value: string | null | undefined, fallback = '/account'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
