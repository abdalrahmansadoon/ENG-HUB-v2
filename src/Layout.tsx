import { Bell, BookOpen, CalendarDays, ChartColumn, ClipboardList, House, Layers, LayoutGrid, ListChecks, Megaphone, MessagesSquare, Moon, NotebookPen, Search, Sun, Timer } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useBackend, useSession } from './data/context';
import { useInbox } from './features/inbox/inbox';
import QuickAdd from './features/QuickAdd';
import TimerChip from './features/study/TimerChip';
import { useResponses } from './features/tasks/responses';
import { useTasks } from './features/tasks/useTasks';
import { addDays, today } from './lib/dates';
import { applyUpdate, useUpdateReady } from './lib/pwa';
import { Avatar, Status } from './ui/kit';
import { usePrefs } from './ui/prefs';

const SearchDialog = lazy(() => import('./features/search/SearchDialog'));
/** أقسام تظهر على الهاتف تحت «المزيد». */
const underMore = /^\/(more|calendar|study|notes|cards|quizzes|stats|announcements|notifications|profile)(\/|$)/;

export default function Layout() {
  const { demo } = useBackend();
  const { user, name, photoURL, isAdmin } = useSession();
  const { t, lang, setLang, dark, setTheme } = usePrefs();
  const location = useLocation();
  const tasks = useTasks();
  const { unread } = useInbox();
  const [searching, setSearching] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const updateReady = useUpdateReady();
  const { byTask } = useResponses();
  const main = useRef<HTMLElement>(null);
  // شارة المهام: مهام الدفعة القريبة التي لم يرد عليها العضو.
  const soon = addDays(today(), 7);
  const badge = isAdmin ? 0 : tasks.data.filter((x) => !x.personal && !x.cancelled && x.dueDate >= today() && x.dueDate <= soon
    && byTask[x.id] && !byTask[x.id].some((r) => r.id === user.uid)).length;
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener('online', update); addEventListener('offline', update);
    return () => { removeEventListener('online', update); removeEventListener('offline', update); };
  }, []);
  // الانتقال (ومنه زر الرجوع) يغلق نافذة البحث.
  useEffect(() => { window.scrollTo(0, 0); setSearching(false); }, [location.pathname]);
  useEffect(() => {
    // Ctrl+K أو ⌘K يفتح البحث من أي صفحة.
    const keys = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.code !== 'KeyK') return;
      e.preventDefault();
      if (!document.querySelector('dialog[open]')) setSearching(true);
    };
    addEventListener('keydown', keys);
    return () => removeEventListener('keydown', keys);
  }, []);

  const chat = location.pathname.startsWith('/chat');
  // صفحات القراءة (محاضرة أو اختبار) أضيق من صفحات التصفح.
  const reading = /^\/(quizzes\/[^/]+|subjects\/[^/]+\/items\/[^/]+|notes\/[^/]+|cards(\/[^/]+)?\/review)/.test(location.pathname);
  const home = { to: '/', label: t('home'), Icon: House, badge: 0 };
  const taskLink = { to: '/tasks', label: t('tasks'), Icon: ListChecks, badge };
  const subjects = { to: '/subjects', label: t('subjects'), Icon: BookOpen, badge: 0 };
  const quizzes = { to: '/quizzes', label: t('quizzes'), Icon: ClipboardList, badge: 0 };
  const chatLink = { to: '/chat', label: t('chat'), Icon: MessagesSquare, badge: 0 };
  const calendar = { to: '/calendar', label: t('calendar'), Icon: CalendarDays, badge: 0 };
  const study = { to: '/study', label: t('study'), Icon: Timer, badge: 0 };
  const tools = [
    { to: '/notes', label: t('notes'), Icon: NotebookPen, badge: 0 },
    { to: '/cards', label: t('flashcards'), Icon: Layers, badge: 0 },
    { to: '/stats', label: t('stats'), Icon: ChartColumn, badge: 0 },
    { to: '/announcements', label: t('announcements'), Icon: Megaphone, badge: 0 },
  ];
  const more = { to: '/more', label: t('more'), Icon: LayoutGrid, badge: 0 };
  const links = (list: (typeof home)[]) => list.map(({ to, label, Icon, badge }) => (
    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive || (to === '/more' && underMore.test(location.pathname)) ? 'active' : '')}>
      <span className="nav-icon"><Icon size={21} aria-hidden /></span><span>{label}</span>
      {!!badge && <bdi className="badge">{badge}</bdi>}
    </NavLink>
  ));

  return (
    <div className={chat ? 'shell in-chat' : 'shell'}>
      <button className="btn primary skip" onClick={() => main.current?.focus()}>{t('skip')}</button>
      <aside className="side mat">
        <Link to="/" className="brand" dir="ltr"><img src="./icon.svg" alt="" width="38" height="38" />ENG HUB</Link>
        <nav aria-label={t('mainNav')}>
          {links([home, taskLink, calendar, study, subjects, quizzes, chatLink])}
          <hr />
          {links(tools)}
        </nav>
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
            <button className="icon-btn plain search-btn" aria-label={t('search')} aria-keyshortcuts="Control+K Meta+K" onClick={() => setSearching(true)}>
              <Search size={20} aria-hidden /><span aria-hidden="true">{t('search')}</span><kbd aria-hidden="true" dir="ltr">Ctrl K</kbd>
            </button>
            <Link to="/notifications" className="icon-btn plain bell" aria-label={unread ? `${t('notifications')}: ${unread} ${t('unreadOne')}` : t('notifications')}>
              <Bell size={20} aria-hidden />{unread > 0 && <bdi className="badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</bdi>}
            </Link>
            <button className="icon-btn plain lang-btn wide-only" lang={lang === 'ar' ? 'en' : 'ar'} aria-label={lang === 'ar' ? 'EN: English' : 'ع: العربية'}
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{lang === 'ar' ? 'EN' : 'ع'}</button>
            <button className="icon-btn plain wide-only" aria-label={t(dark ? 'lightMode' : 'darkMode')} onClick={() => setTheme(dark ? 'light' : 'dark')}>
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
      <nav className="tabbar" aria-label={t('mainNav')}>{links([home, taskLink, subjects, chatLink, more])}</nav>
      <TimerChip />
      {searching && <Suspense fallback={null}><SearchDialog onClose={() => setSearching(false)} /></Suspense>}
    </div>
  );
}
