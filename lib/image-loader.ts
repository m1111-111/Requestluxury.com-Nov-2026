'use client';

import { imageUrl } from './images';

/** Custom loader for next/image (see next.config.mjs): the hosting CDN does the resizing. */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  const resized = imageUrl(src, width, quality ?? 72);
  if (resized !== src) return resized;
  // Local and third-party images are served as they are; the width hint keeps the URL unique per size.
  return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
}
