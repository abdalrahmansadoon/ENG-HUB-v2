import { describe, expect, it } from 'vitest';
import type { StudySession, Task, TaskResponse } from '../src/data/types';
import { percent, subjectActivity, taskFigures } from '../src/lib/analytics';
import { MAX_INTERVAL, schedule } from '../src/lib/cards';
import { addDays, weekdayIndex } from '../src/lib/dates';
import { splitMath } from '../src/lib/math';
import { buildNotices, dismiss, emptyInbox, groupNotices, isQuiet, isRead, markAllRead, markRead, visible } from '../src/lib/notifications';
import { achieved, minutesBetween, monthGrid, shiftDate, streak, weekStart } from '../src/lib/planner';
import { advance, defaultPomodoro, focusedMinutes, fresh, normalizeSettings, pause, remaining, start } from '../src/lib/pomodoro';
import { normalize, remember, search, type Entry } from '../src/lib/search';
import { parseTags } from '../src/lib/tags';

const session = (date: string, actual: number, extra: Partial<StudySession> = {}): StudySession =>
  ({ id: date, subjectId: 'a', taskId: '', date, start: '', planned: actual, actual, goal: '', notes: '', status: 'done', createdAt: 0, ...extra });
const task = (id: string, dueDate: string, extra: Partial<Task> = {}): Task =>
  ({ id, title: id, details: '', subjectId: 'a', dueDate, audience: ['all'], createdBy: 'admin', createdAt: Date.parse('2026-03-01'), ...extra });
const reply = (status: TaskResponse['status'], extra: Partial<TaskResponse> = {}): TaskResponse =>
  ({ id: 'me', name: 'me', status, updatedAt: Date.parse('2026-03-03T12:00:00'), ...extra });

describe('خطة المذاكرة', () => {
  it('الأسبوع يبدأ بالسبت وشبكة الشهر أسابيع كاملة', () => {
    expect(weekdayIndex(weekStart('2026-11-26'))).toBe(6);
    const grid = monthGrid('2026-11-15');
    expect(grid.length % 7).toBe(0);
    expect(grid).toContain('2026-11-01');
    expect(grid).toContain('2026-11-30');
    expect(weekdayIndex(grid[0])).toBe(6);
  });
  it('التنقل بين الشهور لا يقفز فوق شهر قصير', () => {
    expect(shiftDate('month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftDate('week', '2026-01-31', -1)).toBe('2026-01-24');
  });
  it('تحسب الدقائق الفعلية فقط', () => {
    const list = [session('2026-03-01', 30), session('2026-03-02', 40, { status: 'planned' }), session('2026-03-09', 10)];
    expect(minutesBetween(list, '2026-03-01', '2026-03-07')).toBe(30);
  });
  it('اليوم محقق بالدقائق أو بإنهاء الأهداف', () => {
    expect(achieved(60, undefined, 60)).toBe(true);
    expect(achieved(10, { id: 'd', date: 'd', items: [{ text: 'x', done: true }] }, 60)).toBe(true);
    expect(achieved(10, { id: 'd', date: 'd', items: [] }, 60)).toBe(false);
  });
  it('الراحة واليوم الحالي لا يقطعان السلسلة', () => {
    const today = '2026-11-28'; // سبت
    const met = new Set([addDays(today, -2), addDays(today, -3)]); // الجمعة بينهما راحة
    expect(streak(today, (d) => met.has(d), [5])).toBe(2);
    expect(streak(today, (d) => met.has(d), [])).toBe(0);
  });
});

describe('المؤقت', () => {
  it('يصحح الإعدادات المحفوظة الفاسدة', () => {
    expect(normalizeSettings({ focus: 999, short: 'x', every: 3 })).toMatchObject({ focus: 25, short: 5, every: 3, sound: true });
  });
  it('الإيقاف يحفظ المتبقي', () => {
    const running = start(fresh(defaultPomodoro), 1000);
    const paused = pause(running, 1000 + 5 * 60_000);
    expect(remaining(paused, 10 ** 12)).toBe(20 * 60_000);
    expect(focusedMinutes(paused, 10 ** 12)).toBe(5);
  });
  it('استراحة طويلة بعد أربع جولات، والتخطي لا يحتسب', () => {
    const fourth = fresh(defaultPomodoro, 'focus', 3);
    expect(advance(fourth, defaultPomodoro, true)).toMatchObject({ phase: 'long', rounds: 4 });
    expect(advance(fourth, defaultPomodoro, false)).toMatchObject({ phase: 'short', rounds: 3 });
  });
});

describe('التكرار المتباعد', () => {
  const card: Parameters<typeof schedule>[0] = { ease: 2.5, interval: 0, reviews: 0, lapses: 0, history: [] };
  it('تتباعد المواعيد مع التذكر', () => {
    const first = schedule(card, 2, '2026-03-01', 1);
    expect(first.due).toBe('2026-03-02');
    const second = schedule(first, 2, first.due, 2);
    expect(second.interval).toBe(3);
    expect(schedule(second, 2, second.due, 3).interval).toBeGreaterThan(3);
  });
  it('النسيان يعيد البطاقة اليوم ويسجل ذلك', () => {
    expect(schedule({ ...card, interval: 20 }, 0, '2026-03-01', 1)).toMatchObject({ interval: 0, due: '2026-03-01', lapses: 1 });
  });
  it('لا تتجاوز سنة ويبقى السجل محدوداً', () => {
    let state = { ...card, interval: 300 };
    for (let i = 0; i < 25; i++) state = schedule(state, 3, '2026-03-01', i);
    expect(state.interval).toBe(MAX_INTERVAL);
    expect(state.history).toHaveLength(20);
    expect(state.ease).toBeLessThanOrEqual(3.2);
  });
});

describe('المعادلات والوسوم', () => {
  it('تفصل المعادلة عن النص ولا تعد الأسعار معادلة', () => {
    expect(splitMath('قيمة $x^2$ هنا').map((p) => p.type)).toEqual(['text', 'inline', 'text']);
    expect(splitMath('$$a+b$$')).toEqual([{ type: 'block', value: 'a+b' }]);
    expect(splitMath('5$ و 10$')).toEqual([{ type: 'text', value: '5$ و 10$' }]);
    expect(splitMath('\\$x$')).toEqual([{ type: 'text', value: '$x$' }]);
  });
  it('الوسوم دون تكرار وبحد عشرة', () => {
    expect(parseTags('أ، ب, أ')).toEqual(['أ', 'ب']);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => i).join(','))).toHaveLength(10);
  });
});

describe('البحث', () => {
  const entry = (id: string, title: string, body = '', type: Entry['type'] = 'task'): Entry => ({ id, type, title, body, subjectId: 'a', to: '/' });
  it('يوحد الكتابة العربية', () => { expect(normalize('إِحْصَاءٌ ٣ مكتبة')).toBe('احصاء 3 مكتبه'); });
  it('العنوان يسبق النص ويحترم النوع', () => {
    const list = [entry('1', 'مراجعة', 'النهايات'), entry('2', 'النهايات'), entry('3', 'النهايات', '', 'note')];
    expect(search(list, 'النهايات').map((e) => e.id)).toEqual(['2', '3', '1']);
    expect(search(list, 'النهايات', { type: 'note' })).toHaveLength(1);
    expect(search(list, '  ')).toEqual([]);
  });
  it('يحفظ آخر عمليات البحث دون تكرار', () => { expect(remember(['احصاء', 'فيزياء'], 'إحصاء')).toEqual(['إحصاء', 'فيزياء']); });
});

describe('الإشعارات', () => {
  const now = Date.parse('2026-03-02T10:00:00');
  const base = { uid: 'me', isAdmin: false, today: '2026-03-02', now, tasks: [task('t', '2026-03-03')], responses: {}, items: [], quizzes: [], announcements: [] };
  it('لا يذكر بالموعد قبل معرفة الردود', () => {
    expect(buildNotices(base).map((n) => n.kind)).toEqual(['newTask']);
    expect(buildNotices({ ...base, responses: { t: [] } }).map((n) => n.kind).sort()).toEqual(['dueSoon', 'newTask']);
    expect(buildNotices({ ...base, responses: { t: [reply('done')] } }).map((n) => n.kind)).toEqual(['newTask']);
  });
  it('المشرف يرى التسليمات لا المحتوى الجديد', () => {
    const list = buildNotices({
      ...base, uid: 'admin', isAdmin: true, responses: { t: [reply('submitted', { version: 1 })] },
      items: [{ id: 'i', subjectId: 'a', category: 'lectures', title: 'x', url: '', group: '', createdAt: now }],
    });
    expect(list.map((n) => n.kind)).toContain('submitted');
    expect(list.map((n) => n.kind)).not.toContain('newItem');
  });
  it('القراءة والحذف والتجميع', () => {
    const list = buildNotices({ ...base, tasks: [task('a', '2026-03-20'), task('b', '2026-03-21')] });
    expect(groupNotices(list)).toHaveLength(1);
    const all = markAllRead(emptyInbox, now);
    expect(list.every((n) => isRead(n, all))).toBe(true);
    expect(isRead(list[0], markRead(all, [list[0].id], false))).toBe(false);
    expect(visible(list, dismiss(all, [list[0].id]))).toHaveLength(1);
    expect(visible(list, { ...all, off: ['tasks'] })).toHaveLength(0);
  });
  it('ساعات الهدوء تمتد بعد منتصف الليل', () => {
    expect(isQuiet('23:30', '22:00', '07:00')).toBe(true);
    expect(isQuiet('12:00', '22:00', '07:00')).toBe(false);
    expect(isQuiet('12:00', '', '')).toBe(false);
  });
});

describe('الإحصاءات', () => {
  it('لا تحسب المعتذر عنها ولا الملغاة', () => {
    const tasks = [task('a', '2026-03-03'), task('b', '2026-03-03'), task('c', '2026-03-01'), task('d', '2026-03-02', { cancelled: true })];
    const replies: Record<string, TaskResponse> = { a: reply('done'), b: reply('declined') };
    expect(taskFigures(tasks, (id) => replies[id], 'me', '2026-03-01', '2026-03-04')).toEqual({ assigned: 2, completed: 1, onTime: 1, overdue: 1 });
    expect(percent(0, 0)).toBeNull();
  });
  it('ترتب المواد حسب النشاط', () => {
    const rows = subjectActivity([], () => undefined, 'me', [session('2026-03-02', 120, { subjectId: 'b' }), session('2026-03-02', 10)], [], '2026-03-01', '2026-03-03');
    expect(rows.map((r) => r.subjectId)).toEqual(['b', 'a']);
  });
});
