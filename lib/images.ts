/**
 * Image delivery. Photography is resized by the CDN that hosts it:
 * Cloudinary for uploads made in /admin and /dealer, Unsplash for the showcase set.
 * Any other https image (for example from a dealer feed) is passed through untouched.
 */
export function imageUrl(src: string | null | undefined, width: number, quality = 72): string {
  if (!src) return '';
  const w = Math.max(16, Math.round(width));

  if (src.startsWith('https://images.unsplash.com/')) {
    try {
      const url = new URL(src);
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('w', String(w));
      url.searchParams.set('q', String(quality));
      return url.toString();
    } catch {
      return src;
    }
  }

  if (src.includes('res.cloudinary.com/') && src.includes('/image/upload/')) {
    return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);
  }

  return src;
}

/** A responsive srcset for <img>, built from the widths the layout actually uses. */
export function imageSrcSet(src: string | null | undefined, widths: number[] = [480, 800, 1200, 1600]): string | undefined {
  if (!src) return undefined;
  const sample = imageUrl(src, widths[0]);
  if (sample === src) return undefined;
  return widths.map((w) => `${imageUrl(src, w)} ${w}w`).join(', ');
}

/** Poster frame for a Cloudinary-hosted video, or null when the host cannot produce one. */
export function videoPoster(src: string | null | undefined): string | null {
  if (!src || !src.includes('res.cloudinary.com/') || !src.includes('/video/upload/')) return null;
  return src.replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto,w_1600/').replace(/\.(mp4|mov|webm)(\?.*)?$/i, '.jpg');
}

export interface VideoEmbed {
  kind: 'file' | 'iframe';
  src: string;
}

/** Turns a listing video_url into something the page can play. */
export function resolveVideo(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v');
    return id && /^[\w-]{6,20}$/.test(id) ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return /^[\w-]{6,20}$/.test(id) ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return /^\d{5,12}$/.test(id) ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null;
  }
  return { kind: 'file', src: url };
}
