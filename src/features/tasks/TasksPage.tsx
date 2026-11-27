import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '../../data/context';
import type { Task } from '../../data/types';
import { addDays, formatDate, formatDay, today, weekday } from '../../lib/dates';
import { bucketOf } from '../../lib/tasks';
import { Empty, Meter, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import TaskForm from './TaskForm';
import { useTaskList } from './useTaskList';

export default function TasksPage() {
  const { user, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { tasks, ready, waiting, mine, rows } = useTaskList();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const now = today();
  const selected = picked ?? now;
  const days = [-2, -1, 0, 1, 2, 3, 4].map((n) => addDays(now, n));
  const bucket = (task: Task) => bucketOf(task, mine(task.id), now);
  const unfinished = (day: string) => ready.some((x) => x.dueDate === day && mine(x.id) !== 'done' && mine(x.id) !== 'declined');

  const isToday = selected === now;
  const late = ready.filter((x) => bucket(x) === 'late');
  const dayList = ready.filter((x) => x.dueDate === selected && !(isToday && mine(x.id) === 'declined'));
  const counted = dayList.filter((x) => x.audience.includes('all') || x.audience.includes(user.uid)).filter((x) => mine(x.id) !== 'declined');
  const upcoming = ready.filter((x) => bucket(x) === 'next');
  // مهام اليوم المنجزة تبقى في قائمة اليوم، فلا تتكرر هنا.
  const closed = ready.filter((x) => bucket(x) === 'closed' && !(x.dueDate === now && mine(x.id) === 'done'));
  const side = isToday && (upcoming.length > 0 || closed.length > 0);

  return (
    <>
      <PageHead title={t('tasks')}><p>{formatDay(now, lang)}</p></PageHead>

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
        <div className={side ? 'split cols' : 'split'}>
          <div>
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
            {upcoming.length > 0 && (
              <section className="group">
                <h2>{t('upcoming')}</h2>
                {rows(upcoming, (x) => ({ dayTag: x.dueDate <= addDays(now, 6) ? weekday(x.dueDate, lang) : formatDate(x.dueDate, lang) }))}
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
      )}
      {isAdmin && <button className="btn primary fab" onClick={() => setAdding(true)}><Plus size={20} aria-hidden />{t('newTask')}</button>}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  );
}
