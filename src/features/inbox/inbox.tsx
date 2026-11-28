import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import type { Item, Quiz } from '../../data/types';
import { clockKey, today } from '../../lib/dates';
import type { Key } from '../../lib/i18n';
import * as lib from '../../lib/notifications';
import type { InboxState, Notice, NoticeKind } from '../../lib/notifications';
import { notify } from '../../lib/pwa';
import { useFeedback } from '../../ui/feedback';
import { usePrefs } from '../../ui/prefs';
import { useAnnouncements } from '../announcements/useAnnouncements';
import { useResponses } from '../tasks/responses';
import { useTasks } from '../tasks/useTasks';

export const noticeKeys: Record<NoticeKind, Key> = {
  newTask: 'nkNewTask', dueChanged: 'nkDueChanged', dueSoon: 'nkDueSoon', accepted: 'nkAccepted', rejected: 'nkRejected',
  again: 'nkAgain', submitted: 'nkSubmitted', newItem: 'nkNewItem', newQuiz: 'nkNewQuiz', announcement: 'nkAnnouncement',
};

interface Value {
  notices: Notice[]; state: InboxState; unread: number; loading: boolean; error: Error | null;
  save(next: InboxState): void;
}
const Context = createContext<Value | null>(null);
export const useInbox = () => useContext(Context)!;

/** حالة القراءة: في قاعدة البيانات لتنتقل بين الأجهزة، أو في المتصفح إن كانت القواعد قديمة. */
function useInboxState() {
  const store = useStore();
  const { user, rules3 } = useSession();
  const { run } = useFeedback();
  const path = `users/${user.uid}/settings/inbox`;
  const remote = useDoc<InboxState & { id: string }>(rules3 ? path : null);
  const key = `enghub.inbox.v1:${user.uid}`;
  const [local, setLocal] = useState<InboxState>(() => {
    try { return { ...lib.emptyInbox, ...JSON.parse(localStorage.getItem(key) ?? '{}') }; } catch { return lib.emptyInbox; }
  });
  const state = useMemo<InboxState>(() => {
    if (!rules3) return local;
    const { id: _, ...saved } = remote.data ?? { id: '' };
    return { ...lib.emptyInbox, ...saved };
  }, [rules3, remote.data, local]);
  const save = (next: InboxState) => {
    if (rules3) { void run(() => store.set(path, { ...next })); return; }
    setLocal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* التخزين غير متاح */ }
  };
  // دون اتصال قد لا يؤكد الخادم غياب المستند: لا نعطل الإشعارات من أجله.
  return { state, save, loading: rules3 && remote.loading && navigator.onLine };
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useSession();
  const { t } = usePrefs();
  const tasks = useTasks();
  const { byTask } = useResponses();
  const items = useCollection<Item>('items', { orderBy: ['createdAt', 'desc'], limit: 40 });
  const quizzes = useCollection<Quiz>('quizzes', isAdmin ? {} : { where: ['published', '==', true] });
  const announcements = useAnnouncements();
  const settings = useInboxState();
  const now = today();
  const all = useMemo(() => lib.buildNotices({
    uid: user.uid, isAdmin, today: now, now: Date.now(), tasks: tasks.data, responses: byTask,
    items: items.data, quizzes: quizzes.data, announcements: announcements.data,
  }), [user.uid, isAdmin, now, tasks.data, byTask, items.data, quizzes.data, announcements.data]);
  const loading = tasks.loading || items.loading || quizzes.loading || announcements.loading || settings.loading
    || tasks.data.some((x) => !byTask[x.id]);
  const notices = settings.loading ? [] : lib.visible(all, settings.state);
  const unread = notices.filter((n) => !lib.isRead(n, settings.state)).length;

  // إشعار المتصفح لما يصل بينما التطبيق مفتوح.
  const seen = useRef<Set<string> | null>(null);
  const [since] = useState(() => Date.now() - 60_000);
  useEffect(() => {
    if (loading) return;
    if (seen.current) {
      const { off, quietFrom, quietTo } = settings.state;
      const quiet = lib.isQuiet(clockKey(Date.now()), quietFrom, quietTo);
      for (const n of all) {
        // الأقدم من فتح الصفحة ليست جديدة، حتى لو وصلت متأخرة من الخادم.
        if (seen.current.has(n.id) || n.at < since || n.kind === 'dueSoon' || off.includes(n.category) || quiet) continue;
        void notify(t(noticeKeys[n.kind]), { body: n.title, tag: n.id, data: { to: n.to } });
      }
    }
    seen.current = new Set([...(seen.current ?? []), ...all.map((n) => n.id)]);
  }, [all, loading, settings.state, since, t]);

  const value: Value = { notices, state: settings.state, unread, loading, error: tasks.error ?? items.error ?? quizzes.error ?? announcements.error, save: settings.save };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
