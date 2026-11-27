import type { ResponseStatus, Task } from '../data/types';
import { addDays, toKey } from './dates';

export const homeSections = ['today', 'activity', 'progress', 'upcoming', 'updates', 'shortcuts'] as const;
export type HomeSection = (typeof homeSections)[number];
/** تظهر في العمود الجانبي على الشاشات العريضة. */
export const sideSections: readonly HomeSection[] = ['upcoming', 'updates', 'shortcuts'];
export interface HomeLayout { order: HomeSection[]; hidden: HomeSection[] }
export const defaultLayout = (): HomeLayout => ({ order: [...homeSections], hidden: [] });

/** يقبل أي قيمة محفوظة ويعيد ترتيباً سليماً يشمل كل الأقسام مرة واحدة. */
export function normalizeLayout(raw: unknown): HomeLayout {
  const known = (list: unknown) => (Array.isArray(list)
    ? [...new Set(list.filter((x): x is HomeSection => homeSections.includes(x as HomeSection)))] : []);
  const value = (raw ?? {}) as { order?: unknown; hidden?: unknown };
  const order = known(value.order);
  return { order: [...order, ...homeSections.filter((s) => !order.includes(s))], hidden: known(value.hidden) };
}

export function moveSection(layout: HomeLayout, id: HomeSection, step: -1 | 1): HomeLayout {
  const order = [...layout.order];
  const from = order.indexOf(id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= order.length) return layout;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...layout, order };
}

export interface TaskStats { total: number; done: number; pending: number; overdue: number }
/** مهام العضو وحده، دون ما رفضه. */
export function taskStats(tasks: Task[], statusOf: (id: string) => ResponseStatus | undefined, uid: string, today: string): TaskStats {
  const stats = { total: 0, done: 0, pending: 0, overdue: 0 };
  for (const task of tasks) {
    const status = statusOf(task.id);
    if (status === 'declined' || !(task.audience.includes('all') || task.audience.includes(uid))) continue;
    stats.total++;
    if (status === 'done') stats.done++;
    else if (task.dueDate < today) stats.overdue++;
    else stats.pending++;
  }
  return stats;
}

export interface DayActivity { day: string; done: number; studied: number }
/** آخر سبعة أيام تنتهي باليوم المعطى، بالتوقيت المحلي. */
export function weekActivity(today: string, doneAt: number[], studiedAt: number[]): DayActivity[] {
  const days = [-6, -5, -4, -3, -2, -1, 0].map((n) => ({ day: addDays(today, n), done: 0, studied: 0 }));
  const count = (times: number[], field: 'done' | 'studied') => {
    for (const time of times) {
      const key = toKey(new Date(time));
      const entry = days.find((d) => d.day === key);
      if (entry) entry[field]++;
    }
  };
  count(doneAt, 'done');
  count(studiedAt, 'studied');
  return days;
}
