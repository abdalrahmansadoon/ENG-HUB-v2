import type { Announcement, Item, Quiz, Task, TaskResponse } from '../data/types';
import { addDays, startOfDay } from './dates';

export const categories = ['tasks', 'deadlines', 'reviews', 'content', 'announcements'] as const;
export type Category = (typeof categories)[number];
export type NoticeKind = 'newTask' | 'dueChanged' | 'dueSoon' | 'accepted' | 'rejected' | 'again' | 'submitted' | 'newItem' | 'newQuiz' | 'announcement';
export interface Notice {
  /** ثابت لكل حدث: تغيّر الموعد مرة أخرى يصنع إشعاراً جديداً */
  id: string; kind: NoticeKind; category: Category; at: number; to: string; title: string; subjectId: string;
  /** الإشعارات المتشابهة تتجمع تحت المفتاح نفسه */
  group: string;
  who?: string; dueDate?: string;
}
export const WINDOW_DAYS = 30;
export const SOON_DAYS = 2;

export interface Sources {
  uid: string; isAdmin: boolean; today: string; now: number;
  tasks: Task[]; responses: Record<string, TaskResponse[]>;
  items: Item[]; quizzes: Quiz[]; announcements: Announcement[];
}

const path = (task: Task) => (task.personal ? `/tasks/p/${task.id}` : `/tasks/${task.id}`);
const dayOf = (ms: number) => Math.floor(ms / 86_400_000);

/** الإشعارات تُشتق من البيانات نفسها، فلا تحتاج خادماً يرسلها. */
export function buildNotices({ uid, isAdmin, today, now, tasks, responses, items, quizzes, announcements }: Sources): Notice[] {
  const cutoff = now - WINDOW_DAYS * 86_400_000;
  const list: Notice[] = [];
  const add = (notice: Notice) => { if (notice.at >= cutoff) list.push(notice); };

  for (const task of tasks) {
    const base = { title: task.title, subjectId: task.subjectId, to: path(task) };
    const assigned = task.audience.includes('all') || task.audience.includes(uid);
    const mine = responses[task.id]?.find((r) => r.id === uid);
    if (!task.personal && assigned && task.createdBy !== uid && !task.cancelled) {
      add({ ...base, id: `task:${task.id}`, kind: 'newTask', category: 'tasks', at: task.createdAt, group: `task:${dayOf(task.createdAt)}` });
      if (task.dueChangedAt) add({ ...base, id: `moved:${task.id}:${task.dueChangedAt}`, kind: 'dueChanged', category: 'tasks', at: task.dueChangedAt, dueDate: task.dueDate, group: `moved:${task.id}` });
    }
    const open = !task.cancelled && !['done', 'declined', 'submitted', 'review'].includes(mine?.status ?? '');
    // لا نذكّر قبل معرفة ردود المهمة.
    if (assigned && open && responses[task.id] && task.dueDate >= today && task.dueDate <= addDays(today, SOON_DAYS)) {
      const at = Math.max(startOfDay(addDays(task.dueDate, -SOON_DAYS)), task.createdAt);
      add({ ...base, id: `soon:${task.id}:${task.dueDate}`, kind: 'dueSoon', category: 'deadlines', at, dueDate: task.dueDate, group: `soon:${task.dueDate}` });
    }
    if (task.personal) continue;
    if (mine?.reviewedAt && mine.reviewedBy !== uid) {
      const kind = mine.status === 'done' ? 'accepted' : mine.status === 'rejected' ? 'rejected' : mine.status === 'review' ? 'again' : null;
      if (kind) add({ ...base, id: `review:${task.id}:${mine.reviewedAt}`, kind, category: 'reviews', at: mine.reviewedAt, group: `review:${task.id}` });
    }
    if (isAdmin) for (const r of responses[task.id] ?? []) {
      if (r.status !== 'submitted' || r.id === uid) continue;
      add({ ...base, id: `sent:${task.id}:${r.id}:${r.version ?? 0}`, kind: 'submitted', category: 'reviews', at: r.submittedAt ?? r.updatedAt, who: r.name, group: `sent:${task.id}` });
    }
  }
  if (!isAdmin) {
    for (const i of items) add({ id: `item:${i.id}`, kind: 'newItem', category: 'content', at: i.createdAt, to: `/subjects/${i.subjectId}/items/${i.id}`, title: i.title, subjectId: i.subjectId, group: `item:${i.subjectId}:${dayOf(i.createdAt)}` });
    for (const q of quizzes) if (q.published) add({ id: `quiz:${q.id}`, kind: 'newQuiz', category: 'content', at: q.createdAt, to: `/quizzes/${q.id}`, title: q.title, subjectId: q.subjectId, group: `quiz:${q.id}` });
  }
  for (const a of announcements) {
    if (a.createdBy !== uid) add({ id: `ann:${a.id}`, kind: 'announcement', category: 'announcements', at: a.createdAt, to: `/announcements#${a.id}`, title: a.title, subjectId: a.subjectId, group: `ann:${a.id}` });
  }
  return list.sort((a, b) => b.at - a.at);
}

export interface InboxState {
  /** كل ما قبله مقروء */
  readBefore: number;
  read: string[]; unread: string[]; dismissed: string[];
  off: Category[];
  /** فترة عدم الإزعاج HH:mm، أو فارغتان */
  quietFrom: string; quietTo: string;
}
export const emptyInbox: InboxState = { readBefore: 0, read: [], unread: [], dismissed: [], off: [], quietFrom: '', quietTo: '' };
const KEEP = 300;

export const isRead = (n: Notice, s: InboxState) => !s.unread.includes(n.id) && (n.at <= s.readBefore || s.read.includes(n.id));
export const visible = (list: Notice[], s: InboxState) => list.filter((n) => !s.dismissed.includes(n.id) && !s.off.includes(n.category));
const without = (list: string[], ids: string[]) => list.filter((x) => !ids.includes(x));
const withAll = (list: string[], ids: string[]) => [...without(list, ids), ...ids].slice(-KEEP);
export const markRead = (s: InboxState, ids: string[], read: boolean): InboxState => (read
  ? { ...s, read: withAll(s.read, ids), unread: without(s.unread, ids) }
  : { ...s, read: without(s.read, ids), unread: withAll(s.unread, ids) });
export const markAllRead = (s: InboxState, now: number): InboxState => ({ ...s, readBefore: now, read: [], unread: [] });
export const dismiss = (s: InboxState, ids: string[]): InboxState => ({ ...s, dismissed: withAll(s.dismissed, ids) });
export const restore = (s: InboxState, ids: string[]): InboxState => ({ ...s, dismissed: without(s.dismissed, ids) });

/** يجمع المتشابه مع بقاء ترتيب الأحدث. */
export function groupNotices(list: Notice[]): Notice[][] {
  const groups = new Map<string, Notice[]>();
  for (const n of list) {
    const group = groups.get(n.group);
    if (group) group.push(n); else groups.set(n.group, [n]);
  }
  return [...groups.values()];
}

/** هل الوقت داخل فترة عدم الإزعاج؟ تدعم فترة تمتد بعد منتصف الليل. */
export function isQuiet(clock: string, from: string, to: string): boolean {
  if (!from || !to || from === to) return false;
  return from < to ? clock >= from && clock < to : clock >= from || clock < to;
}
