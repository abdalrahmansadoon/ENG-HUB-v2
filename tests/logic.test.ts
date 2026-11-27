import { describe, expect, it } from 'vitest';
import { createLocalStore } from '../src/data/localStore';
import { NOW } from '../src/data/store';
import { addDays } from '../src/lib/dates';
import { kindOf } from '../src/lib/cloudinary';
import { score } from '../src/lib/quiz';
import { bucketOf, byUrgency, filterTasks, lateDays, MAX_OCCURRENCES, memberOptions, noFilters, occurrences, toCsv, viewStatus } from '../src/lib/tasks';
import { itemKind, resolveMedia, safeUrl } from '../src/lib/video';

describe('الروابط', () => {
  it('ترفض الروابط غير الآمنة', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('data:text/html,x')).toBe('');
    expect(resolveMedia('نص عادي')).toBeNull();
  });
  it('تتعرف على يوتيوب ودرايف وملف الفيديو', () => {
    const yt = { type: 'embed', src: 'https://www.youtube-nocookie.com/embed/WUvTyaaNkzM' };
    expect(resolveMedia('https://youtu.be/WUvTyaaNkzM?t=3')).toEqual(yt);
    expect(resolveMedia('https://www.youtube.com/watch?v=WUvTyaaNkzM')).toEqual(yt);
    expect(resolveMedia('https://youtube.com/shorts/WUvTyaaNkzM')).toEqual(yt);
    expect(resolveMedia('https://drive.google.com/file/d/abc_123/view')?.src).toBe('https://drive.google.com/file/d/abc_123/preview');
    expect(resolveMedia('https://x.com/a.MP4')?.type).toBe('file');
    expect(resolveMedia('https://youtube.com.evil.test/watch?v=WUvTyaaNkzM')?.type).toBe('link');
  });
});

describe('المهام والاختبارات', () => {
  const task = { id: '1', title: '', details: '', subjectId: '', dueDate: '2026-03-01', audience: ['all'], createdBy: '', createdAt: 0 };
  it('تصنف المهمة حسب التاريخ والحالة', () => {
    expect(bucketOf(task, undefined, '2026-03-02')).toBe('late');
    expect(bucketOf(task, 'accepted', '2026-03-01')).toBe('today');
    expect(bucketOf(task, undefined, '2026-02-28')).toBe('next');
    expect(bucketOf(task, 'done', '2026-03-02')).toBe('closed');
  });
  it('تحسب الدرجة', () => { expect(score([1, 0, 2], [1, 1, 2])).toBe(2); });
  it('تعبر حدود الشهر', () => { expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); });
});

describe('المخزن المحلي', () => {
  it('يفلتر ويرتب ولا يخلط المجموعات الفرعية', async () => {
    const store = createLocalStore(() => ({
      'tasks/a': { audience: ['all'], n: 2 }, 'tasks/b': { audience: ['u2'], n: 1 },
      'tasks/c': { audience: ['u1'], n: 3 }, 'tasks/a/comments/x': { text: 'hi' },
    }));
    const ids = await new Promise<string[]>((resolve) => {
      store.watch('tasks', { where: ['audience', 'array-contains-any', ['all', 'u1']], orderBy: ['n', 'asc'] },
        (d) => resolve(d.map((x) => x.id)), () => {});
    });
    expect(ids).toEqual(['a', 'c']);
  });
  it('يستبدل الوقت ويرفض تحديث مستند غير موجود', async () => {
    const store = createLocalStore(() => ({}));
    await store.set('a/1', { at: NOW });
    expect(typeof (await store.list('a'))[0].at).toBe('number');
    await expect(store.update('a/2', {})).rejects.toThrow();
  });
});

describe('الرفع', () => {
  it('يحدد نوع الملف من امتداده ويرفض غيره', () => {
    expect(kindOf('Lecture.PDF')).toBe('raw');
    expect(kindOf('a.b.jpeg')).toBe('image');
    expect(kindOf('clip.mov')).toBe('video');
    expect(kindOf('run.exe')).toBeNull();
  });
});

describe('نوع المحتوى', () => {
  it('يميز الفيديو والملف ورابط درايف', () => {
    expect(itemKind('https://youtu.be/WUvTyaaNkzM')).toBe('video');
    expect(itemKind('https://res.cloudinary.com/x/raw/upload/v1/eng-hub/a.pdf')).toBe('pdf');
    expect(itemKind('https://drive.google.com/file/d/abc_123/view')).toBe('drive');
    expect(itemKind('https://example.com/page')).toBe('link');
  });
});

import { defaultLayout, homeSections, moveSection, normalizeLayout, taskStats, weekActivity } from '../src/lib/home';
import { relativeDay } from '../src/lib/dates';

describe('home page', () => {
  it('repairs any saved layout', () => {
    expect(normalizeLayout(null)).toEqual(defaultLayout());
    const fixed = normalizeLayout({ order: ['updates', 'bogus', 'updates'], hidden: ['activity', 7] });
    expect(fixed.order).toHaveLength(homeSections.length);
    expect(fixed.order[0]).toBe('updates');
    expect(fixed.hidden).toEqual(['activity']);
  });
  it('moves a section and ignores moves past the ends', () => {
    const start = defaultLayout();
    expect(moveSection(start, 'activity', -1).order.slice(0, 2)).toEqual(['activity', 'today']);
    expect(moveSection(start, 'today', -1)).toBe(start);
  });
  it('counts only my tasks that I did not decline', () => {
    const task = (id: string, dueDate: string, audience = ['all']) => ({ id, title: id, details: '', subjectId: '', dueDate, audience, createdBy: 'a', createdAt: 0 });
    const status = { b: 'done', d: 'declined' } as const;
    const stats = taskStats([task('a', '2026-01-01'), task('b', '2026-01-01'), task('c', '2026-03-01'), task('d', '2026-03-01'), task('e', '2026-03-01', ['other'])],
      (id) => status[id as 'b'], 'me', '2026-02-01');
    expect(stats).toEqual({ total: 3, done: 1, pending: 1, overdue: 1 });
  });
  it('buckets activity into the last seven local days', () => {
    const noon = (d: number) => new Date(2026, 2, d, 12).getTime();
    const days = weekActivity('2026-03-10', [noon(10), noon(10), noon(3)], [noon(4)]);
    expect(days.map((d) => d.day)[0]).toBe('2026-03-04');
    expect(days.at(-1)).toEqual({ day: '2026-03-10', done: 2, studied: 0 });
    expect(days[0]).toEqual({ day: '2026-03-04', done: 0, studied: 1 });
  });
  it('names days relative to today', () => {
    expect(relativeDay('2026-03-01', '2026-02-28', 'en')).toBe('tomorrow');
    expect(relativeDay('2026-02-25', '2026-02-28', 'en')).toBe('3 days ago');
  });
});

describe('نظام المهام', () => {
  const task = { id: '1', title: 'شيت النهايات', details: '', subjectId: 'calc', dueDate: '2026-03-10', audience: ['all'], createdBy: 'boss', createdAt: 0 };
  const response = (extra = {}) => ({ id: 'u', name: 'u', status: 'accepted' as const, updatedAt: 0, ...extra });

  it('تولد مواعيد التكرار', () => {
    expect(occurrences('2026-03-01', 'none', '2026-03-30')).toEqual(['2026-03-01']);
    expect(occurrences('2026-02-27', 'daily', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(occurrences('2026-03-01', 'weekly', '2026-03-21')).toEqual(['2026-03-01', '2026-03-08', '2026-03-15']);
    // الشهري يحتفظ بيوم 31 ويقصره في الشهور الأقصر.
    expect(occurrences('2026-01-31', 'monthly', '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
    // 1 مارس 2026 أحد: الأحد (0) والثلاثاء (2).
    expect(occurrences('2026-03-01', 'days', '2026-03-10', [0, 2])).toEqual(['2026-03-01', '2026-03-03', '2026-03-08', '2026-03-10']);
    expect(occurrences('2026-03-05', 'daily', '2026-03-01')).toEqual([]);
    expect(occurrences('2026-01-01', 'daily', '2027-01-01')).toHaveLength(MAX_OCCURRENCES);
  });
  it('تفرق بين المنتظر والمتأخر والملغى', () => {
    expect(bucketOf(task, 'submitted', '2026-03-20')).toBe('waiting');
    expect(bucketOf(task, 'rejected', '2026-03-20')).toBe('late');
    expect(bucketOf({ ...task, cancelled: true }, undefined, '2026-03-20')).toBe('closed');
    expect(viewStatus(task, 'accepted', '2026-03-09')).toBe('accepted');
    expect(viewStatus(task, 'accepted', '2026-03-11')).toBe('late');
    expect(viewStatus(task, undefined, '2026-03-09')).toBe('new');
  });
  it('تحسب أيام التأخير حتى التسليم', () => {
    expect(lateDays(task, undefined, '2026-03-13')).toBe(3);
    expect(lateDays(task, response({ submittedAt: new Date(2026, 2, 12, 23).getTime() }), '2026-04-01')).toBe(2);
    expect(lateDays(task, response({ status: 'done', updatedAt: new Date(2026, 2, 9).getTime() }), '2026-04-01')).toBe(0);
    expect(lateDays(task, response({ status: 'declined' }), '2026-04-01')).toBe(0);
  });
  it('تعطي العضو ما تسمح به القواعد فقط', () => {
    const review = { ...task, review: true };
    expect(memberOptions(task, undefined)).toEqual({ reply: true, done: true, submit: false });
    expect(memberOptions(review, undefined)).toEqual({ reply: true, done: false, submit: true });
    expect(memberOptions(review, response({ status: 'submitted', version: 1 }))).toEqual({ reply: false, done: false, submit: true });
    expect(memberOptions({ ...review, noResubmit: true }, response({ status: 'rejected', version: 1 })).submit).toBe(false);
    expect(memberOptions(review, response({ status: 'review', version: 1 })).submit).toBe(false);
    expect(memberOptions(review, response({ status: 'done', version: 1, reviewedAt: 5 }))).toEqual({ reply: false, done: false, submit: false });
    expect(memberOptions({ ...task, cancelled: true }, undefined).reply).toBe(false);
  });
  it('ترتب وتصفي', () => {
    const list = [{ ...task, id: 'a' }, { ...task, id: 'b', priority: 'urgent' as const, title: 'تقرير', subjectId: '' }, { ...task, id: 'c', dueDate: '2026-03-01', personal: true, createdBy: 'u' }];
    expect([...list].sort(byUrgency).map((x) => x.id)).toEqual(['c', 'b', 'a']);
    const ids = (f: Partial<typeof noFilters>) => filterTasks(list, { ...noFilters, ...f }, (id) => (id === 'a' ? 'done' : undefined), 'u', '2026-03-05').map((x) => x.id);
    expect(ids({})).toEqual(['a', 'b', 'c']);
    expect(ids({ status: 'done' })).toEqual(['a']);
    expect(ids({ status: 'late' })).toEqual(['c']);
    expect(ids({ subject: 'general' })).toEqual(['b']);
    expect(ids({ priority: 'normal' })).toEqual(['a', 'c']);
    expect(ids({ scope: 'class' })).toEqual(['a', 'b']);
    expect(ids({ scope: 'created' })).toEqual(['c']);
    expect(ids({ text: 'تقرير' })).toEqual(['b']);
  });
  it('تصدّر CSV آمناً', () => {
    expect(toCsv([['الاسم', 'العدد'], ['=HYPERLINK("x")', 2], ['a,"b"', 0]]))
      .toBe('﻿"الاسم","العدد"\r\n"\'=HYPERLINK(""x"")","2"\r\n"a,""b""","0"');
  });
});
