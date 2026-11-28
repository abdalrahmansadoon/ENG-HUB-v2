import { ChevronLeft, ChevronRight, ListChecks, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StudySession } from '../../data/types';
import { addDays, formatDate, formatDay, today } from '../../lib/dates';
import { HISTORY_DAYS, minutesBetween, weekDays, weekStart } from '../../lib/planner';
import { Meter } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { taskPath } from '../tasks/actions';
import { useTasks } from '../tasks/useTasks';
import SessionList from './SessionList';

interface Props { sessions: StudySession[]; onOpen(s: StudySession): void; onAdd(date: string): void }

/** خطة الأسبوع: الجلسات المخططة بجانب المهام المستحقة. */
export default function PlanView({ sessions, onOpen, onAdd }: Props) {
  const { t, lang } = usePrefs();
  const tasks = useTasks();
  const now = today();
  const [from, setFrom] = useState(() => weekStart(now));
  const days = weekDays(from);
  const to = days[6];
  const inWeek = sessions.filter((s) => s.date >= from && s.date <= to);
  const planned = inWeek.reduce((n, s) => n + (s.status === 'skipped' ? 0 : s.planned), 0);
  const done = minutesBetween(sessions, from, to);
  const [Prev, Next] = lang === 'ar' ? [ChevronRight, ChevronLeft] : [ChevronLeft, ChevronRight];
  return (
    <>
      <div className="period-nav">
        <button type="button" className="icon-btn" aria-label={t('prevWeek')} onClick={() => setFrom(addDays(from, -7))}><Prev size={20} aria-hidden /></button>
        <h2 aria-live="polite">{formatDate(from, lang)} – {formatDate(to, lang)}</h2>
        <button type="button" className="icon-btn" aria-label={t('nextWeek')} onClick={() => setFrom(addDays(from, 7))}><Next size={20} aria-hidden /></button>
        {from !== weekStart(now) && <button type="button" className="btn small" onClick={() => setFrom(weekStart(now))}>{t('thisWeek')}</button>}
      </div>
      {planned > 0 && <div className="card pad"><Meter value={done} total={planned} label={t('weekMinutes')} /><p className="muted">{t('weekMinutesNote')}</p></div>}
      {from < addDays(now, -HISTORY_DAYS) && <p className="notice">{t('olderHidden')}</p>}
      <div className="plan-grid">
        {days.map((day) => {
          const own = inWeek.filter((s) => s.date === day);
          const due = tasks.data.filter((x) => x.dueDate === day && !x.cancelled);
          return (
            <section key={day} className="group" data-today={day === now || undefined}>
              <div className="group-head">
                <h3>{formatDay(day, lang)}</h3>
                <button type="button" className="icon-btn plain" aria-label={`${t('newSession')}: ${formatDay(day, lang)}`} onClick={() => onAdd(day)}><Plus size={20} aria-hidden /></button>
              </div>
              {own.length > 0 && <SessionList sessions={own} onOpen={onOpen} />}
              {due.length > 0 && <ul className="due-list">{due.map((x) => (
                <li key={x.id}><Link to={taskPath(x)}><ListChecks size={16} aria-hidden /><span>{x.title}</span></Link></li>
              ))}</ul>}
              {!own.length && !due.length && <p className="muted">{t('freeDay')}</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
