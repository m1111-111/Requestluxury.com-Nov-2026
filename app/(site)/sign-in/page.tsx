import type { Metadata } from 'next';
import { SignInForm } from '@/components/auth/SignInForm';
import { safeNextPath } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: false },
};

const REASONS: Record<string, string> = {
  auth: 'Please sign in to continue.',
  admin: 'That area is reserved for RequestLuxury administrators. Sign in with an admin account to continue.',
  setup: 'Accounts are not connected yet. Add the Supabase keys to switch on sign-in.',
  link: 'That sign-in link has expired or was already used. Please request a new one.',
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  const nextPath = safeNextPath(next);
  const message = reason ? REASONS[reason] : undefined;

  return (
    <section className="container-rl grid min-h-[70vh] items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20">
      <div>
        <p className="eyebrow">Members</p>
        <h1 className="display mt-4 text-5xl text-obsidian md:text-6xl">Your private account</h1>
        <p className="mt-6 max-w-md text-[1.02rem] leading-relaxed text-stone">
          Sign in to bid in timed auctions, see documents released to verified buyers, manage your dealer inventory, and keep your enquiries in one place.
        </p>
      </div>
      <div className="border border-sand bg-white p-6 shadow-card md:p-8">
        {message && (
          <p role="status" className="mb-6 border-s-2 border-gold bg-ivory px-4 py-3 text-sm leading-relaxed text-charcoal">
            {message}
          </p>
        )}
        <SignInForm nextPath={nextPath} />
      </div>
    </section>
  );
}
