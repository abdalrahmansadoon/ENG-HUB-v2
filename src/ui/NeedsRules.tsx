import type { ReactNode } from 'react';
import { useSession } from '../data/context';
import { Status } from './kit';
import { usePrefs } from './prefs';

/** تعرض المزايا التي تحتاج قواعد قاعدة البيانات الأحدث، أو تشرح سبب غيابها. */
export default function NeedsRules({ children }: { children: ReactNode }) {
  const { rules3, rules3Old, isAdmin } = useSession();
  const { t } = usePrefs();
  if (rules3) return <>{children}</>;
  if (rules3Old) return <p className="notice">{t(isAdmin ? 'rules3Admin' : 'rules3Student')}</p>;
  return navigator.onLine ? <Status loading /> : <p className="notice">{t('needsOnline')}</p>;
}
