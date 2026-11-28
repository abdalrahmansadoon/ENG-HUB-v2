import { ChevronLeft, ChevronRight, CircleDashed, ListChecks, Megaphone, Plus, Timer } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSession } from '../../data/context';
import type { StudySession } from '../../data/types';
import { addDays, formatClock, formatDate, formatDay, monthTitle, today, weekday } from '../../lib/dates';
import type { Key } from '../../lib/i18n';
import { AGENDA_DAYS, monthGrid, shiftDate, weekDays, type CalendarView } from '../../lib/planner';
import { Empty, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useAnnouncements, kindKeys } from '../announcements/useAnnouncements';
import { useSessions } from '../planner/usePlanner';
import SessionForm from '../study/SessionForm';
import { taskPath } from '../tasks/actions';
import { useResponses } from '../tasks/responses';
import { useTasks } from '../tasks/useTasks';
import { useSubjects } from '../useSubjects';
import { eventsByDay, type CalendarEvent } from './events';

const views: [CalendarView, Key][] = [['month', 'calMonth'], ['week', 'calWeek'], ['day', 'calDay'], ['agenda', 'calAgenda']];
const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const kindName: Record<CalendarEvent['kind'], Key> = { task: 'evTask', session: 'evSession', announcement: 'evAnnouncement' };

function useEvents() {
  const { user } = useSession();
  const tasks = useTasks();
  const sessions = useSessions();
  const announcements = useAnnouncements();
  const { byTask } = useResponses();
  return {
    days: eventsByDay(tasks.data, sessions.data, announcements.data, (task) => byTask[task.id]?.some((r) => r.id === user.uid && r.status === 'done') ?? false),
    loading: tasks.loading || sessions.loading || announcements.loading,
    error: tasks.error ?? sessions.error ?? announcements.error,
  };
}

function EventList({ events, onOpen }: { events: CalendarEvent[]; onOpen(s: StudySession): void }) {
  const { t, lang } = usePrefs();
  const subjects = useSubjects();
  return (
    <ul className="card events">
      {events.map((e) => {
        const Icon = e.kind === 'task' ? ListChecks : e.kind === 'announcement' ? Megaphone : e.done ? Timer : CircleDashed;
        const content = (
          <>
            <span className={`tile small ev-${e.kind}`}><Icon size={18} aria-hidden /></span>
            <span className="row-main">
              <strong>{e.title || subjects.nameOf(e.subjectId)}</strong>
              <span className="meta">
                <span>{t(e.announcement ? kindKeys[e.announcement.kind] : kindName[e.kind])}</span>
                {e.title && <span>{subjects.nameOf(e.subjectId)}</span>}
                {e.time && <span>{formatClock(e.time, lang)}</span>}
                {e.session && <span><bdi>{e.session.status === 'done' ? e.session.actual : e.session.planned}</bdi> {t('minutes')}</span>}
              </span>
            </span>
            {e.done && <span className="tag done">{t(e.kind === 'session' ? 'ssDone' : 'done')}</span>}
          </>
        );
        return (
          <li key={e.key}>
            {e.session ? <button type="button" className="row link plain-row" onClick={() => onOpen(e.session!)}>{content}</button>
              : <Link className="row link" to={e.task ? taskPath(e.task) : `/announcements#${e.announcement!.id}`}>{content}</Link>}
          </li>
        );
      })}
    </ul>
  );
}

function Legend() {
  const { t } = usePrefs();
  return <p className="cal-legend">{(['task', 'session', 'announcement'] as const).map((k) => <span key={k}><i className={`mark ${k}`} aria-hidden />{t(kindName[k])}</span>)}</p>;
}

interface MonthProps { date: string; days: Record<string, CalendarEvent[]>; onPick(day: string): void }

/** شبكة الشهر: الأسهم تنقل بين الأيام. */
function Month({ date, days, onPick }: MonthProps) {
  const { t, lang } = usePrefs();
  const grid = useRef<HTMLDivElement>(null);
  const cells = monthGrid(date);
  const now = today();
  // التركيز يتبع اليوم المختار بعد رسمه.
  const follow = useRef('');
  useEffect(() => {
    if (follow.current !== date) return;
    follow.current = '';
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${date}"]`)?.focus();
  }, [date]);
  const move = (e: KeyboardEvent) => {
    const side = lang === 'ar' ? -1 : 1;
    const step = ({ ArrowRight: side, ArrowLeft: -side, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key];
    if (!step) return;
    e.preventDefault();
    // من اليوم الذي عليه التركيز، فالضغطات السريعة لا تضيع.
    const next = addDays(follow.current || date, step);
    follow.current = next;
    onPick(next);
  };
  return (
    <div className="card month">
      <div className="month-head" aria-hidden="true">
        {cells.slice(0, 7).map((d) => <span key={d}>{lang === 'ar' ? weekday(d, lang).replace(/^ال/, '') : weekday(d, lang, 'short')}</span>)}
      </div>
      <div className="month-grid" ref={grid} onKeyDown={move} role="group" aria-label={monthTitle(date, lang)}>
        {cells.map((day) => {
          const events = days[day] ?? [];
          return (
            <button key={day} type="button" data-day={day} tabIndex={day === date ? 0 : -1} aria-pressed={day === date}
              className={[day.slice(0, 7) !== date.slice(0, 7) && 'out', day === now && 'now'].filter(Boolean).join(' ') || undefined}
              aria-label={`${formatDay(day, lang)}${events.length ? `، ${t('eventsCount')}: ${events.length}` : ''}`}
              onClick={() => onPick(day)}>
              <b>{Number(day.slice(8))}</b>
              {events.length > 0 && <span className="marks" aria-hidden="true">{events.slice(0, 4).map((e) => <i key={e.key} className={`mark ${e.kind}`} />)}</span>}
              <span className="titles" aria-hidden="true">
                {events.slice(0, 2).map((e) => <span key={e.key} className={`chip-event ${e.kind}`}>{e.title || t(kindName[e.kind])}</span>)}
                {events.length > 2 && <small>+{events.length - 2}</small>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { rules3 } = useSession();
  const { t, lang } = usePrefs();
  const [params, setParams] = useSearchParams();
  const now = today();
  const view = views.find(([v]) => v === params.get('view'))?.[0] ?? 'month';
  const raw = params.get('date');
  const date = isDate(raw) ? raw : now;
  const go = (nextView: CalendarView, nextDate: string) => {
    const next: Record<string, string> = {};
    if (nextView !== 'month') next.view = nextView;
    if (nextDate !== now) next.date = nextDate;
    setParams(next, { replace: true });
  };
  const { days, loading, error } = useEvents();
  const [form, setForm] = useState<{ session?: StudySession; date?: string } | null>(null);
  const open = (session: StudySession) => setForm({ session });
  const week = weekDays(date);
  const title = view === 'month' ? monthTitle(date, lang)
    : view === 'day' ? formatDay(date, lang)
    : `${formatDate(view === 'week' ? week[0] : date, lang)} – ${formatDate(view === 'week' ? week[6] : addDays(date, AGENDA_DAYS - 1), lang)}`;
  const [Prev, Next] = lang === 'ar' ? [ChevronRight, ChevronLeft] : [ChevronLeft, ChevronRight];
  const agenda = Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(date, i)).filter((d) => days[d]?.length);
  const oldest = view === 'month' ? `${date.slice(0, 7)}-01` : view === 'week' ? week[0] : date;
  const dayBlock = (day: string, heading: boolean) => (
    <section key={day} className="group" data-today={day === now || undefined}>
      {heading && <h2>{formatDay(day, lang)}</h2>}
      {days[day]?.length ? <EventList events={days[day]} onOpen={open} /> : <Empty title={t('noEvents')} />}
    </section>
  );

  return (
    <>
      <PageHead title={t('calendar')}>
        {rules3 && <button type="button" className="btn primary small" onClick={() => setForm({ date: date < now && view !== 'day' ? now : date })}><Plus size={18} aria-hidden />{t('planSession')}</button>}
      </PageHead>
      <div className="segmented view-switch" role="group" aria-label={t('calendarViews')}>
        {views.map(([v, key]) => <button key={v} aria-pressed={view === v} onClick={() => go(v, date)}>{t(key)}</button>)}
      </div>
      <div className="period-nav">
        <button type="button" className="icon-btn" aria-label={t('previous')} onClick={() => go(view, shiftDate(view, date, -1))}><Prev size={20} aria-hidden /></button>
        <h2 aria-live="polite">{title}</h2>
        <button type="button" className="icon-btn" aria-label={t('nextPeriod')} onClick={() => go(view, shiftDate(view, date, 1))}><Next size={20} aria-hidden /></button>
        {date !== now && <button type="button" className="btn small" onClick={() => go(view, now)}>{t('goToday')}</button>}
      </div>
      <Status loading={loading} error={error} />
      {oldest < addDays(now, -30) && <p className="muted">{t('olderTasksHidden')}</p>}
      {!loading && !error && (
        view === 'month' ? (
          <div className="split cols">
            <div><Month date={date} days={days} onPick={(d) => go('month', d)} /><Legend /></div>
            <div>{dayBlock(date, true)}</div>
          </div>
        ) : view === 'week' ? (
          <div className="week-columns">{week.map((day) => (
            <section key={day} className="group" data-today={day === now || undefined}>
              <h2><button type="button" onClick={() => go('day', day)}>{formatDay(day, lang)}</button></h2>
              {days[day]?.length ? <EventList events={days[day]} onOpen={open} /> : <p className="muted">{t('freeDay')}</p>}
            </section>
          ))}</div>
        ) : view === 'day' ? dayBlock(date, false)
          : agenda.length ? <div className="agenda">{agenda.map((d) => dayBlock(d, true))}</div> : <Empty title={t('noAgenda')} />
      )}
      {form && <SessionForm session={form.session} preset={form.date ? { date: form.date } : undefined} onClose={() => setForm(null)} />}
    </>
  );
}
