import { Download, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCollection, useSession } from '../../data/context';
import type { Item, Progress, Quiz } from '../../data/types';
import { countByDay, completionDay, daysEnding, dailyValues, percent, subjectActivity, taskFigures } from '../../lib/analytics';
import { formatShort, toKey, today } from '../../lib/dates';
import { downloadCsv } from '../../lib/download';
import { minutesBetween, minutesByDay } from '../../lib/planner';
import { Empty, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSessions } from '../planner/usePlanner';
import { useResponses } from '../tasks/responses';
import { useTasks } from '../tasks/useTasks';
import { useSubjects } from '../useSubjects';
import BarChart from './BarChart';
import { Figures, hours } from './parts';
import { useQuizResults } from './useQuizResults';

export default function MyStats({ period }: { period: number }) {
  const { user, isAdmin, rules3, rules3Old } = useSession();
  const { t, lang } = usePrefs();
  const subjects = useSubjects();
  const tasks = useTasks();
  const { byTask } = useResponses();
  const sessions = useSessions();
  const progress = useCollection<Progress>(`users/${user.uid}/progress`);
  const items = useCollection<Item>('items');
  const quizzes = useCollection<Quiz>('quizzes', isAdmin ? {} : { where: ['published', '==', true] });
  const quiz = useQuizResults(quizzes.data);

  const now = today();
  const days = daysEnding(now, period);
  const from = days[0];
  const mine = (id: string) => byTask[id]?.find((r) => r.id === user.uid);
  const loading = tasks.loading || sessions.loading || progress.loading || items.loading || quizzes.loading || tasks.data.some((x) => !byTask[x.id]);
  const error = tasks.error ?? sessions.error ?? progress.error ?? items.error ?? quizzes.error;
  if (loading || error) return <Status loading={loading} error={error} />;

  const figures = taskFigures(tasks.data, mine, user.uid, from, now);
  const minutes = minutesBetween(sessions.data, from, now);
  const studied = progress.data.filter((p) => toKey(new Date(p.at)) >= from);
  const lectureIds = new Set(items.data.filter((i) => i.category === 'lectures').map((i) => i.id));
  const lectures = studied.filter((p) => lectureIds.has(p.id)).length;
  const results = quiz.results.filter((r) => toKey(new Date(r.at)) >= from);
  const average = (list: typeof results) => percent(list.reduce((n, r) => n + r.score, 0), list.reduce((n, r) => n + r.total, 0));
  const rows = subjectActivity(tasks.data, mine, user.uid, sessions.data, progress.data, from, now)
    .map((r) => ({ ...r, quiz: average(results.filter((x) => x.quiz.subjectId === r.subjectId)), name: subjects.nameOf(r.subjectId) }));
  // نشاط اختبارات دون أي نشاط آخر يظهر أيضاً.
  for (const r of results) if (!rows.some((x) => x.subjectId === r.quiz.subjectId)) {
    rows.push({ subjectId: r.quiz.subjectId, name: subjects.nameOf(r.quiz.subjectId), minutes: 0, completed: 0, assigned: 0, studied: 0, quiz: average(results.filter((x) => x.quiz.subjectId === r.quiz.subjectId)) });
  }
  const done = tasks.data.map((x) => completionDay(mine(x.id)));
  const pct = (v: number | null) => (v === null ? '–' : `${v}%`);
  const summary: [string, string | number][] = [
    [t('stAssigned'), figures.assigned], [t('done'), figures.completed], [t('stOnTime'), pct(percent(figures.onTime, figures.completed))], [t('late'), figures.overdue],
    ...(rules3 ? [[t('stHours'), hours(minutes)] as [string, string]] : []),
    [t('stLectures'), lectures], [t('stQuizAverage'), quiz.loading ? '–' : pct(average(results))],
  ];
  const exportCsv = () => downloadCsv(`${t('stats')} ${now}`, [
    [t('measure'), t('value')], ...summary, [],
    [t('subject'), t('done'), t('stAssigned'), t('stMinutes'), t('stLectures'), t('stQuizAverage')],
    ...rows.map((r) => [r.name, r.completed, r.assigned, r.minutes, r.studied, pct(r.quiz)]),
  ]);

  return (
    <>
      <div className="actions no-print">
        <button type="button" className="btn small" onClick={exportCsv}><Download size={16} aria-hidden />{t('exportCsv')}</button>
        <button type="button" className="btn small" onClick={() => print()}><Printer size={16} aria-hidden />{t('printPdf')}</button>
      </div>
      <Figures items={summary} />
      {rules3Old && <p className="notice">{t('rules3Student')}</p>}
      <div className="chart-grid">
        {rules3 && <BarChart label={t('stMinutes')} days={dailyValues(days, minutesByDay(sessions.data))} tone="s2" empty={t('noStudyYet')} />}
        <BarChart label={t('actDone')} days={dailyValues(days, countByDay(done))} empty={t('noDoneYet')} />
      </div>
      <section className="group">
        <h2>{t('bySubject')}</h2>
        {!rows.length ? <Empty title={t('noActivity')} /> : (
          <div className="card table-card"><table className="data-table">
            <thead><tr><th scope="col">{t('subject')}</th><th scope="col">{t('tasks')}</th><th scope="col">{t('stMinutes')}</th><th scope="col">{t('stLectures')}</th><th scope="col">{t('stQuizAverage')}</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.subjectId}>
                <th scope="row"><span className={`subject-dot tone-${subjects.tone(r.subjectId)}`}>{r.name}</span></th>
                <td data-label={t('tasks')}><bdi dir="ltr">{r.completed}/{r.assigned}</bdi></td>
                <td data-label={t('stMinutes')}>{r.minutes}</td>
                <td data-label={t('stLectures')}>{r.studied}</td>
                <td data-label={t('stQuizAverage')}>{pct(r.quiz)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <p className="muted">{t('mostActiveNote')}</p>
      </section>
      <section className="group">
        <h2>{t('quizResults')}</h2>
        {quiz.loading ? <Status loading /> : !results.length ? <Empty title={t('noQuizResults')} /> : (
          <ul className="card">{results.map((r) => (
            <li key={r.quiz.id}><Link to={`/quizzes/${r.quiz.id}`} className="row link">
              <span className="row-main"><strong>{r.quiz.title}</strong><span className="meta"><span>{subjects.nameOf(r.quiz.subjectId)}</span><span>{formatShort(r.at, lang)}</span></span></span>
              <b className="score"><bdi dir="ltr">{r.score}/{r.total}</bdi></b>
            </Link></li>
          ))}</ul>
        )}
      </section>
      <p className="muted">{t('statsPrivate')}</p>
    </>
  );
}
