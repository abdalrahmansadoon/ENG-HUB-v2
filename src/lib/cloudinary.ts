import { cloudinary } from './config';

export const uploadsReady = Boolean(cloudinary.cloudName && cloudinary.preset);

export type UploadKind = 'image' | 'video' | 'raw';
// حدود خطة Cloudinary المجانية. ارفعها إن كانت خطتك أكبر.
export const limitsMB: Record<UploadKind, number> = { image: 10, video: 100, raw: 10 };
const extensions: Record<UploadKind, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  video: ['mp4', 'mov', 'webm'],
  raw: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'zip'],
};

export function kindOf(fileName: string): UploadKind | null {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return (Object.keys(extensions) as UploadKind[]).find((k) => extensions[k].includes(ext)) ?? null;
}

/** رفع عبر preset غير موقّع، مع نسبة التقدم. لا يوجد أي مفتاح سري في المتصفح. */
export function upload(file: File, onProgress?: (percent: number) => void, only?: UploadKind): Promise<string> {
  const fail = (code: string) => Promise.reject(new Error(code));
  if (!uploadsReady) return fail('upload/not-configured');
  const kind = kindOf(file.name);
  if (!kind || (only && kind !== only)) return fail('upload/type');
  if (file.size > limitsMB[kind] * 1024 * 1024) return fail('upload/too-large');

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', cloudinary.preset);
  body.append('folder', 'eng-hub');

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinary.cloudName)}/${kind}/upload`);
    request.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    request.onerror = () => reject(new Error('upload/failed'));
    request.onload = () => {
      try {
        const json = JSON.parse(request.responseText) as { secure_url?: string; error?: { message?: string } };
        if (request.status < 300 && json.secure_url) return resolve(json.secure_url);
        console.error('Cloudinary', json.error?.message);
      } catch { /* رد غير متوقع */ }
      reject(new Error('upload/failed'));
    };
    request.send(body);
  });
}
