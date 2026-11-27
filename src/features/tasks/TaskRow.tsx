import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { ResponseStatus, Task } from '../../data/types';
import { formatDate } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { usePrefs } from '../../ui/prefs';

interface Props { task: Task; mine?: ResponseStatus; doneBy: number; subject: string; tone: number; date?: boolean; dayTag?: string }

// آخر مهمة أُنجزت للتو: صفها قد يُعاد إنشاؤه حين ينتقل بين الأقسام.
let stamped = { id: '', at: 0 };

export default function TaskRow({ task, mine, doneBy, subject, tone, date, dayTag }: Props) {
  const store = useStore();
  const { user, name, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run } = useFeedback();
  const path = `tasks/${task.id}/responses/${user.uid}`;
  const toggle = () => {
    if (mine === 'done') return run(() => store.remove(path));
    stamped = { id: task.id, at: Date.now() };
    return run(() => store.set(path, { status: 'done', name, updatedAt: NOW }));
  };
  const assigned = task.audience.includes('all') || task.audience.includes(user.uid);
  const just = mine === 'done' && stamped.id === task.id && Date.now() - stamped.at < 1000;

  return (
    <li className={`row task ${mine ?? ''} ${assigned ? '' : 'no-tick'}`}>
      {assigned && <button className={just ? 'tick just' : 'tick'} aria-pressed={mine === 'done'} aria-label={`${t('markDone')}: ${task.title}`} onClick={toggle}><span><Check size={16} strokeWidth={3} aria-hidden /></span></button>}
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
