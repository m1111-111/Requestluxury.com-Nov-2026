'use client';

import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, Upload } from 'lucide-react';
import { imageUrl } from '@/lib/images';

interface Signature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/** Upload to Cloudinary (signed, direct from the browser), add by link, reorder and remove photos. */
export function ImageManager({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addUrl = () => {
    const value = url.trim();
    if (!/^https:\/\/\S+$/.test(value)) {
      setError('Paste a full https:// image link.');
      return;
    }
    setError('');
    if (!images.includes(value)) onChange([...images, value]);
    setUrl('');
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const signed = await fetch('/api/cloudinary/sign', { method: 'POST' });
      const signature = (await signed.json().catch(() => ({}))) as Partial<Signature> & { error?: string };
      if (!signed.ok || !signature.signature || !signature.cloudName) {
        setError(signature.error || 'Uploads are not available. Paste image links instead.');
        return;
      }
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 20)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 15_000_000) {
          setError(`${file.name} is larger than 15 MB and was skipped.`);
          continue;
        }
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', signature.apiKey ?? '');
        form.append('timestamp', String(signature.timestamp));
        form.append('folder', signature.folder ?? '');
        form.append('signature', signature.signature);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: 'POST', body: form });
        const body = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
        if (response.ok && body.secure_url) uploaded.push(body.secure_url);
        else setError(body.error?.message || `Cloudinary could not accept ${file.name}.`);
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded.filter((item) => !images.includes(item))]);
    } catch {
      setError('The upload failed. Check your connection and try again.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">Photographs ({images.length})</span>
        <span className={`text-xs ${images.length >= 8 ? 'text-green-800' : 'text-stone'}`}>
          {images.length >= 8 ? 'Full gallery: +30 quality' : `${8 - images.length} more for +30 quality`}
        </span>
      </div>

      {images.length > 0 && (
        <ol className="mb-3 grid gap-2 sm:grid-cols-2">
          {images.map((src, index) => (
            <li key={src} className="flex items-center gap-3 border border-sand bg-white p-2">
              <img src={imageUrl(src, 160, 60)} alt="" className="h-14 w-20 shrink-0 bg-ivory object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-stone">
                {index === 0 ? <strong className="font-semibold text-gold-deep">Cover · </strong> : `${index + 1} · `}
                {src.replace(/^https:\/\//, '')}
              </span>
              <span className="flex shrink-0">
                <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)} className="flex h-8 w-8 items-center justify-center text-stone hover:text-obsidian disabled:opacity-30">
                  <ArrowUp aria-hidden="true" className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Move later" disabled={index === images.length - 1} onClick={() => move(index, 1)} className="flex h-8 w-8 items-center justify-center text-stone hover:text-obsidian disabled:opacity-30">
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Remove photo" onClick={() => onChange(images.filter((_, item) => item !== index))} className="flex h-8 w-8 items-center justify-center text-stone hover:text-red-700">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          aria-label="Image link"
          placeholder="https://… paste an image link"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addUrl();
            }
          }}
          className="input"
        />
        <button type="button" onClick={addUrl} className="btn btn-outline shrink-0">
          <Plus aria-hidden="true" className="h-4 w-4" /> Add link
        </button>
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="btn btn-dark shrink-0">
          <Upload aria-hidden="true" className="h-4 w-4" /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => void upload(event.target.files)} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
