import { BookOpen, CalendarCheck, ClipboardList, MessagesSquare, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBackend, useSession } from './data/context';
import { useResponses } from './features/tasks/responses';
import { useTasks } from './features/tasks/useTasks';
import { today } from './lib/dates';
import { usePrefs } from './ui/prefs';

/** إشعار للمهام التي تصل بينما الموقع مفتوح. */
function useTaskNotifications() {
  const tasks = useTasks();
  const { user } = useSession();
  const { t } = usePrefs();
  const seen = useRef<Set<string> | null>(null);
  const [since] = useState(() => Date.now() - 60_000);
  useEffect(() => {
    if (tasks.loading || tasks.error) return;
    if (seen.current) {
      for (const task of tasks.data) {
        // الأقدم من فتح الصفحة ليست جديدة، حتى لو وصلت متأخرة من الخادم.
        if (seen.current.has(task.id) || task.createdBy === user.uid || task.createdAt < since) continue;
        // بعض متصفحات الهاتف ترفض إنشاء الإشعار من الصفحة.
        try { if (Notification.permission === 'granted') new Notification(t('newTaskNotice'), { body: task.title, tag: task.id }); } catch { /* غير مدعوم */ }
      }
    }
    seen.current = new Set([...(seen.current ?? []), ...tasks.data.map((x) => x.id)]);
  }, [tasks.data, tasks.loading, tasks.error, user.uid, t, since]);
  return tasks;
}

export default function Layout() {
  const { demo } = useBackend();
  const { user, isAdmin } = useSession();
  const { t } = usePrefs();
  const location = useLocation();
  const tasks = useTaskNotifications();
  const [online, setOnline] = useState(navigator.onLine);
  const { byTask } = useResponses();
  const badge = isAdmin ? 0 : tasks.data.filter((x) => x.dueDate >= today() && byTask[x.id] && !byTask[x.id].some((r) => r.id === user.uid)).length;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener('online', update); addEventListener('offline', update);
    return () => { removeEventListener('online', update); removeEventListener('offline', update); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const links = [
    { to: '/', label: t('today'), Icon: CalendarCheck, badge },
    { to: '/subjects', label: t('subjects'), Icon: BookOpen },
    { to: '/chat', label: t('chat'), Icon: MessagesSquare },
    { to: '/quizzes', label: t('quizzes'), Icon: ClipboardList },
    { to: '/profile', label: t('profile'), Icon: UserRound },
  ];
  return (
    <div className="shell">
      <nav className="nav">
        <span className="brand" dir="ltr"><img src="./icon.svg" alt="" width="34" height="34" />ENG HUB</span>
        {links.map(({ to, label, Icon, badge }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <span className="nav-icon"><Icon size={22} aria-hidden /></span><span>{label}</span>
            {!!badge && <bdi className="badge">{badge}</bdi>}
          </NavLink>
        ))}
      </nav>
      <main className={location.pathname.startsWith('/chat') ? 'content wide-chat' : 'content'}>
        {demo && !location.pathname.startsWith('/chat') && <p className="banner">{t('demoNote')}</p>}
        {!online && <p className="banner bad" role="status">{t('offline')}</p>}
        <Outlet />
      </main>
    </div>
  );
}
