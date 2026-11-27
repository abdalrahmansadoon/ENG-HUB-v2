import { Check, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { ResponseStatus, Task } from '../../data/types';
import { addDays, formatDate, formatDay, today, weekday } from '../../lib/dates';
import { bucketOf } from '../../lib/tasks';
import { useFeedback } from '../../ui/feedback';
import { Avatar, Empty, Meter, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { useResponses } from './responses';
import TaskForm from './TaskForm';
import { useTasks } from './useTasks';

interface RowProps { task: Task; mine?: ResponseStatus; doneBy: number; subject: string; tone: number; date?: boolean; dayTag?: string }

function TaskRow({ task, mine, doneBy, subject, tone, date, dayTag }: RowProps) {
  const store = useStore();
  const { user, name, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run } = useFeedback();
  const path = `tasks/${task.id}/responses/${user.uid}`;
  const toggle = () => run(() => (mine === 'done' ? store.remove(path) : store.set(path, { status: 'done', name, updatedAt: NOW })));
  const assigned = task.audience.includes('all') || task.audience.includes(user.uid);

  return (
    <li className={`row task ${mine ?? ''} ${assigned ? '' : 'no-tick'}`}>
      {assigned && <button className="tick" aria-pressed={mine === 'done'} aria-label={`${t('markDone')}: ${task.title}`} onClick={toggle}><span><Check size={16} strokeWidth={3} aria-hidden /></span></button>}
      <Link to={`/tasks/${task.id}`} className="row-main">
        <strong>{task.title}</strong>
        <span className="meta">
          <span className={`subject-dot tone-${tone}`}>{subject}</span>
          {date && <span>{formatDate(task.dueDate, lang)}</span>}
          {mine && mine !== 'done' && <span className={`tag ${mine}`}>{t(mine)}</span>}
          {isAdmin && <span>{t('done')}: <bdi>{doneBy}</bdi></span>}
        </span>
      </Link>
      {dayTag && <span className="tag day-tag">{dayTag}</span>}
    </li>
  );
}

export default function TodayPage() {
  const { user, isAdmin, name, photoURL } = useSession();
  const { t, lang } = usePrefs();
  const tasks = useTasks();
  const responses = useResponses();
  const subjects = useSubjects();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const now = today();
  const selected = picked ?? now;
  const days = [-2, -1, 0, 1, 2, 3, 4].map((n) => addDays(now, n));
  const mine = (id: string) => responses.byTask[id]?.find((r) => r.id === user.uid)?.status;
  // لا نصنف المهمة قبل معرفة ردودها، حتى لا تقفز بين الأقسام.
  const ready = tasks.data.filter((x) => responses.byTask[x.id]);
  const waiting = tasks.loading || ready.length < tasks.data.length;
  const bucket = (task: Task) => bucketOf(task, mine(task.id), now);
  const unfinished = (day: string) => ready.some((x) => x.dueDate === day && mine(x.id) !== 'done' && mine(x.id) !== 'declined');

  const isToday = selected === now;
  const late = ready.filter((x) => bucket(x) === 'late');
  const dayList = ready.filter((x) => x.dueDate === selected && !(isToday && mine(x.id) === 'declined'));
  const counted = dayList.filter((x) => x.audience.includes('all') || x.audience.includes(user.uid)).filter((x) => mine(x.id) !== 'declined');
  const upcoming = ready.filter((x) => bucket(x) === 'next');
  // مهام اليوم المنجزة تبقى في قائمة اليوم، فلا تتكرر هنا.
  const closed = ready.filter((x) => bucket(x) === 'closed' && !(x.dueDate === now && mine(x.id) === 'done'));

  const rows = (list: Task[], extra: (x: Task) => Partial<RowProps> = () => ({})) => (
    <ul className="card">
      {list.map((x) => <TaskRow key={x.id} task={x} mine={mine(x.id)} subject={subjects.nameOf(x.subjectId)} tone={subjects.tone(x.subjectId)}
        doneBy={responses.byTask[x.id].filter((r) => r.status === 'done').length} {...extra(x)} />)}
    </ul>
  );

  return (
    <>
      <header className="hello">
        <div>
          <p>{formatDay(now, lang)}</p>
          <h1>{t('hello')} <bdi>{name.trim().split(/\s+/)[0]}</bdi></h1>
        </div>
        <Link to="/profile" aria-label={t('profile')}><Avatar name={name} url={photoURL} /></Link>
      </header>

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

      <Status loading={waiting} error={tasks.error} />
      {!tasks.loading && !tasks.error && !tasks.data.length ? (
        <Empty title={t('noTasks')}><span>{t(isAdmin ? 'noTasksAdmin' : 'noTasksStudent')}</span></Empty>
      ) : !tasks.error && (
        <>
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
          {isToday && upcoming.length > 0 && (
            <section className="group">
              <h2>{t('upcoming')}</h2>
              {rows(upcoming, (x) => ({ dayTag: x.dueDate <= addDays(now, 6) ? weekday(x.dueDate, lang) : formatDate(x.dueDate, lang) }))}
            </section>
          )}
          {isToday && closed.length > 0 && (
            <details className="group">
              <summary><span>{t('closed')} (<bdi>{closed.length}</bdi>)</span><ChevronDown size={20} aria-hidden /></summary>
              {rows(closed, () => ({ date: true }))}
            </details>
          )}
        </>
      )}
      {isAdmin && <button className="btn primary fab" onClick={() => setAdding(true)}><Plus size={20} aria-hidden />{t('newTask')}</button>}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  );
}
