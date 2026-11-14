'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display mt-4 text-4xl text-obsidian md:text-6xl">We could not load this page</h1>
      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-stone">
        This is a problem on our side. Please try again; if it continues, email the concierge desk and quote the reference below.
      </p>
      {error.digest && <p className="mt-4 font-mono text-xs text-stone">Reference {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-dark">
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
