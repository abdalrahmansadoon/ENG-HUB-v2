export const searchTypes = ['task', 'subject', 'item', 'quiz', 'announcement', 'note', 'card', 'chat'] as const;
export type SearchType = (typeof searchTypes)[number];
export interface Entry {
  id: string; type: SearchType; title: string;
  /** نص يُبحث فيه ولا يظهر عنواناً */
  body: string;
  subjectId: string; to: string;
}

/** توحيد الكتابة العربية: دون تشكيل، والهمزات والتاء المربوطة والألف المقصورة متساوية، والأرقام لاتينية. */
export function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // التشكيل والتطويل، دون الأرقام
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/\s+/g, ' ').trim();
}

/** كل كلمات البحث موجودة (ولو جزئياً). ما يطابق العنوان يسبق ما يطابق النص. */
export function search(entries: Entry[], query: string, filter: { type?: SearchType | ''; subject?: string } = {}): Entry[] {
  const needle = normalize(query);
  const words = needle.split(' ').filter(Boolean);
  if (!words.length) return [];
  const found: { entry: Entry; rank: number }[] = [];
  for (const entry of entries) {
    if ((filter.type && entry.type !== filter.type) || (filter.subject && entry.subjectId !== filter.subject)) continue;
    const title = normalize(entry.title);
    const all = `${title} ${normalize(entry.body)}`;
    if (!words.every((w) => all.includes(w))) continue;
    const rank = title.startsWith(needle) ? 0 : words.every((w) => title.includes(w)) ? 1 : 2;
    found.push({ entry, rank });
  }
  return found.sort((a, b) => a.rank - b.rank || searchTypes.indexOf(a.entry.type) - searchTypes.indexOf(b.entry.type)).map((x) => x.entry);
}

/** آخر عمليات البحث: الأحدث أولاً دون تكرار. */
export const remember = (recent: string[], query: string, size = 6) => {
  const text = query.trim();
  return text.length < 2 ? recent : [text, ...recent.filter((x) => normalize(x) !== normalize(text))].slice(0, size);
};
