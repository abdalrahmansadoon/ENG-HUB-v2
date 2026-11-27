/** يقبل روابط http و https فقط. */
export function safeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch { return ''; }
}

export type Media = { type: 'embed'; src: string } | { type: 'file'; src: string } | { type: 'link'; src: string };

export function resolveMedia(raw: string): Media | null {
  const href = safeUrl(raw);
  if (!href) return null;
  const u = new URL(href);
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? '';
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? '';
  }
  if (/^[\w-]{11}$/.test(id)) return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
  if (host === 'drive.google.com') {
    const file = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get('id');
    if (file && /^[\w-]+$/.test(file)) return { type: 'embed', src: `https://drive.google.com/file/d/${file}/preview` };
  }
  if (host === 'vimeo.com') {
    const v = u.pathname.match(/^\/(\d+)/)?.[1];
    if (v) return { type: 'embed', src: `https://player.vimeo.com/video/${v}` };
  }
  if (/\.(mp4|webm|ogv|mov|m4v)$/i.test(u.pathname)) return { type: 'file', src: href };
  return { type: 'link', src: href };
}

export type ItemKind = 'video' | 'pdf' | 'drive' | 'link';
/** نوع المحتوى كما يظهر في القائمة، من الرابط وحده. */
export function itemKind(raw: string): ItemKind {
  const media = resolveMedia(raw);
  if (!media) return 'link';
  const { hostname, pathname } = new URL(media.src);
  if (/\.pdf$/i.test(pathname)) return 'pdf';
  if (hostname === 'drive.google.com') return 'drive';
  return media.type === 'link' ? 'link' : 'video';
}
