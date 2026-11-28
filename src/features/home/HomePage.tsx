import { BookOpen, CalendarDays, ClipboardList, ListChecks, ListPlus, Megaphone, NotebookPen, Pin, Play, SlidersHorizontal, Timer } from 'lucide-react';
import { lazy, type ReactNode, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection, useSession } from '../../data/context';
import type { Item, Progress, Quiz } from '../../data/types';
import { dailyValues } from '../../lib/analytics';
import { formatDay, formatShort, relativeDay, today } from '../../lib/dates';
import { normalizeLayout, sideSections, taskStats, weekActivity, type HomeLayout, type HomeSection } from '../../lib/home';
import type { Key } from '../../lib/i18n';
import { minutesBetween, minutesByDay } from '../../lib/planner';
import { bucketOf } from '../../lib/tasks';
import { itemKind } from '../../lib/video';
import { SubjectIcon } from '../../ui/icons';
import { Avatar, Empty, Meter, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { toneOf } from '../../ui/tone';
import { useMediaQuery } from '../../ui/useMediaQuery';
import { useAnnouncements } from '../announcements/useAnnouncements';
import { useSessions } from '../planner/usePlanner';
import BarChart from '../stats/BarChart';
import { hours } from '../stats/parts';
import { KindIcon } from '../subjects/KindIcon';
import { savedTerm, terms, years } from '../subjects/terms';
import { taskPath } from '../tasks/actions';
import { useTaskList } from '../tasks/useTaskList';
import { useSubjects } from '../useSubjects';
import ActivityChart from './ActivityChart';
import Customize, { sectionTitles } from './Customize';
import Gauge from './Gauge';

const TaskForm = lazy(() => import('../tasks/TaskForm'));

const layoutKey = (uid: string) => `enghub.home.v1:${uid}`;
function loadLayout(uid: string) {
  try { return normalizeLayout(JSON.parse(localStorage.getItem(layoutKey(uid)) ?? 'null')); } catch { return normalizeLayout(null); }
}

export default function HomePage() {
  const { user, name, photoURL, isAdmin, rules2, rules3 } = useSession();
  const { t, lang } = usePrefs();
  const { tasks, ready, waiting, mine, rows, byTask } = useTaskList();
  const subjects = useSubjects();
  const items = useCollection<Item>('items');
  const quizzes = useCollection<Quiz>('quizzes', isAdmin ? {} : { where: ['published', '==', true] });
  const progress = useCollection<Progress>(`users/${user.uid}/progress`);
  const sessions = useSessions();
  const announcements = useAnnouncements();
  const [addingTask, setAddingTask] = useState(false);
  const wide = useMediaQuery('(min-width: 1100px)');
  const [layout, setLayout] = useState(() => loadLayout(user.uid));
  const [customizing, setCustomizing] = useState(false);
  const change = (next: HomeLayout) => {
    setLayout(next);
    try { localStorage.setItem(layoutKey(user.uid), JSON.stringify(next)); } catch { /* التخزين غير متاح */ }
  };

  const now = today();
  const [year, term] = savedTerm();
  const yearKey = years.find(([v]) => v === year)?.[1] ?? 'yearPrep';
  const termKey = terms.find(([v]) => v === term)?.[1] ?? 'term1';
  const termSubjects = subjects.data.filter((s) => s.year === year && s.term === term);
  const studied = new Set(progress.data.map((p) => p.id));
  const termItems = termSubjects.flatMap((s) => items.data.filter((i) => i.subjectId === s.id).sort((a, b) => a.createdAt - b.createdAt));
  const lectures = termItems.filter((i) => i.category === 'lectures');
  // «أكمل» هي أول محاضرة لم تُذاكر في أول مادة بدأتها، وإلا أول محاضرة متبقية.
  const remaining = lectures.filter((i) => !studied.has(i.id));
  const next = progress.loading ? undefined : remaining.find((i) => termItems.some((x) => x.subjectId === i.subjectId && studied.has(x.id))) ?? remaining[0];

  const assigned = (audience: string[]) => audience.includes('all') || audience.includes(user.uid);
  const open = ready.filter((x) => assigned(x.audience));
  const todayOnly = open.filter((x) => x.dueDate === now && mine(x.id) !== 'declined' && !x.cancelled);
  const todayList = [...open.filter((x) => bucketOf(x, mine(x.id), now) === 'late'), ...todayOnly];
  const upcoming = open.filter((x) => bucketOf(x, mine(x.id), now) === 'next').slice(0, 5);
  const stats = taskStats(ready, mine, user.uid, now);
  const activity = weekActivity(now,
    Object.values(byTask).flatMap((list) => list.filter((r) => r.id === user.uid && r.status === 'done').map((r) => r.updatedAt)),
    progress.data.map((p) => p.at));

  const updates = [
    ...tasks.data.filter((x) => !x.personal).map((x) => ({ key: x.id, at: x.createdAt, to: taskPath(x), title: x.title, kind: t('updTask'), subject: x.subjectId, icon: <ListChecks size={18} aria-hidden /> })),
    ...items.data.map((i) => ({ key: i.id, at: i.createdAt, to: `/subjects/${i.subjectId}/items/${i.id}`, title: i.title, kind: t(i.category), subject: i.subjectId, icon: <KindIcon kind={itemKind(i.url)} size={18} /> })),
    ...quizzes.data.filter((q) => q.published).map((q) => ({ key: q.id, at: q.createdAt, to: `/quizzes/${q.id}`, title: q.title, kind: t('updQuiz'), subject: q.subjectId, icon: <ClipboardList size={18} aria-hidden /> })),
    ...announcements.data.map((a) => ({ key: a.id, at: a.createdAt, to: `/announcements#${a.id}`, title: a.title, kind: t('updAnnouncement'), subject: a.subjectId, icon: <Megaphone size={18} aria-hidden /> })),
  ].sort((a, b) => b.at - a.at).slice(0, 5);

  const head = (id: HomeSection, to?: string) => (
    <div className="group-head"><h2>{t(sectionTitles[id])}</h2>{to && <Link className="more" to={to}>{t('seeAll')}</Link>}</div>
  );

  const body: Record<HomeSection, () => ReactNode> = {
    today: () => (
      <>
        {head('today', '/tasks')}
        <Status loading={waiting} error={tasks.error} />
        {!waiting && !tasks.error && !todayList.length && <Empty title={t('noTodayTasks')}>{!tasks.data.length && <span>{t(isAdmin ? 'noTasksAdmin' : 'noTasksStudent')}</span>}</Empty>}
        {todayList.length > 0 && rows(todayList, (x) => (x.dueDate < now ? { date: true, dayTag: t('late') } : {}))}
      </>
    ),
    activity: () => (
      <>
        {head('activity', '/stats')}
        <Status loading={progress.loading || waiting || sessions.loading} error={progress.error ?? sessions.error} />
        {!progress.loading && !progress.error && !waiting && <ActivityChart days={activity} />}
        {rules3 && !sessions.loading && !sessions.error && <BarChart label={t('stMinutes')} tone="s2" empty={t('noStudyYet')}
          days={dailyValues(activity.map((d) => d.day), minutesByDay(sessions.data))} />}
      </>
    ),
    progress: () => {
      const withContent = termSubjects.filter((s) => termItems.some((i) => i.subjectId === s.id));
      return (
        <>
          {head('progress', '/subjects')}
          <Status loading={subjects.loading || items.loading} error={subjects.error ?? items.error} />
          {!subjects.loading && !items.loading && !withContent.length && <div className="empty"><span>{t('noProgress')}</span></div>}
          {withContent.length > 0 && <ul className="card">{withContent.map((s) => {
            const own = termItems.filter((i) => i.subjectId === s.id);
            return (
              <li key={s.id}>
                <Link to={`/subjects/${s.id}`} className={`row link progress-row tone-${toneOf(s.order)}`}>
                  <span className="tile small"><SubjectIcon name={s.icon} size={18} /></span>
                  <div className="row-main">
                    <strong>{subjects.label(s)}</strong>
                    <Meter value={own.filter((i) => studied.has(i.id)).length} total={own.length} label={`${t('progress')}: ${subjects.label(s)}`} />
                  </div>
                </Link>
              </li>
            );
          })}</ul>}
        </>
      );
    },
    upcoming: () => (
      <>
        {head('upcoming', '/tasks')}
        <Status loading={waiting} error={tasks.error} />
        {!waiting && !tasks.error && !upcoming.length && <div className="empty"><span>{t('noDeadlines')}</span></div>}
        {upcoming.length > 0 && rows(upcoming, (x) => ({ dayTag: relativeDay(x.dueDate, now, lang) }))}
      </>
    ),
    updates: () => (
      <>
        {head('updates')}
        {!updates.length ? <div className="empty"><span>{t('noUpdates')}</span></div> : <ul className="card">{updates.map((u) => (
          <li key={u.key}>
            <Link to={u.to} className="row link">
              <span className={`tile small tone-${subjects.tone(u.subject)}`}>{u.icon}</span>
              <span className="row-main"><strong>{u.title}</strong><span className="meta"><span>{u.kind}</span><span>{subjects.nameOf(u.subject)}</span><span>{formatShort(u.at, lang)}</span></span></span>
            </Link>
          </li>
        ))}</ul>}
      </>
    ),
    shortcuts: () => (
      <>
        {head('shortcuts')}
        <ul className="quick">
          {rules2 && <li><button type="button" onClick={() => setAddingTask(true)}><span className="tile small"><ListPlus size={18} aria-hidden /></span>{t('personalTask')}</button></li>}
          {([
            ...(rules3 ? [['/study', 'startStudy', Timer], ['/notes/new', 'newNote', NotebookPen]] as const : []),
            ['/calendar', 'calendar', CalendarDays], ['/subjects', 'files', BookOpen], ['/quizzes', 'quizzes', ClipboardList],
          ] as const).map(([to, key, Icon]) => (
            <li key={to}><Link to={to}><span className="tile small"><Icon size={18} aria-hidden /></span>{t(key)}</Link></li>
          ))}
        </ul>
      </>
    ),
  };

  const visible = layout.order.filter((s) => !layout.hidden.includes(s));
  const section = (id: HomeSection) => <section key={id} className="group">{body[id]()}</section>;
  const main = visible.filter((s) => !sideSections.includes(s));
  const side = visible.filter((s) => sideSections.includes(s));
  const pinned = announcements.data.find((a) => a.pinned);
  const weekStudy = minutesBetween(sessions.data, activity[0].day, now);
  const cells: [Key, number, boolean?][] = [
    ['statTotal', stats.total], ['done', stats.done], ['statPending', stats.pending], ['late', stats.overdue, stats.overdue > 0],
  ];

  return (
    <>
      <header className="hero mat">
        <div className="hero-text">
          <div className="hero-who">
            <Link to="/profile" aria-label={t('profile')}><Avatar name={name} url={photoURL} /></Link>
            <div>
              <h1>{t('hello')} <bdi>{name.trim().split(/\s+/)[0]}</bdi></h1>
              <p>{formatDay(now, lang)}</p>
            </div>
          </div>
          <p className="hero-meta"><span>{t(yearKey)}</span><span>{t(termKey)}</span></p>
          {next && <Link to={`/subjects/${next.subjectId}/items/${next.id}`} className="btn signal"><Play size={18} className="flip" aria-hidden />{t('continueWith')}: {next.title}</Link>}
        </div>
        <Gauge value={todayOnly.filter((x) => mine(x.id) === 'done').length} total={todayOnly.length} />
      </header>

      {pinned && (
        <Link to={`/announcements#${pinned.id}`} className="pinned card">
          <Pin size={18} aria-hidden />
          <span><strong dir="auto">{pinned.title}</strong>{pinned.date && <span>{formatDay(pinned.date, lang)}، {relativeDay(pinned.date, now, lang)}</span>}</span>
        </Link>
      )}

      <nav className={rules3 ? 'titleblock six' : 'titleblock'} aria-label={t('progress')}>
        {cells.map(([key, value, alert]) => (
          <Link key={key} to="/tasks" className={alert && !waiting ? 'alert' : undefined}><b>{waiting ? '–' : value}</b><span>{t(key)}</span></Link>
        ))}
        <Link to="/subjects">
          <b>{items.loading || progress.loading ? '–' : <bdi dir="ltr">{lectures.filter((i) => studied.has(i.id)).length}/{lectures.length}</bdi>}</b>
          <span>{t('statLectures')}</span>
        </Link>
        {rules3 && <Link to="/stats">
          <b>{sessions.loading ? '–' : <bdi dir="ltr">{hours(weekStudy)}</bdi>}</b>
          <span>{t('statStudyWeek')}</span>
        </Link>}
      </nav>
      <p className="muted window-note">{t('statsNote')}</p>

      {!visible.length && <Empty title={t('allHidden')} />}
      {wide && main.length > 0 && side.length > 0 ? (
        <div className="split cols"><div>{main.map(section)}</div><div>{side.map(section)}</div></div>
      ) : (
        <div className="split"><div>{visible.map(section)}</div></div>
      )}
      <button className="text-btn" style={{ justifySelf: 'center' }} onClick={() => setCustomizing(true)}><SlidersHorizontal size={18} aria-hidden />{t('customize')}</button>
      {addingTask && <Suspense fallback={null}><TaskForm own onClose={() => setAddingTask(false)} /></Suspense>}
      {customizing && <Customize layout={layout} onChange={change} onClose={() => setCustomizing(false)} />}
    </>
  );
}
