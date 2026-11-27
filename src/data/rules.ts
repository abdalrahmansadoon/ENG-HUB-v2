import { useEffect } from 'react';
import { useDoc } from './context';

/**
 * المزايا الجديدة تحتاج قواعد منشورة حديثة. المستند meta/r2 لا وجود له،
 * لكن قراءته مسموحة في القواعد الجديدة فقط: الرفض يعني أن المنشور قديم.
 * نتذكر آخر نتيجة لأن القراءة لا تكتمل دون اتصال.
 */
const KEY = 'enghub.rules2';
export function useRules() {
  const probe = useDoc<{ id: string }>('meta/r2');
  const refused = (probe.error as { code?: string } | null)?.code === 'permission-denied';
  const confirmed = !probe.loading && !probe.error;
  useEffect(() => {
    try {
      if (confirmed) localStorage.setItem(KEY, '1');
      if (refused) localStorage.removeItem(KEY);
    } catch { /* التخزين غير متاح */ }
  }, [confirmed, refused]);
  let remembered = false;
  try { remembered = localStorage.getItem(KEY) === '1'; } catch { /* التخزين غير متاح */ }
  return { rules2: confirmed || (!refused && remembered), rulesOld: refused };
}
