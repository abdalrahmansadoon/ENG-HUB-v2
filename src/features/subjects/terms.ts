export const years = [['prep', 'yearPrep'], ['1', 'year1'], ['2', 'year2'], ['3', 'year3'], ['4', 'year4']] as const;
export const terms = [['1', 'term1'], ['2', 'term2']] as const;
export const categories = ['lectures', 'sheets', 'exams', 'resources'] as const;

const TERM_KEY = 'enghub.term';
export function rememberTerm(year: string, term: string) {
  try { localStorage.setItem(TERM_KEY, `${year}:${term}`); } catch { /* التخزين غير متاح */ }
}
/** آخر سنة وفصل اختارهما المستخدم، وإلا إعدادي ترم أول. */
export function savedTerm(): [string, string] {
  try {
    const [year, term] = localStorage.getItem(TERM_KEY)?.split(':') ?? [];
    if (year && term) return [year, term];
  } catch { /* التخزين غير متاح */ }
  return ['prep', '1'];
}
