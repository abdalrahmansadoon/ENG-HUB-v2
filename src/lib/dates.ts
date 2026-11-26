const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toKey(new Date());
const parse = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (key: string, n: number) => { const d = parse(key); d.setDate(d.getDate() + n); return toKey(d); };

const locale = (lang: string) => (lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
export const formatDay = (key: string, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' }).format(parse(key));
export const formatTime = (ms: number, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { hour: 'numeric', minute: '2-digit' }).format(ms);
export const formatShort = (ms: number, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' }).format(ms);
