import type { Announcement, StudySession, Task } from '../../data/types';

export type EventKind = 'task' | 'session' | 'announcement';
export interface CalendarEvent {
  key: string; kind: EventKind; day: string; time: string; title: string; subjectId: string; done: boolean;
  task?: Task; session?: StudySession; announcement?: Announcement;
}

/** يجمع المهام والجلسات ومواعيد الإعلانات حسب اليوم. */
export function eventsByDay(
  tasks: Task[], sessions: StudySession[], announcements: Announcement[], isDone: (task: Task) => boolean,
): Record<string, CalendarEvent[]> {
  const days: Record<string, CalendarEvent[]> = {};
  const add = (event: CalendarEvent) => (days[event.day] ??= []).push(event);
  for (const a of announcements) if (a.date) add({ key: `a:${a.id}`, kind: 'announcement', day: a.date, time: '', title: a.title, subjectId: a.subjectId, done: false, announcement: a });
  for (const t of tasks) if (!t.cancelled) add({ key: `t:${t.id}`, kind: 'task', day: t.dueDate, time: '', title: t.title, subjectId: t.subjectId, done: isDone(t), task: t });
  for (const s of sessions) if (s.status !== 'skipped') add({ key: `s:${s.id}`, kind: 'session', day: s.date, time: s.start, title: s.goal, subjectId: s.subjectId, done: s.status === 'done', session: s });
  // الإعلانات أولاً ثم المهام ثم الجلسات بوقتها.
  const order: EventKind[] = ['announcement', 'task', 'session'];
  for (const list of Object.values(days)) list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.time.localeCompare(b.time));
  return days;
}
