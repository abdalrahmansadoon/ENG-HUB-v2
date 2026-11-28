import { Bell, CalendarDays, ChartColumn, ClipboardList, Languages, Layers, Megaphone, Moon, NotebookPen, Sun, Timer, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../data/context';
import { Avatar, PageHead } from '../ui/kit';
import { usePrefs } from '../ui/prefs';
import { useInbox } from './inbox/inbox';

/** كل أقسام التطبيق على الهاتف، حيث لا يتسع شريط التنقل لها. */
export default function MorePage() {
  const { name, photoURL, isAdmin } = useSession();
  const { t, lang, setLang, dark, setTheme } = usePrefs();
  const { unread } = useInbox();
  const links = [
    ['/calendar', 'calendar', CalendarDays], ['/study', 'study', Timer], ['/notes', 'notes', NotebookPen], ['/cards', 'flashcards', Layers],
    ['/quizzes', 'quizzes', ClipboardList], ['/stats', 'stats', ChartColumn], ['/announcements', 'announcements', Megaphone], ['/notifications', 'notifications', Bell],
  ] as const;
  return (
    <>
      <PageHead title={t('more')} />
      <Link to="/profile" className="card row link">
        <Avatar name={name} url={photoURL} />
        <span className="row-main"><strong><bdi>{name}</bdi></strong><span className="meta">{t(isAdmin ? 'admin' : 'member')}</span></span>
        <span className="tag"><UserRound size={14} aria-hidden /> {t('profile')}</span>
      </Link>
      <ul className="quick sections">
        {links.map(([to, key, Icon]) => (
          <li key={to}><Link to={to}><span className="tile small"><Icon size={18} aria-hidden /></span>{t(key)}{key === 'notifications' && unread > 0 && <bdi className="tag declined">{unread}</bdi>}</Link></li>
        ))}
      </ul>
      <div className="actions">
        <button type="button" className="btn" lang={lang === 'ar' ? 'en' : 'ar'} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}><Languages size={18} aria-hidden />{lang === 'ar' ? 'English' : 'العربية'}</button>
        <button type="button" className="btn" onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}{t(dark ? 'lightMode' : 'darkMode')}</button>
      </div>
    </>
  );
}
