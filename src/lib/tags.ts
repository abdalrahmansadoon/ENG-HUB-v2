/** وسوم مفصولة بفاصلة عربية أو لاتينية: دون تكرار، عشرة على الأكثر. */
export const parseTags = (text: string) => [...new Set(text.split(/[,،\n]/).map((x) => x.trim().slice(0, 30)).filter(Boolean))].slice(0, 10);
