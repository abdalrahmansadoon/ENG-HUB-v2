import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { ResponseStatus, Task } from '../../data/types';
import { formatDay, today } from '../../lib/dates';
import { bucketOf, type Bucket } from '../../lib/tasks';
import { useFeedback } from '../../ui/feedback';
import { SubjectIcon } from '../../ui/icons';
import { Dimension, Empty, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { savedTerm } from '../subjects/terms';
import { useSubjects } from '../useSubjects';
import { useResponses } from './responses';
import TaskForm from './TaskForm';
import { useTasks } from './useTasks';

function TaskRow({ task, mine, doneBy, subject }: { task: Task; mine?: ResponseStatus; doneBy: number; subject: string }) {
  const store = useStore();
  const { user, name, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run } = useFeedback();
  const path = `tasks/${task.id}/responses/${user.uid}`;
  const toggle = () => run(() => (mine === 'done' ? store.remove(path) : store.set(path, { status: 'done', name, updatedAt: NOW })));
  const assigned = task.audience.includes('all') || task.audience.includes(user.uid);

  return (
    <li className={`row task ${mine ?? ''}`}>
      {assigned && <button className="tick" aria-pressed={mine === 'done'} aria-label={`${t('markDone')}: ${task.title}`} onClick={toggle}><Check size={18} /></button>}
      <Link to={`/tasks/${task.id}`} className="row-main">
        <strong>{task.title}</strong>
        <span className="meta">
          <span>{subject}</span>
          <span>{formatDay(task.dueDate, lang)}</span>
          {mine && mine !== 'done' && <span className={`tag ${mine}`}>{t(mine)}</span>}
          {isAdmin && <span>{t('done')}: <bdi>{doneBy}</bdi></span>}
        </span>
      </Link>
    </li>
  );
}

export default function TodayPage() {
  const { user, isAdmin, name } = useSession();
  const { t, lang } = usePrefs();
  const tasks = useTasks();
  const responses = useResponses();
  const subjects = useSubjects();
  const [adding, setAdding] = useState(false);
  const now = today();
  const [year, term] = savedTerm();
  const inTerm = subjects.data.filter((s) => s.year === year && s.term === term);
  const shortcuts = inTerm.length ? inTerm : subjects.data.filter((s) => s.year === 'prep' && s.term === '1');
  const mine = (id: string) => responses.byTask[id]?.find((r) => r.id === user.uid)?.status;
  // لا نصنف المهمة قبل معرفة ردودها، حتى لا تقفز بين الأقسام.
  const ready = tasks.data.filter((x) => responses.byTask[x.id]);
  const waiting = tasks.loading || ready.length < tasks.data.length;
  const todays = ready.filter((x) => x.dueDate === now && mine(x.id) !== 'declined');
  const done = todays.filter((x) => mine(x.id) === 'done').length;
  const bucket = (task: Task) => bucketOf(task, mine(task.id), now);
  const open = ready.filter((x) => bucket(x) !== 'closed').length;
  const groups: [Bucket, 'late' | 'dueToday' | 'upcoming' | 'closed'][] = [['late', 'late'], ['today', 'dueToday'], ['next', 'upcoming'], ['closed', 'closed']];

  return (
    <>
      <PageHead title={t('today')}>
        {isAdmin && <button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} aria-hidden />{t('newTask')}</button>}
      </PageHead>
      {/* خانة العنوان، كما في لوحة الرسم الهندسي */}
      <section className="titleblock">
        <div><strong>{formatDay(now, lang)}</strong><span>{name}</span></div>
        <div><span>{t('openTasks')}</span><strong className="big">{open}</strong></div>
        <div className="tb-full"><span>{t('doneCount')}</span><Dimension value={done} total={todays.length} label={t('doneCount')} /></div>
      </section>
      {shortcuts.length > 0 && (
        <nav className="shortcuts" aria-label={t('subjects')}>
          {shortcuts.map((s) => <Link key={s.id} to={`/subjects/${s.id}`}><span className="drawer-icon"><SubjectIcon name={s.icon} /></span><span>{subjects.label(s)}</span></Link>)}
        </nav>
      )}
      <Status loading={waiting} error={tasks.error} />
      {!tasks.loading && !tasks.error && !tasks.data.length && <Empty title={t('noTasks')}><span>{t(isAdmin ? 'noTasksAdmin' : 'noTasksStudent')}</span></Empty>}
      {groups.map(([key, heading]) => {
        const rows = ready.filter((x) => bucket(x) === key);
        if (!rows.length) return null;
        return (
          <section key={key} className={`group ${key}`}>
            <h2>{t(heading)}</h2>
            <ul className="sheet list">
              {rows.map((x) => <TaskRow key={x.id} task={x} mine={mine(x.id)} subject={subjects.nameOf(x.subjectId)}
                doneBy={responses.byTask[x.id].filter((r) => r.status === 'done').length} />)}
            </ul>
          </section>
        );
      })}
      {adding && <TaskForm onClose={() => setAdding(false)} />}
    </>
  );
}
