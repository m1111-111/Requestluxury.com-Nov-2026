import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams(params);
    if (target > 1) query.set('page', String(target));
    else query.delete('page');
    const text = query.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Previous
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm opacity-40">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Previous
        </span>
      )}
      <span className="text-sm text-stone">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm" rel="next">
          Next <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm opacity-40">
          Next <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
