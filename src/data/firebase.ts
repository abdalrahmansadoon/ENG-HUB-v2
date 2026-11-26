import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, type User,
} from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, getDocs, initializeFirestore, limit, onSnapshot, orderBy, persistentLocalCache,
  persistentMultipleTabManager, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
  type DocumentData, type QueryConstraint,
} from 'firebase/firestore';
import type { FirebaseConfig } from '../lib/config';
import { NOW, type Auth, type AuthUser, type Backend, type Data, type Store } from './store';

const encode = (data: Data) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === NOW ? serverTimestamp() : v]));
const decode = (id: string, data: DocumentData) => ({
  ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Timestamp ? v.toMillis() : v])),
  id,
});

export function createFirebaseBackend(config: FirebaseConfig): Backend {
  const app = initializeApp(config);
  const fbAuth = getAuth(app);
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  const options = { serverTimestamps: 'estimate' } as const;

  const store: Store = {
    watch(path, q, next, error) {
      const constraints: QueryConstraint[] = [];
      if (q.where) constraints.push(where(...q.where));
      if (q.orderBy) constraints.push(orderBy(...q.orderBy));
      if (q.limit) constraints.push(limit(q.limit));
      return onSnapshot(query(collection(db, path), ...constraints),
        (snap) => next(snap.docs.map((d) => decode(d.id, d.data(options)))), error);
    },
    watchDoc: (path, next, error) =>
      onSnapshot(doc(db, path), { includeMetadataChanges: true }, (d) => {
        // "غير موجود" من الذاكرة المحلية ليس تأكيداً: ننتظر رد الخادم.
        if (!d.exists() && d.metadata.fromCache) return;
        next(d.exists() ? decode(d.id, d.data(options)) : null);
      }, error),
    list: async (path) => (await getDocs(collection(db, path))).docs.map((d) => decode(d.id, d.data(options))),
    newId: () => doc(collection(db, '_')).id,
    add: async (path, data) => (await addDoc(collection(db, path), encode(data))).id,
    set: (path, data) => setDoc(doc(db, path), encode(data)),
    update: (path, data) => updateDoc(doc(db, path), encode(data)),
    remove: (path) => deleteDoc(doc(db, path)),
    async setMany(entries) {
      const batch = writeBatch(db);
      for (const [path, data] of entries) batch.set(doc(db, path), encode(data));
      await batch.commit();
    },
  };

  let pendingName = '';
  const toUser = (u: User): AuthUser => ({
    uid: u.uid, email: u.email ?? '', photoURL: u.photoURL ?? '', emailVerified: u.emailVerified,
    name: u.displayName || pendingName || u.email?.split('@')[0] || 'طالب',
  });
  const auth: Auth = {
    watch: (next) => onAuthStateChanged(fbAuth, (u) => next(u ? toUser(u) : null)),
    google: async () => { await signInWithPopup(fbAuth, new GoogleAuthProvider()); },
    signIn: async (email, password) => { await signInWithEmailAndPassword(fbAuth, email, password); },
    async signUp(name, email, password) {
      pendingName = name;
      const { user } = await createUserWithEmailAndPassword(fbAuth, email, password);
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user).catch(() => {});
    },
    resetPassword: (email) => sendPasswordResetEmail(fbAuth, email),
    verifyEmail: async () => { if (fbAuth.currentUser) await sendEmailVerification(fbAuth.currentUser); },
    signOut: () => signOut(fbAuth),
  };
  return { demo: false, store, auth };
}
