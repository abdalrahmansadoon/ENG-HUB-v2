/// <reference types="node" />
/**
 * اختبارات firestore.rules على محاكي Firebase.
 * تُتخطى دون المحاكي؛ تعمل في GitHub Actions (rules.yml).
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { resolvePath } from '../src/data/firebase';

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('قواعد Firestore', () => {
  let env: RulesTestEnvironment;

  const as = (uid: string, token: Record<string, unknown> = {}) =>
    env.authenticatedContext(uid, { email: `${uid}@x.test`, email_verified: true, ...token }).firestore() as unknown as Firestore;
  const admin = () => as('boss');
  const sara = () => as('sara');
  const omar = () => as('omar');
  const guest = () => env.unauthenticatedContext().firestore() as unknown as Firestore;
  const at = (db: Firestore, path: string) => doc(db, resolvePath(path));
  const many = (db: Firestore, path: string) => collection(db, resolvePath(path));

  const message = (uid: string, name: string, extra = {}) =>
    ({ uid, name, text: 'مرحبا', imageUrl: '', replyTo: '', createdAt: serverTimestamp(), ...extra });
  const response = (name: string) => ({ status: 'done', name, updatedAt: serverTimestamp() });

  beforeAll(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-enghub', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  });
  afterAll(async () => { await env.cleanup(); });

  beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      const seed: [string, Record<string, unknown>][] = [
        ['admins/boss@x.test', { email: 'boss@x.test', active: true, role: 'super-admin' }],
        ['admins/gone@x.test', { email: 'gone@x.test', active: false, role: 'admin' }],
        ['profiles/boss', { name: 'Boss', photoURL: '' }],
        ['profiles/sara', { name: 'Sara', photoURL: '' }],
        ['profiles/omar', { name: 'Omar', photoURL: '' }],
        ['subjects/calc', { name: 'تفاضل', order: 1 }],
        ['tasks/all', { audience: ['all'], title: 'a' }],
        ['tasks/omarOnly', { audience: ['omar'], title: 'b' }],
        ['quizzes/open', { published: true, questions: [{}, {}] }],
        ['quizzes/open/private/key', { answers: [0, 1] }],
        ['quizzes/draft', { published: false, questions: [{}] }],
        ['quizzes/draft/private/key', { answers: [0] }],
      ];
      for (const [path, data] of seed) await setDoc(at(db, path), data);
    });
  });

  it('الزائر لا يقرأ شيئاً', async () => {
    await assertFails(getDoc(at(guest(), 'subjects/calc')));
    await assertFails(getDocs(many(guest(), 'profiles')));
  });

  it('سجل المشرف: يقرؤه صاحبه فقط ولا يكتبه أحد', async () => {
    await assertSucceeds(getDoc(at(admin(), 'admins/boss@x.test')));
    await assertSucceeds(getDoc(at(sara(), 'admins/sara@x.test')));
    await assertFails(getDoc(at(sara(), 'admins/boss@x.test')));
    await assertFails(setDoc(at(sara(), 'admins/sara@x.test'), { active: true }));
  });

  it('المحتوى يكتبه المشرف النشط صاحب البريد المؤكد فقط', async () => {
    const data = { name: 'x', order: 2 };
    await assertSucceeds(setDoc(at(admin(), 'subjects/new'), data));
    await assertSucceeds(setDoc(at(admin(), 'items/new'), data));
    await assertFails(setDoc(at(sara(), 'subjects/new2'), data));
    await assertFails(setDoc(at(sara(), 'tasks/new'), data));
    await assertFails(setDoc(at(as('boss', { email_verified: false }), 'subjects/new3'), data));
    await assertFails(setDoc(at(as('gone'), 'subjects/new4'), data));
    await assertSucceeds(getDocs(query(many(sara(), 'subjects'), orderBy('order', 'asc'))));
  });

  it('الملف الشخصي والتقدم لصاحبهما', async () => {
    await assertSucceeds(setDoc(at(as('new'), 'profiles/new'), { name: 'New', photoURL: '' }));
    await assertFails(setDoc(at(sara(), 'profiles/omar'), { name: 'x', photoURL: '' }));
    await assertFails(setDoc(at(sara(), 'profiles/sara'), { name: 'x', photoURL: '', admin: true }));
    await assertSucceeds(setDoc(at(sara(), 'users/sara/progress/i1'), { subjectId: 'calc', at: serverTimestamp() }));
    await assertSucceeds(getDocs(many(sara(), 'users/sara/progress')));
    await assertFails(getDocs(many(omar(), 'users/sara/progress')));
  });

  it('المهام تظهر لمن تخصه', async () => {
    await assertSucceeds(getDocs(query(many(sara(), 'tasks'), where('audience', 'array-contains-any', ['all', 'sara']))));
    await assertFails(getDocs(many(sara(), 'tasks')));
    await assertFails(getDoc(at(sara(), 'tasks/omarOnly')));
    await assertSucceeds(getDoc(at(omar(), 'tasks/omarOnly')));
    await assertSucceeds(getDocs(many(admin(), 'tasks')));
  });

  it('الردود والتعليقات باسم صاحبها وعلى مهمته', async () => {
    await assertSucceeds(setDoc(at(sara(), 'tasks/all/responses/sara'), response('Sara')));
    await assertSucceeds(getDocs(many(omar(), 'tasks/all/responses')));
    await assertFails(setDoc(at(sara(), 'tasks/all/responses/sara'), response('Omar')));
    await assertFails(setDoc(at(sara(), 'tasks/all/responses/omar'), response('Sara')));
    await assertFails(setDoc(at(sara(), 'tasks/omarOnly/responses/sara'), response('Sara')));
    await assertFails(getDocs(many(sara(), 'tasks/omarOnly/responses')));
    await assertSucceeds(deleteDoc(at(sara(), 'tasks/all/responses/sara')));
    const comment = { uid: 'sara', name: 'Sara', text: 'ok', createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(at(sara(), 'tasks/all/comments/c1'), comment));
    await assertSucceeds(getDocs(query(many(omar(), 'tasks/all/comments'), orderBy('createdAt', 'asc'))));
    await assertFails(deleteDoc(at(omar(), 'tasks/all/comments/c1')));
    await assertFails(setDoc(at(omar(), 'tasks/all/comments/c2'), comment));
  });

  const stamp = () => serverTimestamp();
  const reply = (db: Firestore, path: string, data: Record<string, unknown>) => setDoc(at(db, path), data, { merge: true });
  const solution = (version: number, extra = {}) => ({ text: 'حلي', urls: [], names: [], link: '', version, at: stamp(), ...extra });
  /** تسليم كما يفعله الموقع: النسخة والرد في دفعة واحدة. */
  function submit(db: Firestore, task: string, uid: string, name: string, version: number, extra = {}) {
    const path = `tasks/${task}/responses/${uid}`;
    const batch = writeBatch(db);
    batch.set(at(db, `${path}/submissions/${version}`), solution(version, extra), { merge: true });
    batch.set(at(db, path), { status: 'submitted', name, updatedAt: stamp(), version, submittedAt: stamp() }, { merge: true });
    return batch.commit();
  }
  function review(db: Firestore, uid: string, name: string, version: number, verdict: string) {
    const path = `tasks/hand/responses/${uid}`;
    const by = { reviewedBy: 'boss', reviewedAt: stamp() };
    const batch = writeBatch(db);
    batch.set(at(db, path), { status: verdict, name, updatedAt: stamp(), ...by }, { merge: true });
    batch.set(at(db, `${path}/submissions/${version}`), { verdict, reviewNote: 'ملاحظة', ...by }, { merge: true });
    return batch.commit();
  }
  const seedTask = (id: string, data: Record<string, unknown>) => env.withSecurityRulesDisabled(async (context) => {
    await setDoc(at(context.firestore() as unknown as Firestore, `tasks/${id}`), { audience: ['all'], title: id, ...data });
  });

  it('علامة القواعد الجديدة يقرؤها كل مسجل', async () => {
    await assertSucceeds(getDoc(at(sara(), 'meta/r2')));
    await assertFails(getDoc(at(guest(), 'meta/r2')));
    await assertFails(setDoc(at(admin(), 'meta/r2'), { a: 1 }));
  });

  it('المهمة الشخصية لصاحبها وحده', async () => {
    const mine = { title: 'مذاكرة', details: '', subjectId: '', dueDate: '2026-12-01', priority: 'high', links: [], createdAt: stamp() };
    await assertSucceeds(setDoc(at(sara(), 'users/sara/tasks/p1'), mine));
    await assertSucceeds(getDocs(many(sara(), 'users/sara/tasks')));
    await assertSucceeds(updateDoc(at(sara(), 'users/sara/tasks/p1'), { done: true, doneAt: stamp() }));
    await assertFails(updateDoc(at(sara(), 'users/sara/tasks/p1'), { createdAt: stamp() }));
    await assertFails(updateDoc(at(sara(), 'users/sara/tasks/p1'), { audience: ['all'] }));
    await assertFails(setDoc(at(sara(), 'users/sara/tasks/p2'), { ...mine, priority: 'max' }));
    await assertFails(setDoc(at(sara(), 'users/sara/tasks/p3'), { ...mine, title: '' }));
    await assertFails(getDoc(at(omar(), 'users/sara/tasks/p1')));
    await assertFails(getDocs(many(admin(), 'users/sara/tasks')));
    await assertFails(setDoc(at(omar(), 'users/sara/tasks/p4'), mine));
    await assertSucceeds(deleteDoc(at(sara(), 'users/sara/tasks/p1')));
  });

  it('التسليم: نسخ لا تتغير ولا إنجاز دون قبول المشرف', async () => {
    await seedTask('hand', { review: true });
    const path = 'tasks/hand/responses/sara';
    await assertSucceeds(reply(sara(), path, { status: 'accepted', name: 'Sara', updatedAt: stamp(), startedAt: stamp() }));
    await assertFails(reply(sara(), path, { status: 'done', name: 'Sara', updatedAt: stamp() }));
    // لا حالة «مُسلَّم» دون نسخة، ولا نسخة دون رد.
    await assertFails(reply(sara(), path, { status: 'submitted', name: 'Sara', updatedAt: stamp(), version: 1, submittedAt: stamp() }));
    await assertFails(setDoc(at(sara(), `${path}/submissions/1`), solution(1)));
    await assertFails(submit(sara(), 'hand', 'sara', 'Sara', 2));
    await assertFails(submit(sara(), 'hand', 'sara', 'Sara', 1, { urls: ['https://evil.test/a.pdf'], names: ['a'] }));
    await assertFails(submit(sara(), 'hand', 'sara', 'Sara', 1, { link: 'javascript:alert(1)' }));
    await assertFails(submit(sara(), 'hand', 'sara', 'Sara', 1, { text: '' }));
    await assertFails(submit(omar(), 'hand', 'sara', 'Omar', 1));
    await assertSucceeds(submit(sara(), 'hand', 'sara', 'Sara', 1, { urls: ['https://res.cloudinary.com/x/a.pdf'], names: ['a.pdf'] }));
    await assertFails(updateDoc(at(sara(), `${path}/submissions/1`), { text: 'غيرته' }));
    await assertFails(deleteDoc(at(sara(), `${path}/submissions/1`)));
    await assertFails(deleteDoc(at(sara(), path)));
    await assertFails(reply(sara(), path, { status: 'declined', name: 'Sara', updatedAt: stamp() }));
    // التسليم خاص بصاحبه والمشرف.
    await assertFails(getDocs(many(omar(), `${path}/submissions`)));
    await assertSucceeds(getDocs(many(sara(), `${path}/submissions`)));
    await assertSucceeds(getDocs(many(admin(), `${path}/submissions`)));
    // العضو لا يراجع نفسه.
    await assertFails(reply(sara(), path, { status: 'done', name: 'Sara', updatedAt: stamp(), reviewedBy: 'sara', reviewedAt: stamp() }));
    await assertFails(updateDoc(at(sara(), `${path}/submissions/1`), { verdict: 'done', reviewNote: '', reviewedBy: 'sara', reviewedAt: stamp() }));

    await assertSucceeds(review(admin(), 'sara', 'Sara', 1, 'rejected'));
    await assertSucceeds(submit(sara(), 'hand', 'sara', 'Sara', 2));
    await assertSucceeds(review(admin(), 'sara', 'Sara', 2, 'done'));
    await assertFails(submit(sara(), 'hand', 'sara', 'Sara', 3));
    await assertFails(reply(sara(), path, { status: 'accepted', name: 'Sara', updatedAt: stamp() }));
  });

  it('دون إعادة تسليم: نسخة واحدة', async () => {
    await seedTask('hand', { review: true, noResubmit: true });
    await assertSucceeds(submit(sara(), 'hand', 'sara', 'Sara', 1));
    await assertSucceeds(review(admin(), 'sara', 'Sara', 1, 'rejected'));
    await assertFails(submit(sara(), 'hand', 'sara', 'Sara', 2));
  });

  it('المشرف لا يزوّر تسليماً ولا يراجع باسم غيره', async () => {
    await seedTask('hand', { review: true });
    await assertSucceeds(submit(sara(), 'hand', 'sara', 'Sara', 1));
    const path = 'tasks/hand/responses/sara';
    await assertFails(reply(admin(), path, { status: 'done', name: 'Sara', updatedAt: stamp(), reviewedBy: 'omar', reviewedAt: stamp() }));
    await assertFails(reply(admin(), path, { status: 'done', name: 'Sara', updatedAt: stamp(), version: 9, reviewedBy: 'boss', reviewedAt: stamp() }));
    await assertFails(updateDoc(at(admin(), `${path}/submissions/1`), { text: 'بدلت الحل' }));
    await assertSucceeds(reply(admin(), 'tasks/hand/responses/omar', { status: 'done', name: 'Omar', updatedAt: stamp(), reviewedBy: 'boss', reviewedAt: stamp() }));
  });

  it('المهمة الملغاة والتعليقات المغلقة', async () => {
    await seedTask('off', { cancelled: true, noComments: true });
    await assertFails(setDoc(at(sara(), 'tasks/off/responses/sara'), response('Sara')));
    const comment = (uid: string, name: string) => ({ uid, name, text: 'x', createdAt: stamp() });
    await assertFails(setDoc(at(sara(), 'tasks/off/comments/c1'), comment('sara', 'Sara')));
    await assertSucceeds(setDoc(at(admin(), 'tasks/off/comments/c2'), comment('boss', 'Boss')));
  });

  it('الشات: الإرسال والقفل والكتم والحذف', async () => {
    const path = 'rooms/general/messages';
    await assertSucceeds(setDoc(at(sara(), `${path}/m1`), message('sara', 'Sara')));
    await assertSucceeds(getDocs(query(many(omar(), path), orderBy('createdAt', 'desc'), limit(50))));
    await assertSucceeds(setDoc(at(sara(), `${path}/m2`), message('sara', 'Sara', { text: '', imageUrl: 'https://res.cloudinary.com/x/a.png' })));
    await assertFails(setDoc(at(sara(), `${path}/m3`), message('sara', 'Sara', { imageUrl: 'https://evil.test/a.png' })));
    await assertFails(setDoc(at(sara(), `${path}/m4`), message('sara', 'Boss')));
    await assertFails(setDoc(at(sara(), `${path}/m5`), message('omar', 'Omar')));
    await assertFails(deleteDoc(at(omar(), `${path}/m1`)));
    await assertSucceeds(deleteDoc(at(sara(), `${path}/m1`)));

    await assertSucceeds(getDoc(at(sara(), 'mutes/sara')));
    await assertFails(getDocs(many(sara(), 'mutes')));
    await assertSucceeds(setDoc(at(admin(), 'mutes/sara'), { name: 'Sara' }));
    await assertFails(setDoc(at(sara(), `${path}/m6`), message('sara', 'Sara')));

    await assertFails(setDoc(at(omar(), 'rooms/general'), { locked: true }));
    await assertSucceeds(setDoc(at(admin(), 'rooms/general'), { locked: true }));
    await assertFails(setDoc(at(omar(), `${path}/m7`), message('omar', 'Omar')));
    await assertSucceeds(setDoc(at(admin(), `${path}/m8`), message('boss', 'Boss')));
  });

  it('الاختبار: المفتاح بعد التسليم ومحاولة واحدة', async () => {
    await assertSucceeds(getDocs(query(many(sara(), 'quizzes'), where('published', '==', true))));
    await assertFails(getDocs(many(sara(), 'quizzes')));
    await assertFails(getDoc(at(sara(), 'quizzes/draft')));
    await assertSucceeds(getDoc(at(sara(), 'quizzes/open/attempts/sara')));
    await assertFails(getDoc(at(sara(), 'quizzes/open/private/key')));
    const attempt = { answers: [0, 0], name: 'Sara', submittedAt: serverTimestamp() };
    await assertFails(setDoc(at(sara(), 'quizzes/open/attempts/sara'), { ...attempt, answers: [0] }));
    await assertFails(setDoc(at(sara(), 'quizzes/draft/attempts/sara'), { ...attempt, answers: [0] }));
    await assertSucceeds(setDoc(at(sara(), 'quizzes/open/attempts/sara'), attempt));
    await assertSucceeds(getDoc(at(sara(), 'quizzes/open/private/key')));
    await assertFails(updateDoc(at(sara(), 'quizzes/open/attempts/sara'), { answers: [0, 1] }));
    await assertFails(deleteDoc(at(sara(), 'quizzes/open/attempts/sara')));
    await assertFails(getDoc(at(omar(), 'quizzes/open/attempts/sara')));
    await assertSucceeds(getDocs(many(admin(), 'quizzes/open/attempts')));
    await assertSucceeds(deleteDoc(at(admin(), 'quizzes/open/attempts/sara')));
  });

  it('المشرف يحفظ الاختبار ومفتاحه دفعة واحدة', async () => {
    const db = admin();
    const batch = writeBatch(db);
    batch.set(at(db, 'quizzes/q9'), { published: false, questions: [], createdAt: serverTimestamp() });
    batch.set(at(db, 'quizzes/q9/private/key'), { answers: [] });
    await assertSucceeds(batch.commit());
  });

  it('أي مسار غير معرّف مرفوض', async () => {
    await assertFails(getDoc(doc(admin(), 'v2/other/subjects/calc')));
    await assertFails(setDoc(doc(admin(), 'whatever/x'), { a: 1 }));
  });
});
