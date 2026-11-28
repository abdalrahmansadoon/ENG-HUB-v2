import { addDays, today } from '../lib/dates';
import { createLocalStore, type Persistence } from './localStore';
import type { Auth, AuthUser, Backend, Data } from './store';
import { defaultSubjects } from './subjects';

export const demoUsers: Record<'admin' | 'student', AuthUser> = {
  admin: { uid: 'demo-admin', email: 'admin@demo.local', name: 'المشرف (تجريبي)', photoURL: '', emailVerified: true },
  student: { uid: 'demo-student', email: 'student@demo.local', name: 'طالب (تجريبي)', photoURL: '', emailVerified: true },
};

function seed(): Record<string, Data> {
  const now = Date.now();
  const db: Record<string, Data> = {};
  for (const { id, ...s } of defaultSubjects) db[`subjects/${id}`] = s;
  db['admins/admin@demo.local'] = { active: true };
  for (const u of Object.values(demoUsers)) db[`profiles/${u.uid}`] = { name: u.name, photoURL: '' };
  const task = (id: string, title: string, subjectId: string, offset: number, details = '', extra: Data = {}) => {
    db[`tasks/${id}`] = { title, details, subjectId, dueDate: addDays(today(), offset), audience: ['all'], createdBy: 'demo-admin', createdAt: now, ...extra };
  };
  task('t1', 'حل شيت 3: النهايات', 'calculus-1', 0, 'المسائل من 1 إلى 8.', { priority: 'high' });
  task('t4', 'تقرير معمل الفيزياء', 'physics-1', 1, 'اكتب النتائج والاستنتاج.', { review: true, criteria: 'جدول القراءات ورسم بياني واستنتاج.' });
  task('t2', 'رسم المساقط الثلاثة للوحة 2', 'technical-drawing', 0);
  task('t3', 'مراجعة محاضرة محصلة القوى', 'statics', 2);
  db['tasks/t1/responses/demo-student'] = { status: 'accepted', name: demoUsers.student.name, startedAt: now, updatedAt: now };
  db['users/demo-student/tasks/p1'] = { title: 'تلخيص محاضرة المتجهات', details: '', subjectId: 'statics', dueDate: today(), priority: 'normal', createdAt: now };
  const item = (id: string, subjectId: string, category: string, title: string, url: string, group = '') => {
    db[`items/${id}`] = { subjectId, category, title, url, group, createdAt: now };
  };
  item('i1', 'calculus-1', 'lectures', 'مثال لمحاضرة فيديو', 'https://www.youtube.com/watch?v=WUvTyaaNkzM', 'مثال');
  item('i2', 'calculus-1', 'sheets', 'مثال لملف شيت', 'https://example.com/sheet.pdf');
  db['rooms/general/messages/m1'] = { uid: 'demo-admin', name: demoUsers.admin.name, text: 'أهلاً بكم في شات الدفعة. هذه رسالة تجريبية.', imageUrl: '', replyTo: '', createdAt: now };
  db['quizzes/q1'] = {
    title: 'اختبار قصير تجريبي', subjectId: 'physics-1', kind: 'mcq', pdfUrl: '', published: true, createdAt: now,
    questions: [
      { text: 'ما وحدة القوة في النظام الدولي؟', imageUrl: '', options: ['جول', 'نيوتن', 'وات', 'باسكال'] },
      { text: 'السرعة كمية:', imageUrl: '', options: ['قياسية', 'متجهة'] },
    ],
  };
  db['quizzes/q1/private/key'] = { answers: [1, 1] };
  // مذاكرة الطالب التجريبي: جلسات وأهداف وملاحظة وبطاقتان.
  const mine = (path: string, data: Data) => { db[`users/demo-student/${path}`] = data; };
  const session = (id: string, offset: number, subjectId: string, minutes: number, goal: string, extra: Data = {}) => mine(`sessions/${id}`, {
    subjectId, taskId: '', date: addDays(today(), offset), start: '', planned: minutes, actual: minutes, goal, notes: '', status: 'done', createdAt: now + offset, ...extra,
  });
  session('s1', -3, 'calculus-1', 70, 'مراجعة النهايات (مثال)');
  session('s2', -2, 'physics-1', 40, 'مسائل المتجهات (مثال)');
  session('s3', -1, 'statics', 65, 'محصلة القوى (مثال)', { start: '19:00' });
  session('s4', 0, 'calculus-1', 25, 'شيت 3 (مثال)', { start: '16:00', taskId: 't1' });
  session('s5', 0, 'statics', 45, 'محاضرة محصلة القوى (مثال)', { start: '21:00', taskId: 't3', status: 'planned', actual: 0 });
  mine('settings/planner', { target: 60, rest: [5] });
  mine(`goals/${today()}`, { date: today(), items: [{ text: 'حل 4 مسائل نهايات (مثال)', done: true }, { text: 'رسم المسقط الأفقي (مثال)', done: false }] });
  mine('notes/n1', {
    title: 'قاعدة لوبيتال (ملاحظة مثال)', subjectId: 'calculus-1', itemId: 'i1', tags: ['نهايات', 'قوانين'], images: [], createdAt: now, updatedAt: now,
    body: 'عند الصورة $\\frac{0}{0}$ نشتق البسط والمقام:\n$$\\lim_{x \\to a} \\frac{f(x)}{g(x)} = \\lim_{x \\to a} \\frac{f\'(x)}{g\'(x)}$$\nمثال: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$',
  });
  mine('decks/d1', { name: 'وحدات الفيزياء (مثال)', subjectId: 'physics-1', createdAt: now });
  const card = (id: string, front: string, back: string) => mine(`cards/${id}`, {
    deckId: 'd1', front, back, image: '', tags: [], difficulty: 'medium', ease: 2.5, interval: 0, due: today(), reviews: 0, lapses: 0, history: [], createdAt: now,
  });
  card('c1', 'ما وحدة الشغل؟', 'الجول: $J = N \\cdot m$');
  card('c2', 'اكتب قانون نيوتن الثاني.', '$$\\vec F = m \\vec a$$');
  const announce = (id: string, title: string, kind: string, extra: Data = {}) => {
    db[`announcements/${id}`] = { title, body: '', kind, date: '', subjectId: '', pinned: false, createdBy: 'demo-admin', createdAt: now, ...extra };
  };
  announce('a1', 'امتحان منتصف الترم في الفيزياء (مثال)', 'exam', { body: 'من أول المنهج حتى محاضرة المتجهات.', date: addDays(today(), 9), subjectId: 'physics-1', pinned: true });
  announce('a2', 'تغيير موعد سكشن الرسم (مثال)', 'schedule', { date: addDays(today(), 3), subjectId: 'technical-drawing', createdAt: now - 3_600_000 });
  return db;
}

const DB_KEY = 'enghub.demo.db.v3';
const USER_KEY = 'enghub.demo.user';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* التخزين غير متاح */ }
};

export function createDemoBackend(): Backend {
  const persistence: Persistence = {
    load: () => { try { return JSON.parse(read(DB_KEY) ?? 'null'); } catch { return null; } },
    save: (db) => write(DB_KEY, JSON.stringify(db)),
  };
  const listeners = new Set<(u: AuthUser | null) => void>();
  const current = (): AuthUser | null => {
    const key = read(USER_KEY) as keyof typeof demoUsers | null;
    return key && demoUsers[key] ? demoUsers[key] : null;
  };
  let user = current();
  const switchTo = async (key: keyof typeof demoUsers | null) => {
    write(USER_KEY, key); user = key ? demoUsers[key] : null; listeners.forEach((l) => l(user));
  };
  const auth: Auth = {
    watch: (next) => { listeners.add(next); next(user); return () => { listeners.delete(next); }; },
    google: () => switchTo('student'),
    signIn: (email) => switchTo(email.startsWith('admin') ? 'admin' : 'student'),
    signUp: () => switchTo('student'),
    resetPassword: async () => {},
    verifyEmail: async () => {},
    signOut: () => switchTo(null),
  };
  return { demo: true, store: createLocalStore(seed, persistence), auth };
}
