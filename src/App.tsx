import { lazy, useEffect, useRef, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionContext, useBackend, useDoc } from './data/context';
import type { AuthUser } from './data/store';
import { useRules } from './data/rules';
import type { Profile } from './data/types';
import AuthPage from './features/AuthPage';
import HomePage from './features/home/HomePage';
import { ResponsesProvider } from './features/tasks/responses';
import Layout from './Layout';
import { useFeedback } from './ui/feedback';
import { Splash, Status } from './ui/kit';
import { usePrefs } from './ui/prefs';

// الرئيسية تُحمّل مع التطبيق، وبقية الصفحات عند فتحها.
const ChatPage = lazy(() => import('./features/chat/ChatPage'));
const ProfilePage = lazy(() => import('./features/ProfilePage'));
const QuizPage = lazy(() => import('./features/quizzes/QuizPage'));
const QuizzesPage = lazy(() => import('./features/quizzes/QuizzesPage'));
const ItemPage = lazy(() => import('./features/subjects/ItemPage'));
const SubjectPage = lazy(() => import('./features/subjects/SubjectPage'));
const SubjectsPage = lazy(() => import('./features/subjects/SubjectsPage'));
const TaskPage = lazy(() => import('./features/tasks/TaskPage'));
const TasksPage = lazy(() => import('./features/tasks/TasksPage'));

export default function App() {
  const { auth } = useBackend();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => auth.watch(setUser), [auth]);
  if (user === undefined) return <Splash />;
  if (!user) return <AuthPage />;
  return <SignedIn key={user.uid} user={user} />;
}

function SignedIn({ user }: { user: AuthUser }) {
  const { store, auth } = useBackend();
  const { run } = useFeedback();
  const { t } = usePrefs();
  const [failed, setFailed] = useState(false);
  const profile = useDoc<Profile>(`profiles/${user.uid}`);
  const admin = useDoc<{ id: string; active: boolean }>(user.email ? `admins/${user.email}` : null);
  const creating = useRef(false);
  const rules = useRules();
  useEffect(() => {
    if (profile.loading || profile.error || profile.data || creating.current) return;
    creating.current = true;
    const name = user.name.trim().slice(0, 60) || 'طالب';
    run(() => store.set(`profiles/${user.uid}`, { name, photoURL: user.photoURL.slice(0, 500) }))
      .then((ok) => { if (!ok) setFailed(true); });
  }, [profile.loading, profile.error, profile.data, user, store, run]);

  if (profile.error || failed) {
    const refused = (profile.error as { code?: string } | null)?.code === 'permission-denied';
    return (
      <div className="fallback">
        {refused ? <p className="banner bad">{t('errRules')}</p> : <Status error={profile.error ?? new Error('profile')} />}
        <button className="btn" onClick={() => location.reload()}>{t('retry')}</button>
        <button className="text-btn" onClick={() => auth.signOut()}>{t('signOut')}</button>
      </div>
    );
  }
  // دون اتصال لا يمكن تأكيد صلاحية المشرف: ندخل كعضو عادي حتى يعود الاتصال.
  if (!profile.data || (admin.loading && navigator.onLine)) return <Splash />;
  const session = { user, name: profile.data.name, photoURL: profile.data.photoURL, isAdmin: user.emailVerified && admin.data?.active === true, ...rules };
  return (
    <SessionContext.Provider value={session}>
      <HashRouter>
        <Routes>
          <Route element={<ResponsesProvider><Layout /></ResponsesProvider>}>
            <Route index element={<HomePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:taskId" element={<TaskPage />} />
            <Route path="tasks/p/:taskId" element={<TaskPage personal />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="subjects/:subjectId" element={<SubjectPage />} />
            <Route path="subjects/:subjectId/items/:itemId" element={<ItemPage />} />
            <Route path="chat/:roomId?" element={<ChatPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="quizzes/:quizId" element={<QuizPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </SessionContext.Provider>
  );
}
