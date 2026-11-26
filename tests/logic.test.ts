import { describe, expect, it } from 'vitest';
import { createLocalStore } from '../src/data/localStore';
import { NOW } from '../src/data/store';
import { addDays } from '../src/lib/dates';
import { kindOf } from '../src/lib/cloudinary';
import { score } from '../src/lib/quiz';
import { bucketOf } from '../src/lib/tasks';
import { resolveMedia, safeUrl } from '../src/lib/video';

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
