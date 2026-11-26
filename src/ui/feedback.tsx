import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { errorKey, type Key } from '../lib/i18n';
import { Dialog } from './kit';
import { usePrefs } from './prefs';

interface Feedback {
  toast(key: Key, bad?: boolean): void;
  confirm(key: Key): Promise<boolean>;
  /** ينفذ عملية ويعرض خطأها. يعيد false عند الفشل. */
  run(task: () => Promise<unknown>, success?: Key): Promise<boolean>;
}
const Context = createContext<Feedback | null>(null);
export const useFeedback = () => useContext(Context)!;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = usePrefs();
  const [note, setNote] = useState<{ key: Key; bad: boolean; n: number } | null>(null);
  const [question, setQuestion] = useState<Key | null>(null);
  const answer = useRef<(v: boolean) => void>(() => {});
  // النافذة المنبثقة تغطي كل ما خارجها، فنعرض التنبيه داخلها إن كانت مفتوحة.
  const [host, setHost] = useState<Element>(document.body);
  useLayoutEffect(() => { setHost([...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body); }, [note]);
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), note.bad ? 6000 : 3000);
    return () => clearTimeout(id);
  }, [note]);

  const toast = useCallback((key: Key, bad = false) => setNote({ key, bad, n: Date.now() }), []);
  const confirm = useCallback((key: Key) => new Promise<boolean>((resolve) => { answer.current = resolve; setQuestion(key); }), []);
  const run = useCallback(async (task: () => Promise<unknown>, success?: Key) => {
    const fail = (e: unknown) => { console.error(e); toast(errorKey(e), true); };
    try {
      const pending = task();
      // دون اتصال لا يرد الخادم: العملية محفوظة محلياً وستُرسل لاحقاً.
      if (!navigator.onLine) { pending.catch(fail); toast('offline'); return true; }
      await pending;
      if (success) toast(success);
      return true;
    } catch (e) { fail(e); return false; }
  }, [toast]);

  const close = (v: boolean) => { setQuestion(null); answer.current(v); };
  return (
    <Context.Provider value={{ toast, confirm, run }}>
      {children}
      {createPortal(<div className="toast-zone" role="status">{note && <p key={note.n} className={note.bad ? 'toast bad' : 'toast'}>{t(note.key)}</p>}</div>, host)}
      {question && (
        <Dialog title={t('confirm')} onClose={() => close(false)}>
          <p>{t(question)}</p>
          <div className="actions">
            <button className="btn danger" onClick={() => close(true)}>{t('confirm')}</button>
            <button className="btn" onClick={() => close(false)}>{t('cancel')}</button>
          </div>
        </Dialog>
      )}
    </Context.Provider>
  );
}
