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
  const task = (id: string, title: string, subjectId: string, offset: number, details = '') => {
    db[`tasks/${id}`] = { title, details, subjectId, dueDate: addDays(today(), offset), audience: ['all'], createdBy: 'demo-admin', createdAt: now };
  };
  task('t1', 'حل شيت 3: النهايات', 'calculus-1', 0, 'المسائل من 1 إلى 8.');
  task('t2', 'رسم المساقط الثلاثة للوحة 2', 'technical-drawing', 0);
  task('t3', 'مراجعة محاضرة محصلة القوى', 'statics', 2);
  db['tasks/t1/responses/demo-student'] = { status: 'accepted', name: demoUsers.student.name, updatedAt: now };
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
  return db;
}

const DB_KEY = 'enghub.demo.db.v1';
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
