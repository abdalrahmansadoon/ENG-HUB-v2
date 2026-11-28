import { toCsv } from './tasks';

/** ينزّل جدولاً بصيغة CSV يفتحها Excel. */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'report'}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
