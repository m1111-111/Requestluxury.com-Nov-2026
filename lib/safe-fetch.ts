import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateV4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateV4(address);
  if (family !== 6) return true;
  const lower = address.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') ||
    lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') || lower.startsWith('ff') || lower.startsWith('::ffff:');
}

async function assertPublicHttps(target: URL): Promise<void> {
  if (target.protocol !== 'https:') throw new Error('Only https:// feed URLs are accepted');
  if (target.username || target.password) throw new Error('Feed URLs must not contain credentials');
  const host = target.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('This address is not reachable from the importer');
    return;
  }
  const records = await lookup(host, { all: true });
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error('This address is not reachable from the importer');
  }
}

/**
 * Downloads a dealer feed as text. Only public https hosts are fetched (no private,
 * loopback or link-local addresses, including after redirects), with a time limit
 * and a size cap, so the importer cannot be pointed at internal services.
 */
export async function fetchPublicText(rawUrl: string, maxBytes = 5_000_000): Promise<string> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error('That is not a valid URL');
  }

  for (let hop = 0; hop < 4; hop += 1) {
    await assertPublicHttps(target);
    const response = await fetch(target, {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'application/xml,text/xml,text/csv,text/plain,*/*;q=0.5', 'User-Agent': 'RequestLuxury-Feed-Importer/1.0' },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('The feed redirected without a destination');
      target = new URL(location, target);
      continue;
    }
    if (!response.ok) throw new Error(`The feed responded with HTTP ${response.status}`);

    const declared = Number(response.headers.get('content-length') ?? '0');
    if (declared > maxBytes) throw new Error('The feed is larger than 5 MB');

    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let received = 0;
    let body = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error('The feed is larger than 5 MB');
      }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  }
  throw new Error('The feed redirected too many times');
}
