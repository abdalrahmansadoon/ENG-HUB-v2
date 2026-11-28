import type { StudySession, Task, TaskResponse } from '../data/types';
import { addDays, toKey } from './dates';
import { bucketOf } from './tasks';

export interface TaskFigures { assigned: number; completed: number; onTime: number; overdue: number }
export const noFigures = (): TaskFigures => ({ assigned: 0, completed: 0, onTime: 0, overdue: 0 });

/** يوم تسليم المهمة أو إنجازها. */
export const completionDay = (r: TaskResponse | undefined) => (r?.status === 'done' ? toKey(new Date(r.submittedAt ?? r.updatedAt)) : null);

/** مهام العضو المستحقة بين تاريخين. الملغاة والمعتذر عنها لا تُحسب. */
export function taskFigures(tasks: Task[], responseOf: (taskId: string) => TaskResponse | undefined, uid: string, from: string, today: string): TaskFigures {
  const out = noFigures();
  for (const task of tasks) {
    const r = responseOf(task.id);
    if (task.cancelled || r?.status === 'declined' || task.dueDate < from || task.dueDate > today) continue;
    if (!task.audience.includes('all') && !task.audience.includes(uid)) continue;
    out.assigned++;
    const day = completionDay(r);
    if (day) { out.completed++; if (day <= task.dueDate) out.onTime++; }
    else if (bucketOf(task, r?.status, today) === 'late') out.overdue++;
  }
  return out;
}
/** نسبة مئوية، أو null حين لا يوجد ما يُقاس. */
export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

export interface DayValue { day: string; value: number }
export function daysEnding(today: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
}
export const dailyValues = (days: string[], values: Record<string, number>): DayValue[] => days.map((day) => ({ day, value: values[day] ?? 0 }));
export function countByDay(times: (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const day of times) if (day) out[day] = (out[day] ?? 0) + 1;
  return out;
}

export interface SubjectActivity { subjectId: string; minutes: number; completed: number; assigned: number; studied: number }
/** نشاط كل مادة في الفترة، الأكثر نشاطاً أولاً. */
export function subjectActivity(
  tasks: Task[], responseOf: (taskId: string) => TaskResponse | undefined, uid: string,
  sessions: StudySession[], studied: { subjectId: string; at: number }[], from: string, today: string,
): SubjectActivity[] {
  const rows = new Map<string, SubjectActivity>();
  const row = (subjectId: string) => {
    let found = rows.get(subjectId);
    if (!found) rows.set(subjectId, found = { subjectId, minutes: 0, completed: 0, assigned: 0, studied: 0 });
    return found;
  };
  for (const task of tasks) {
    const figures = taskFigures([task], responseOf, uid, from, today);
    if (!figures.assigned) continue;
    const r = row(task.subjectId);
    r.assigned += 1; r.completed += figures.completed;
  }
  for (const s of sessions) if (s.status === 'done' && s.date >= from && s.date <= today) row(s.subjectId).minutes += s.actual;
  for (const p of studied) { const day = toKey(new Date(p.at)); if (day >= from && day <= today) row(p.subjectId).studied++; }
  // الترتيب حسب عدد الأنشطة، وساعة المذاكرة تعادل نشاطاً.
  const weight = (r: SubjectActivity) => r.minutes / 60 + r.completed + r.studied;
  return [...rows.values()].sort((a, b) => weight(b) - weight(a) || b.assigned - a.assigned);
}
