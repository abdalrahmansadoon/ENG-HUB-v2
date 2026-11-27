import { ChevronDown, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession } from '../../data/context';
import type { Task } from '../../data/types';
import { addDays, formatDate, formatDay, today, weekday } from '../../lib/dates';
import { bucketOf, filterTasks, noFilters, priorities, type Filters } from '../../lib/tasks';
import { Empty, Meter, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { taskPath } from './actions';
import { priorityKeys } from './tags';
import TaskForm from './TaskForm';
import { useTaskList } from './useTaskList';

const filterKeys = Object.keys(noFilters) as (keyof Filters)[];

export default function TasksPage() {
  const { isAdmin, rules2, rulesOld } = useSession();
  const { t, lang } = usePrefs();
  const list = useTaskList();
  const { tasks } = list;
  const [adding, setAdding] = useState(false);
  const [params, setParams] = useSearchParams();
  const all = params.get('view') === 'all';
  const canAdd = isAdmin || rules2;

  return (
    <>
      <PageHead title={t('tasks')}><p>{formatDay(today(), lang)}</p></PageHead>
      {isAdmin && rulesOld && <p className="notice">{t('rulesNotice')}</p>}
      <div className="segmented view-switch" role="group" aria-label={t('taskViews')}>
        <button aria-pressed={!all} onClick={() => setParams({}, { replace: true })}>{t('viewDay')}</button>
        <button aria-pressed={all} onClick={() => setParams({ view: 'all' }, { replace: true })}>{t('viewAll')}</button>
      </div>
      <Status loading={list.waiting} error={tasks.error} />
      {!tasks.loading && !tasks.error && !tasks.data.length ? (
        <Empty title={t('noTasks')}><span>{t(isAdmin ? 'noTasksAdmin' : 'noTasksStudent')}</span></Empty>
      ) : !tasks.error && (all ? <AllTasks list={list} /> : <DayView list={list} />)}
      {canAdd && <button className="btn primary fab" onClick={() => setAdding(true)}><Plus size={20} aria-hidden />{t('newTask')}</button>}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  );
}

type List = ReturnType<typeof useTaskList>;

/** كل المهام مع البحث والتصفية. تبقى الاختيارات في الرابط. */
function AllTasks({ list }: { list: List }) {
  const { user } = useSession();
  const { t } = usePrefs();
  const subjects = useSubjects();
  const [params, setParams] = useSearchParams();
  const filters = { ...noFilters } as Record<keyof Filters, string>;
  for (const k of filterKeys) filters[k] = params.get(k) ?? noFilters[k];
  const f = filters as unknown as Filters;
  const set = (key: keyof Filters, value: string) => {
    const next = new URLSearchParams(params);
    if (value === noFilters[key]) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  const found = filterTasks(list.ready, f, list.mine, user.uid, today());
  const changed = filterKeys.some((k) => f[k] !== noFilters[k]);

  return (
    <div className="split"><div>
      <div className="filter-bar">
        <label className="search"><Search size={18} aria-hidden /><input type="search" aria-label={t('searchTasks')} placeholder={t('searchTasks')} value={f.text} onChange={(e) => set('text', e.target.value)} /></label>
        <div className="filters">
          <select aria-label={t('status')} value={f.status} onChange={(e) => set('status', e.target.value)}>
            {([['all', 'flAll'], ['open', 'flOpen'], ['late', 'flLate'], ['waiting', 'flWaiting'], ['done', 'flDone']] as const).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
          </select>
          <select aria-label={t('subject')} value={f.subject} onChange={(e) => set('subject', e.target.value)}>
            <option value="">{t('allSubjects')}</option>
            <option value="general">{t('general')}</option>
            {subjects.data.filter((s) => list.ready.some((x) => x.subjectId === s.id)).map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
          </select>
          <select aria-label={t('priority')} value={f.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="">{t('allPriorities')}</option>
            {priorities.map((p) => <option key={p} value={p}>{t(priorityKeys[p])}</option>)}
          </select>
          <select aria-label={t('scopeAll')} value={f.scope} onChange={(e) => set('scope', e.target.value)}>
            {([['all', 'scopeAll'], ['class', 'scopeClass'], ['personal', 'scopePersonal'], ['created', 'scopeCreated']] as const).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
          </select>
        </div>
      </div>
      <div className="group-head">
        <span role="status">{t('found')}: <bdi>{found.length}</bdi></span>
        {changed && <button className="text-btn" onClick={() => setParams({ view: 'all' }, { replace: true })}>{t('clearFilters')}</button>}
      </div>
      {found.length > 0 ? list.rows(found, () => ({ date: true })) : !list.waiting && <Empty title={t('noMatches')} />}
      <p className="muted">{t('statsNote')}</p>
    </div></div>
  );
}

function DayView({ list }: { list: List }) {
  const { user, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { ready, waiting, mine, rows, byTask } = list;
  const [picked, setPicked] = useState<string | null>(null);
  const now = today();
  const selected = picked ?? now;
  const days = [-2, -1, 0, 1, 2, 3, 4].map((n) => addDays(now, n));
  const bucket = (task: Task) => bucketOf(task, mine(task.id), now);
  const unfinished = (day: string) => ready.some((x) => x.dueDate === day && bucket(x) !== 'closed');

  const isToday = selected === now;
  const late = ready.filter((x) => bucket(x) === 'late');
  const gone = (x: Task) => x.cancelled || mine(x.id) === 'declined';
  const dayList = ready.filter((x) => x.dueDate === selected && !(isToday && gone(x)));
  const counted = dayList.filter((x) => (x.audience.includes('all') || x.audience.includes(user.uid)) && !gone(x));
  const waitingList = ready.filter((x) => bucket(x) === 'waiting' && x.dueDate !== now);
  const upcoming = ready.filter((x) => bucket(x) === 'next');
  // مهام اليوم المنجزة تبقى في قائمة اليوم، فلا تتكرر هنا.
  const closed = ready.filter((x) => bucket(x) === 'closed' && !(x.dueDate === now && mine(x.id) === 'done'));
  // ما ينتظر قرار المشرف من تسليمات الأعضاء.
  const toReview = isAdmin ? ready.filter((x) => x.review && !x.personal)
    .map((task) => ({ task, count: (byTask[task.id] ?? []).filter((r) => r.status === 'submitted').length })).filter((x) => x.count > 0) : [];
  const side = isToday && (upcoming.length > 0 || closed.length > 0 || waitingList.length > 0);
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <>
      <div className="week" role="group" aria-label={t('week')}>
        {days.map((day) => {
          const dot = unfinished(day);
          return (
            <button key={day} aria-pressed={day === selected} aria-label={dot ? `${formatDay(day, lang)}، ${t('unfinished')}` : formatDay(day, lang)}
              onClick={() => setPicked(day === now ? null : day)}>
              <span>{lang === 'ar' ? weekday(day, lang).replace(/^ال/, '') : weekday(day, lang, 'short')}</span>
              <b>{Number(day.slice(8))}</b>
              {dot && <i />}
            </button>
          );
        })}
      </div>
      <div className={side ? 'split cols' : 'split'}>
        <div>
          {isToday && toReview.length > 0 && <section className="group">
            <h2>{t('toReview')}</h2>
            <ul className="card">{toReview.map(({ task, count }) => (
              <li key={task.id}><Link to={taskPath(task)} className="row link">
                <span className="row-main"><strong>{task.title}</strong><span className="meta"><span>{t('awaitingCount')}: <bdi>{count}</bdi></span></span></span>
                <Chevron size={20} aria-hidden />
              </Link></li>
            ))}</ul>
          </section>}
          {isToday && late.length > 0 && (
            <section className="group late">
              <h2>{t('late')}</h2>
              {rows(late, () => ({ date: true }))}
            </section>
          )}
          {(dayList.length > 0 || !waiting) && (
            <section className="group">
              <h2>{isToday ? t('todayTasks') : `${t('dayTasks')} ${weekday(selected, lang)}`}</h2>
              {counted.length > 0 && <Meter value={counted.filter((x) => mine(x.id) === 'done').length} total={counted.length} label={t('doneCount')} />}
              {dayList.length > 0 ? rows(dayList) : <Empty title={t('noDayTasks')} />}
            </section>
          )}
        </div>
        {side && <div>
          {waitingList.length > 0 && <section className="group">
            <h2>{t('stSubmitted')}</h2>
            {rows(waitingList, () => ({ date: true }))}
          </section>}
          {upcoming.length > 0 && (
            <section className="group">
              <h2>{t('upcoming')}</h2>
              {rows(upcoming.slice(0, 8), (x) => ({ dayTag: x.dueDate <= addDays(now, 6) ? weekday(x.dueDate, lang) : formatDate(x.dueDate, lang) }))}
              {upcoming.length > 8 && <Link className="more" to="/tasks?view=all&status=open">{t('seeAll')}</Link>}
            </section>
          )}
          {closed.length > 0 && (
            <details className="group">
              <summary><span>{t('closed')} (<bdi>{closed.length}</bdi>)</span><ChevronDown size={20} aria-hidden /></summary>
              {rows(closed, () => ({ date: true }))}
            </details>
          )}
        </div>}
      </div>
    </>
  );
}
