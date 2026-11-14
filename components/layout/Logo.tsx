import Link from 'next/link';

/** Wordmark with the gold "R" emblem. `tone` picks the colour for light or dark surfaces. */
export function Logo({ tone = 'dark', className = '' }: { tone?: 'dark' | 'light'; className?: string }) {
  const text = tone === 'light' ? 'text-white' : 'text-obsidian';
  return (
    <Link href="/" aria-label="RequestLuxury home" className={`group inline-flex items-center gap-3 ${className}`}>
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center border border-gold font-serif text-xl leading-none text-gold transition-colors group-hover:bg-gold group-hover:text-obsidian"
      >
        R
      </span>
      <span dir="ltr" className={`font-serif text-[1.35rem] leading-none tracking-[0.22em] ${text}`}>
        REQUEST<span className="text-gold">LUXURY</span>
      </span>
    </Link>
  );
}
