import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RequestLuxury',
    short_name: 'RequestLuxury',
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#0B0B0C',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
