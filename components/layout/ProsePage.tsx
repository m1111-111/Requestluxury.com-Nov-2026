import type { ReactNode } from 'react';

/** Shared frame for long-form pages (policies, guides). */
export function ProsePage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="container-rl max-w-3xl py-16 md:py-24">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-4 text-5xl text-obsidian md:text-6xl">{title}</h1>
      {updated && <p className="mt-4 text-sm text-stone">Last updated {updated}</p>}
      <div className="prose-rl mt-10 text-[1.02rem]">{children}</div>
    </article>
  );
}
