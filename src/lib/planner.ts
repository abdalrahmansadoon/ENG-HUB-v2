import type { DayGoals, StudySession } from '../data/types';
import { addDays, toKey, weekdayIndex } from './dates';

/** هدف الدقائق اليومي، وأيام الراحة (0 الأحد … 6 السبت). الجمعة راحة افتراضياً. */
export const defaultPlanner = { target: 60, rest: [5] };
/** أقدم ما نحمّله من الجلسات والأهداف. */
export const HISTORY_DAYS = 90;

/** الأسبوع يبدأ بالسبت. */
export const weekStart = (day: string) => addDays(day, -((weekdayIndex(day) + 1) % 7));
export const weekDays = (day: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(day), i));

/** خلايا الشهر في أسابيع كاملة. */
export function monthGrid(day: string): string[] {
  const [y, m] = day.split('-').map(Number);
  const last = toKey(new Date(y, m, 0));
  const cells: string[] = [];
  for (let key = weekStart(`${day.slice(0, 7)}-01`); key <= last || cells.length % 7; key = addDays(key, 1)) cells.push(key);
  return cells;
}

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export const AGENDA_DAYS = 30;
/** الفترة التالية أو السابقة حسب العرض. */
export function shiftDate(view: CalendarView, day: string, step: -1 | 1): string {
  if (view === 'month') {
    const [y, m, d] = day.split('-').map(Number);
    const last = new Date(y, m - 1 + step + 1, 0).getDate();
    return toKey(new Date(y, m - 1 + step, Math.min(d, last)));
  }
  return addDays(day, step * (view === 'week' ? 7 : view === 'agenda' ? AGENDA_DAYS : 1));
}

export const bySchedule = (a: StudySession, b: StudySession) =>
  a.date.localeCompare(b.date) || (a.start || '99').localeCompare(b.start || '99') || a.createdAt - b.createdAt;

/** دقائق المذاكرة الفعلية لكل يوم. */
export function minutesByDay(sessions: StudySession[]): Record<string, number> {
  const days: Record<string, number> = {};
  for (const s of sessions) if (s.status === 'done') days[s.date] = (days[s.date] ?? 0) + s.actual;
  return days;
}
export const minutesBetween = (sessions: StudySession[], from: string, to: string) =>
  sessions.reduce((n, s) => n + (s.status === 'done' && s.date >= from && s.date <= to ? s.actual : 0), 0);

/** اليوم محقق إن بلغت دقائقه الهدف، أو أُنجزت كل أهدافه. */
export const achieved = (minutes: number, goals: DayGoals | undefined, target: number) =>
  (target > 0 && minutes >= target) || Boolean(goals?.items.length && goals.items.every((g) => g.done));

/**
 * أيام متتالية محققة حتى اليوم. يوم الراحة لا يقطع السلسلة،
 * واليوم الحالي لا يقطعها قبل أن ينتهي.
 */
export function streak(today: string, isAchieved: (day: string) => boolean, rest: number[], limit = HISTORY_DAYS): number {
  let count = 0;
  for (let i = 0; i <= limit; i++) {
    const day = addDays(today, -i);
    if (isAchieved(day)) count++;
    else if (i > 0 && !rest.includes(weekdayIndex(day))) break;
  }
  return count;
}
