interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Small in-memory limiter for public form endpoints. It throttles bursts from one
 * address within a server instance; pair it with your CDN's bot protection for
 * distributed abuse.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [name, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(name);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown').trim();
}

export function visitorCountry(request: Request): string {
  const code = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : 'ZZ';
}
