import { useEffect } from 'react';
import { useDoc } from './context';

/**
 * المزايا الجديدة تحتاج قواعد منشورة حديثة. المستند المفحوص لا وجود له،
 * لكن قراءته مسموحة في القواعد الجديدة فقط: الرفض يعني أن المنشور قديم.
 * نتذكر آخر نتيجة لأن القراءة لا تكتمل دون اتصال.
 */
function useProbe(path: string, key: string) {
  const probe = useDoc<{ id: string }>(path);
  const refused = (probe.error as { code?: string } | null)?.code === 'permission-denied';
  const confirmed = !probe.loading && !probe.error;
  useEffect(() => {
    try {
      if (confirmed) localStorage.setItem(key, '1');
      if (refused) localStorage.removeItem(key);
    } catch { /* التخزين غير متاح */ }
  }, [confirmed, refused, key]);
  let remembered = false;
  try { remembered = localStorage.getItem(key) === '1'; } catch { /* التخزين غير متاح */ }
  return { ok: confirmed || (!refused && remembered), refused };
}

export function useRules() {
  const second = useProbe('meta/r2', 'enghub.rules2');
  const third = useProbe('probe/r3', 'enghub.rules3');
  return { rules2: second.ok || third.ok, rulesOld: second.refused, rules3: third.ok, rules3Old: third.refused };
}
