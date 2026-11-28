export interface Part { type: 'text' | 'inline' | 'block'; value: string }

/** نهاية معادلة داخل السطر، أو -1. «5$ و 10$» ليست معادلة. */
function closing(text: string, from: number): number {
  if (!text[from] || /\s/.test(text[from])) return -1;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '\n') return -1;
    if (text[i] === '\\') i++;
    else if (text[i] === '$') return /\s/.test(text[i - 1]) || /\d/.test(text[i + 1] ?? '') ? -1 : i;
  }
  return -1;
}

/** يقسم النص إلى كتابة عادية ومعادلات: $داخل السطر$ و $$في سطر مستقل$$. و \$ علامة عادية. */
export function splitMath(text: string): Part[] {
  const parts: Part[] = [];
  let plain = '';
  const flush = () => { if (plain) parts.push({ type: 'text', value: plain }); plain = ''; };
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && text[i + 1] === '$') { plain += '$'; i += 2; continue; }
    if (text.startsWith('$$', i)) {
      const end = text.indexOf('$$', i + 2);
      const value = end < 0 ? '' : text.slice(i + 2, end).trim();
      if (value) { flush(); parts.push({ type: 'block', value }); i = end + 2; } else { plain += '$$'; i += 2; }
      continue;
    }
    if (text[i] === '$') {
      const end = closing(text, i + 1);
      if (end > i + 1) { flush(); parts.push({ type: 'inline', value: text.slice(i + 1, end) }); i = end + 1; continue; }
    }
    plain += text[i++];
  }
  flush();
  return parts;
}
