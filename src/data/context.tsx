import { createContext, useContext, useEffect, useState } from 'react';
import type { AuthUser, Backend, QueryOptions } from './store';

export const BackendContext = createContext<Backend | null>(null);
export const useBackend = () => useContext(BackendContext)!;
export const useStore = () => useBackend().store;

export interface Session {
  user: AuthUser; name: string; photoURL: string; isAdmin: boolean;
  /** قواعد قاعدة البيانات المنشورة تدعم المزايا الجديدة */
  rules2: boolean;
  /** تأكد أن القواعد المنشورة قديمة */
  rulesOld: boolean;
  /** القواعد تدعم المذاكرة والملاحظات والبطاقات والإعلانات */
  rules3: boolean;
  rules3Old: boolean;
}
export const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext)!;

interface Result<T> { data: T; loading: boolean; error: Error | null }

function useLive<T>(key: string | null, empty: T, subscribe: (next: (v: T) => void, fail: (e: Error) => void) => () => void): Result<T> {
  const [state, setState] = useState<Result<T> & { key: string | null }>({ key: null, data: empty, loading: true, error: null });
  useEffect(() => {
    if (key === null) return;
    return subscribe(
      (data) => setState({ key, data, loading: false, error: null }),
      (error) => { console.error(key, error); setState({ key, data: empty, loading: false, error }); },
    );
    // المفتاح يمثل المسار والاستعلام كاملين.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // لا نعرض أبداً بيانات مسار سابق.
  if (key === null) return { data: empty, loading: false, error: null };
  if (state.key !== key) return { data: empty, loading: true, error: null };
  return state;
}

const none: never[] = [];
export function useCollection<T extends { id: string }>(path: string | null, options: QueryOptions = {}) {
  const store = useStore();
  const key = path && `${path}?${JSON.stringify(options)}`;
  return useLive<T[]>(key, none, (next, fail) => store.watch(path!, options, (d) => next(d as unknown as T[]), fail));
}
export function useDoc<T extends { id: string }>(path: string | null) {
  const store = useStore();
  return useLive<T | null>(path, null, (next, fail) => store.watchDoc(path!, (d) => next(d as unknown as T | null), fail));
}
