import { Download, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCollection } from '../../data/context';
import type { Profile } from '../../data/types';
import { daysEnding, percent, taskFigures } from '../../lib/analytics';
import { formatDate, today } from '../../lib/dates';
import { downloadCsv } from '../../lib/download';
import { Empty, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { taskPath } from '../tasks/actions';
import { useResponses } from '../tasks/responses';
import { useTasks } from '../tasks/useTasks';
import { Figures } from './parts';

/** متابعة الدفعة للمشرف: أرقام المهام فقط، مرتبة بالاسم دون تفضيل أحد. */
export default function ClassStats({ period }: { period: number }) {
  const { t, lang } = usePrefs();
  const tasks = useTasks();
  const { byTask } = useResponses();
  const members = useCollection<Profile>('profiles');
  const now = today();
  const from = daysEnding(now, period)[0];
  const shared = tasks.data.filter((x) => !x.personal && !x.cancelled && x.dueDate >= from && x.dueDate <= now);
  const loading = tasks.loading || members.loading || shared.some((x) => !byTask[x.id]);
  const error = tasks.error ?? members.error;
  if (loading || error) return <Status loading={loading} error={error} />;
  const pct = (v: number | null) => (v === null ? '–' : `${v}%`);
  const rows = [...members.data].sort((a, b) => a.name.localeCompare(b.name, lang)).map((m) => ({
    member: m, ...taskFigures(shared, (id) => byTask[id]?.find((r) => r.id === m.id), m.id, from, now),
  })).filter((r) => r.assigned > 0);
  const perTask = shared.map((task) => {
    const assigned = members.data.filter((m) => task.audience.includes('all') || task.audience.includes(m.id));
    const replies = byTask[task.id] ?? [];
    const count = (status: string) => assigned.filter((m) => replies.some((r) => r.id === m.id && r.status === status)).length;
    const declined = count('declined');
    return { task, assigned: assigned.length - declined, done: count('done') };
  }).sort((a, b) => b.task.dueDate.localeCompare(a.task.dueDate));
  const total = rows.reduce((n, r) => ({ assigned: n.assigned + r.assigned, completed: n.completed + r.completed, overdue: n.overdue + r.overdue }), { assigned: 0, completed: 0, overdue: 0 });
  const exportCsv = () => downloadCsv(`${t('classStats')} ${now}`, [
    [t('member'), t('stAssigned'), t('done'), t('stOnTime'), t('late')],
    ...rows.map((r) => [r.member.name, r.assigned, r.completed, pct(percent(r.onTime, r.completed)), r.overdue]), [],
    [t('title'), t('dueDate'), t('done'), t('stAssigned')],
    ...perTask.map((x) => [x.task.title, x.task.dueDate, x.done, x.assigned]),
  ]);
  if (!shared.length) return <Empty title={t('noClassTasks')} />;
  return (
    <>
      <div className="actions no-print">
        <button type="button" className="btn small" onClick={exportCsv}><Download size={16} aria-hidden />{t('exportCsv')}</button>
        <button type="button" className="btn small" onClick={() => print()}><Printer size={16} aria-hidden />{t('printPdf')}</button>
      </div>
      <Figures items={[[t('classTasks'), shared.length], [t('membersCount'), members.data.length], [t('completionRate'), pct(percent(total.completed, total.assigned))], [t('lateReplies'), total.overdue]]} />
      <section className="group">
        <h2>{t('byTask')}</h2>
        <ul className="card">{perTask.map((x) => (
          <li key={x.task.id}><Link to={taskPath(x.task)} className="row link">
            <span className="row-main"><strong>{x.task.title}</strong>
              <span className="meta"><span>{formatDate(x.task.dueDate, lang)}</span></span></span>
            <span className="ratio"><bdi dir="ltr">{x.done}/{x.assigned}</bdi> {t('done')}</span>
          </Link></li>
        ))}</ul>
      </section>
      <section className="group">
        <h2>{t('byMember')}</h2>
        <div className="card table-card"><table className="data-table">
          <thead><tr><th scope="col">{t('member')}</th><th scope="col">{t('stAssigned')}</th><th scope="col">{t('done')}</th><th scope="col">{t('stOnTime')}</th><th scope="col">{t('late')}</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.member.id}>
              <th scope="row"><bdi>{r.member.name}</bdi></th>
              <td data-label={t('stAssigned')}>{r.assigned}</td>
              <td data-label={t('done')}>{r.completed}</td>
              <td data-label={t('stOnTime')}>{pct(percent(r.onTime, r.completed))}</td>
              <td data-label={t('late')}>{r.overdue}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="muted">{t('classPrivacy')}</p>
      </section>
    </>
  );
}
