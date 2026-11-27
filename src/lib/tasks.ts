import type { Priority, ResponseStatus, Task, TaskResponse } from '../data/types';
import { addDays, toKey } from './dates';

export const priorities: readonly Priority[] = ['urgent', 'high', 'normal', 'low'];
const rank = (p?: Priority) => priorities.indexOf(p ?? 'normal');
/** الأقرب موعداً، ثم الأعلى أولوية، ثم الأقدم إنشاءً. */
export const byUrgency = (a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate) || rank(a.priority) - rank(b.priority) || a.createdAt - b.createdAt;

export type Bucket = 'late' | 'today' | 'next' | 'waiting' | 'closed';
export function bucketOf(task: Task, status: ResponseStatus | undefined, today: string): Bucket {
  if (task.cancelled || status === 'done' || status === 'declined') return 'closed';
  if (status === 'submitted' || status === 'review') return 'waiting';
  if (task.dueDate < today) return 'late';
  return task.dueDate === today ? 'today' : 'next';
}

/** الحالة كما تظهر للعضو: حالته هو، أو المشتقة من المهمة وموعدها. */
export type ViewStatus = ResponseStatus | 'new' | 'late' | 'cancelled';
export function viewStatus(task: Task, status: ResponseStatus | undefined, today: string): ViewStatus {
  if (task.cancelled) return 'cancelled';
  if (status === 'done' || status === 'declined' || status === 'submitted' || status === 'review' || status === 'rejected') return status;
  if (task.dueDate < today) return 'late';
  return status ?? 'new';
}

/** ما يمكن للعضو فعله الآن. يطابق قواعد Firestore. */
export function memberOptions(task: Task, r: TaskResponse | undefined) {
  if (task.cancelled) return { reply: false, done: false, submit: false };
  if (!task.review) return { reply: true, done: true, submit: false };
  const final = r?.status === 'done' && Boolean(r.reviewedAt);
  const locked = final || r?.status === 'submitted' || r?.status === 'review';
  const submit = !final && r?.status !== 'review' && (!r?.version || !task.noResubmit);
  return { reply: !locked, done: false, submit };
}

export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'days';
export const MAX_OCCURRENCES = 40;
const parts = (key: string) => key.split('-').map(Number) as [number, number, number];
/**
 * مواعيد النسخ من أول موعد حتى تاريخ النهاية (يشمله).
 * الشهري يحافظ على يوم الشهر، ويأخذ آخر يوم في الشهور الأقصر.
 */
export function occurrences(first: string, repeat: Repeat, until: string, weekdays: number[] = []): string[] {
  if (repeat === 'none') return [first];
  const result: string[] = [];
  const [year, month, day] = parts(first);
  for (let i = 0; result.length < MAX_OCCURRENCES && i < 2000; i++) {
    let key: string;
    if (repeat === 'monthly') {
      const last = new Date(year, month - 1 + i + 1, 0).getDate();
      key = toKey(new Date(year, month - 1 + i, Math.min(day, last)));
    } else key = addDays(first, repeat === 'weekly' ? i * 7 : i);
    if (key > until) break;
    if (repeat === 'days') { const [y, m, d] = parts(key); if (!weekdays.includes(new Date(y, m - 1, d).getDay())) continue; }
    result.push(key);
  }
  return result;
}

/** عدد أيام التأخير: بين الموعد ويوم التسليم، أو حتى اليوم إن لم يُسلّم. */
export function lateDays(task: Task, response: TaskResponse | undefined, today: string): number {
  if (task.cancelled || response?.status === 'declined') return 0;
  const handed = response?.submittedAt ?? (response?.status === 'done' ? response.updatedAt : undefined);
  const end = handed ? toKey(new Date(handed)) : today;
  const days = (key: string) => { const [y, m, d] = parts(key); return Date.UTC(y, m - 1, d) / 86_400_000; };
  return Math.max(0, days(end) - days(task.dueDate));
}

/** CSV يفتحه Excel بالعربية. الخلايا التي تبدأ بمعادلة تُعطَّل. */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export interface Filters { status: 'all' | 'open' | 'done' | 'late' | 'waiting'; subject: string; priority: '' | Priority; scope: 'all' | 'class' | 'personal' | 'created'; text: string }
export const noFilters: Filters = { status: 'all', subject: '', priority: '', scope: 'all', text: '' };
export function filterTasks(tasks: Task[], f: Filters, statusOf: (id: string) => ResponseStatus | undefined, uid: string, today: string): Task[] {
  const needle = f.text.trim().toLocaleLowerCase();
  return tasks.filter((task) => {
    const bucket = bucketOf(task, statusOf(task.id), today);
    const status = statusOf(task.id);
    if (f.status === 'open' && !(bucket === 'today' || bucket === 'next' || bucket === 'late')) return false;
    if (f.status === 'done' && status !== 'done') return false;
    if (f.status === 'late' && bucket !== 'late') return false;
    if (f.status === 'waiting' && bucket !== 'waiting') return false;
    if (f.subject && task.subjectId !== (f.subject === 'general' ? '' : f.subject)) return false;
    if (f.priority && (task.priority ?? 'normal') !== f.priority) return false;
    if (f.scope === 'class' && task.personal) return false;
    if (f.scope === 'personal' && !task.personal) return false;
    if (f.scope === 'created' && task.createdBy !== uid) return false;
    return !needle || `${task.title} ${task.details}`.toLocaleLowerCase().includes(needle);
  });
}
