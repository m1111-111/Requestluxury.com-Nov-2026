// Feeder domains that permanently (301) redirect to the primary hub.
// Used by both next.config.mjs and middleware.ts so the list lives in one place.

/** Canonical origin of the hub, without a trailing slash. */
export const PRIMARY_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || 'https://requestluxury.com').replace(/\/+$/, '');

/** Add or remove a feeder domain here; the bare and www. hosts are both redirected. */
export const FEEDER_DOMAINS = [
  'requestvilla.com',
  'requestsupercar.com',
  'requestyacht.com',
  'requestrental.com',
  'avesanti.com',
  'sterlinglatimer.com',
];

function primaryHost() {
  try {
    return new URL(PRIMARY_ORIGIN).host.toLowerCase();
  } catch {
    return 'requestluxury.com';
  }
}

/** Every host that redirects. The primary host is never included, which rules out a redirect loop. */
export const FEEDER_HOSTS = FEEDER_DOMAINS.flatMap((domain) => [domain, `www.${domain}`]).filter(
  (host) => host !== primaryHost(),
);

/** True when the given Host header belongs to a feeder domain. */
export function isFeederHost(hostHeader) {
  const host = String(hostHeader || '').toLowerCase().split(':')[0];
  return FEEDER_HOSTS.includes(host);
}
