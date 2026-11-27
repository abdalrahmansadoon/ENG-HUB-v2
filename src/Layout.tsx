import { BookOpen, ClipboardList, House, ListChecks, MessagesSquare, Moon, Sun, UserRound } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBackend, useSession } from './data/context';
import QuickAdd from './features/QuickAdd';
import { useResponses } from './features/tasks/responses';
import { useTasks } from './features/tasks/useTasks';
import { today } from './lib/dates';
import { applyUpdate, notify, useUpdateReady } from './lib/pwa';
import { Avatar, Status } from './ui/kit';
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
        void notify(t('newTaskNotice'), { body: task.title, tag: task.id });
      }
    }
    seen.current = new Set([...(seen.current ?? []), ...tasks.data.map((x) => x.id)]);
  }, [tasks.data, tasks.loading, tasks.error, user.uid, t, since]);
  return tasks;
}

export default function Layout() {
  const { demo } = useBackend();
  const { user, name, photoURL, isAdmin } = useSession();
  const { t, lang, setLang, dark, setTheme } = usePrefs();
  const location = useLocation();
  const tasks = useTaskNotifications();
  const [online, setOnline] = useState(navigator.onLine);
  const updateReady = useUpdateReady();
  const { byTask } = useResponses();
  const main = useRef<HTMLElement>(null);
  const badge = isAdmin ? 0 : tasks.data.filter((x) => x.dueDate >= today() && byTask[x.id] && !byTask[x.id].some((r) => r.id === user.uid)).length;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener('online', update); addEventListener('offline', update);
    return () => { removeEventListener('online', update); removeEventListener('offline', update); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const chat = location.pathname.startsWith('/chat');
  // صفحات القراءة (محاضرة أو اختبار) أضيق من صفحات التصفح.
  const reading = /^\/(quizzes\/[^/]+|subjects\/[^/]+\/items\/[^/]+)/.test(location.pathname);
  const home = { to: '/', label: t('home'), Icon: House, badge: 0 };
  const taskLink = { to: '/tasks', label: t('tasks'), Icon: ListChecks, badge };
  const subjects = { to: '/subjects', label: t('subjects'), Icon: BookOpen, badge: 0 };
  const quizzes = { to: '/quizzes', label: t('quizzes'), Icon: ClipboardList, badge: 0 };
  const chatLink = { to: '/chat', label: t('chat'), Icon: MessagesSquare, badge: 0 };
  const profile = { to: '/profile', label: t('profile'), Icon: UserRound, badge: 0 };
  const links = (list: (typeof home)[]) => list.map(({ to, label, Icon, badge }) => (
    <NavLink key={to} to={to} end={to === '/'}>
      <span className="nav-icon"><Icon size={21} aria-hidden /></span><span>{label}</span>
      {!!badge && <bdi className="badge">{badge}</bdi>}
    </NavLink>
  ));

  return (
    <div className={chat ? 'shell in-chat' : 'shell'}>
      <button className="btn primary skip" onClick={() => main.current?.focus()}>{t('skip')}</button>
      <aside className="side mat">
        <Link to="/" className="brand" dir="ltr"><img src="./icon.svg" alt="" width="38" height="38" />ENG HUB</Link>
        <nav aria-label={t('mainNav')}>{links([home, taskLink, subjects, quizzes, chatLink])}</nav>
        <NavLink to="/profile" className="me" aria-label={`${t('profile')}: ${name}`}>
          <Avatar name={name} url={photoURL} />
          <span><strong><bdi>{name}</bdi></strong><small>{t(isAdmin ? 'admin' : 'member')}</small></span>
        </NavLink>
      </aside>
      <div className="frame">
        <header className="appbar">
          <Link to="/" className="brand" dir="ltr"><img src="./icon.svg" alt="" width="32" height="32" />ENG HUB</Link>
          <div className="appbar-actions">
            {isAdmin && <QuickAdd />}
            <button className="icon-btn plain lang-btn" lang={lang === 'ar' ? 'en' : 'ar'} aria-label={lang === 'ar' ? 'EN: English' : 'ع: العربية'}
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{lang === 'ar' ? 'EN' : 'ع'}</button>
            <button className="icon-btn plain" aria-label={t(dark ? 'lightMode' : 'darkMode')} onClick={() => setTheme(dark ? 'light' : 'dark')}>
              {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
            </button>
            <Link to="/profile" className="avatar-link" aria-label={t('profile')}><Avatar name={name} url={photoURL} size="small" /></Link>
          </div>
        </header>
        <main ref={main} tabIndex={-1} className={reading ? 'content' : 'content wide'}>
          <div className="page" key={chat ? 'chat' : location.pathname}>
            {updateReady && <p className="banner" role="status">{t('updateReady')}<button className="btn small primary" onClick={applyUpdate}>{t('updateNow')}</button></p>}
            {demo && !chat && <p className="banner">{t('demoNote')}</p>}
            {!online && <p className="banner bad" role="status">{t('offline')}</p>}
            <Suspense fallback={<Status loading />}><Outlet /></Suspense>
          </div>
        </main>
      </div>
      <nav className="tabbar" aria-label={t('mainNav')}>{links([home, taskLink, subjects, chatLink, profile])}</nav>
    </div>
  );
}
