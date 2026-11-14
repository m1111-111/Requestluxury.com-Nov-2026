'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/browser';

type Mode = 'sign-in' | 'register' | 'link';

/** Email + password sign-in and registration, plus a one-time email link. */
export function SignInForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const supabase = getBrowserSupabase();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setNotice(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setNotice({ tone: 'error', text: error.message === 'Email not confirmed' ? 'Please confirm your email first: check your inbox for our message.' : 'Those details were not recognised. Please try again.' });
          return;
        }
        router.replace(nextPath);
        router.refresh();
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: redirectTo },
        });
        if (error) {
          setNotice({ tone: 'error', text: error.message });
          return;
        }
        if (data.session) {
          router.replace(nextPath);
          router.refresh();
        } else {
          setNotice({ tone: 'ok', text: 'Almost there. We have emailed you a link to confirm your address.' });
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
        // The same message is shown whether or not the address has an account.
        if (error && !/not found|signups not allowed/i.test(error.message)) {
          setNotice({ tone: 'error', text: 'We could not send the link just now. Please try again in a minute.' });
          return;
        }
        setNotice({ tone: 'ok', text: 'If that address has an account, a sign-in link is on its way.' });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supabase) {
    return (
      <p role="status" className="border border-gold/50 bg-ivory p-5 text-sm leading-relaxed text-charcoal">
        Accounts switch on once the Supabase keys are added. See <strong className="font-semibold">DEPLOYMENT_GUIDE.md</strong>, step 2.
      </p>
    );
  }

  const tabs: Array<[Mode, string]> = [
    ['sign-in', 'Sign in'],
    ['register', 'Create account'],
    ['link', 'Email me a link'],
  ];

  return (
    <div>
      <div role="tablist" aria-label="Sign-in options" className="mb-6 flex border-b border-sand">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => {
              setMode(id);
              setNotice(null);
            }}
            className={`flex-1 border-b-2 px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${mode === id ? 'border-gold text-obsidian' : 'border-transparent text-stone hover:text-obsidian'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        {mode === 'register' && (
          <div>
            <label className="label" htmlFor="si-name">
              Full name
            </label>
            <input id="si-name" required minLength={2} maxLength={160} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="si-email">
            Email
          </label>
          <input id="si-email" type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" />
        </div>
        {mode !== 'link' && (
          <div>
            <label className="label" htmlFor="si-password">
              Password
            </label>
            <input
              id="si-password"
              type="password"
              required
              minLength={mode === 'register' ? 10 : 6}
              maxLength={128}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
            />
            {mode === 'register' && <p className="mt-1.5 text-xs text-stone">At least 10 characters.</p>}
          </div>
        )}
        {notice && (
          <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`text-sm leading-relaxed ${notice.tone === 'error' ? 'text-red-700' : 'text-green-800'}`}>
            {notice.text}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn btn-dark w-full">
          {busy ? 'One moment…' : mode === 'sign-in' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send sign-in link'}
        </button>
      </form>
    </div>
  );
}
