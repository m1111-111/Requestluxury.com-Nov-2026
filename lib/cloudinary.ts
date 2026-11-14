import { createHash } from 'node:crypto';

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Signs a direct browser upload. The API secret never leaves the server: the browser
 * receives a signature that is valid for this folder and timestamp only.
 */
export function signUpload(folder: string): UploadSignature | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
  const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';
  if (!cloudName || !apiKey || !apiSecret) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash('sha1').update(toSign).digest('hex');
  return { cloudName, apiKey, timestamp, folder, signature };
}
