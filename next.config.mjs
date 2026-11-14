import { existsSync } from 'node:fs';
import { FEEDER_HOSTS, PRIMARY_ORIGIN } from './config/feeder-domains.mjs';

const isDev = process.env.NODE_ENV !== 'production';

// The hero loop and the 60-second explainer are optional. Drop the rendered files
// into /public/videos (see blender/VOICEOVER_AND_INSTRUCTIONS.md) and they are
// picked up at the next build; until then the hero shows its gradient poster.
const videoPath = (file) => (existsSync(`./public/videos/${file}`) ? `/videos/${file}` : '');

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseSocket = supabaseOrigin.replace(/^http/, 'ws');

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Dealer feeds reference photography on their own CDNs, so images and video allow any https source.
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com ${supabaseOrigin} ${supabaseSocket}`.trim(),
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Images are resized by the CDN that hosts them (Cloudinary / Unsplash), see lib/image-loader.ts.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },

  env: {
    NEXT_PUBLIC_HERO_VIDEO: process.env.NEXT_PUBLIC_HERO_VIDEO || videoPath('requestluxury-hero.mp4'),
    NEXT_PUBLIC_EXPLAINER_VIDEO: process.env.NEXT_PUBLIC_EXPLAINER_VIDEO || videoPath('requestluxury-explainer.mp4'),
  },

  // Permanent 301 redirects from every feeder domain to the primary hub.
  // middleware.ts applies the same rule, so the redirect holds on any host.
  async redirects() {
    return FEEDER_HOSTS.map((host) => ({
      source: '/:path*',
      has: [{ type: 'host', value: host }],
      destination: `${PRIMARY_ORIGIN}/`,
      statusCode: 301,
    }));
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
