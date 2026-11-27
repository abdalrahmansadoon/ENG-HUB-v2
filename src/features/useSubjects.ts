import { useCollection } from '../data/context';
import type { Subject } from '../data/types';
import { usePrefs } from '../ui/prefs';
import { toneOf } from '../ui/tone';

export function useSubjects() {
  const { lang, t } = usePrefs();
  const result = useCollection<Subject>('subjects', { orderBy: ['order', 'asc'] });
  const label = (s: Subject) => (lang === 'en' && s.nameEn ? s.nameEn : s.name);
  const nameOf = (id: string) => { const s = result.data.find((x) => x.id === id); return s ? label(s) : t('general'); };
  const tone = (id: string) => toneOf(result.data.find((x) => x.id === id)?.order);
  return { ...result, label, nameOf, tone };
}
