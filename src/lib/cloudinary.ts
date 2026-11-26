import { cloudinary } from './config';

export const uploadsReady = Boolean(cloudinary.cloudName && cloudinary.preset);
const MB = 1024 * 1024;

export async function upload(file: File, maxMB = 25): Promise<string> {
  if (!uploadsReady) throw new Error('upload/not-configured');
  if (file.size > maxMB * MB) throw new Error('upload/too-large');
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', cloudinary.preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinary.cloudName)}/auto/upload`, { method: 'POST', body });
  const json = (await res.json().catch(() => null)) as { secure_url?: string } | null;
  if (!res.ok || !json?.secure_url) throw new Error('upload/failed');
  return json.secure_url;
}
