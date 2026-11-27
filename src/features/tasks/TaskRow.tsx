import { Check, FileUp, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession } from '../../data/context';
import type { Task, TaskResponse } from '../../data/types';
import { formatDate, today } from '../../lib/dates';
import { viewStatus } from '../../lib/tasks';
import { useFeedback } from '../../ui/feedback';
import { usePrefs } from '../../ui/prefs';
import { taskPath, useTaskActions } from './actions';
import { PriorityTag, StatusTag } from './tags';

interface Props { task: Task; mine?: TaskResponse; doneBy: number; subject: string; tone: number; date?: boolean; dayTag?: string }

// آخر مهمة أُنجزت للتو: صفها قد يُعاد إنشاؤه حين ينتقل بين الأقسام.
let stamped = { id: '', at: 0 };

export default function TaskRow({ task, mine, doneBy, subject, tone, date, dayTag }: Props) {
  const { user, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run } = useFeedback();
  const { setStatus } = useTaskActions();
  const status = mine?.status;
  const toggle = () => {
    if (status !== 'done') stamped = { id: task.id, at: Date.now() };
    return run(() => setStatus(task, mine, 'done'));
  };
  const assigned = task.audience.includes('all') || task.audience.includes(user.uid);
  const just = status === 'done' && stamped.id === task.id && Date.now() - stamped.at < 1000;
  const view = viewStatus(task, status, today());
  // مهام المراجعة تُنجز بالتسليم من صفحتها لا بالتأشير.
  const tick = assigned && !task.cancelled && !task.review;
  const show = view === 'accepted' || view === 'declined' || view === 'submitted' || view === 'review' || view === 'rejected' || view === 'cancelled' || (task.review && view === 'done');

  return (
    <li className={`row task ${status ?? ''} ${task.cancelled ? 'cancelled' : ''} ${tick || (task.review && assigned) ? '' : 'no-tick'}`}>
      {tick && <button className={just ? 'tick just' : 'tick'} aria-pressed={status === 'done'} aria-label={`${t('markDone')}: ${task.title}`} onClick={toggle}><span><Check size={16} strokeWidth={3} aria-hidden /></span></button>}
      {!tick && task.review && assigned && <span className={status === 'done' ? 'tick handin done' : 'tick handin'} aria-hidden="true">{status === 'done' ? <Check size={18} strokeWidth={3} /> : <FileUp size={20} />}</span>}
      <Link to={taskPath(task)} className="row-main">
        <strong>{task.title}</strong>
        <span className="meta">
          <span className={`subject-dot tone-${tone}`}>{subject}</span>
          {date && <span>{formatDate(task.dueDate, lang)}</span>}
          <PriorityTag priority={task.priority} />
          {show && <StatusTag status={view} />}
          {task.personal && <span className="tag">{t('personal')}</span>}
          {task.seriesId && <Repeat size={14} role="img" aria-label={t('recurring')} />}
          {isAdmin && !task.personal && <span>{t('done')}: <bdi>{doneBy}</bdi></span>}
        </span>
      </Link>
      {dayTag && <span className="tag day-tag">{dayTag}</span>}
    </li>
  );
}
