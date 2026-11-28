import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Profile, Submission, Task, TaskResponse } from '../../data/types';
import { today } from '../../lib/dates';
import { downloadCsv } from '../../lib/download';
import { lateDays, viewStatus, type ViewStatus } from '../../lib/tasks';
import { useFeedback } from '../../ui/feedback';
import { Avatar, Dialog, Empty, Field, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { memberTone } from '../../ui/tone';
import { useTaskActions } from './actions';
import { SubmissionView, useStamp } from './Submissions';
import { StatusTag, statusKeys } from './tags';

type Member = Profile & { id: string };
const order: ViewStatus[] = ['submitted', 'review', 'rejected', 'late', 'new', 'accepted', 'done', 'declined', 'cancelled'];

/** متابعة المشرف لكل عضو مكلف بالمهمة. */
export default function Tracking({ task, members, responses }: { task: Task; members: Member[]; responses: TaskResponse[] }) {
  const { rules2 } = useSession();
  const { t } = usePrefs();
  const stamp = useStamp();
  const [reviewing, setReviewing] = useState<Member | null>(null);
  const now = today();
  const rows = members.map((member) => {
    const r = responses.find((x) => x.id === member.id);
    const view = viewStatus(task, r?.status, now);
    return { member, r, view, late: lateDays(task, r, now) };
  }).sort((a, b) => order.indexOf(a.view) - order.indexOf(b.view) || a.member.name.localeCompare(b.member.name, 'ar'));
  const counts = order.map((s) => [s, rows.filter((x) => x.view === s).length] as const).filter(([, n]) => n > 0);

  const exportCsv = () => {
    const header = [t('member'), t('status'), t('startedCol'), t('handedIn'), t('delay'), t('attempts'), t('reviewCol')];
    downloadCsv(task.title, [header, ...rows.map(({ member, r, view, late }) => [
      member.name, t(statusKeys[view]), r?.startedAt ? stamp(r.startedAt) : '', r?.submittedAt ? stamp(r.submittedAt) : '',
      late, r?.version ?? 0, r?.reviewedAt ? stamp(r.reviewedAt) : '',
    ])]);
  };

  const showReview = task.review && rules2;
  return (
    <section className="group tracking">
      <div className="group-head">
        <h2>{t('tracking')}</h2>
        <div className="tools no-print">
          <button className="btn small" onClick={exportCsv} disabled={!rows.length}><Download size={16} aria-hidden />{t('exportCsv')}</button>
          <button className="btn small" onClick={() => print()}><Printer size={16} aria-hidden />{t('print')}</button>
        </div>
      </div>
      {!rows.length ? <Empty title={t('nothingSubmitted')} /> : <>
        <p className="counts">{counts.map(([s, n]) => <span key={s}><StatusTag status={s} /> <bdi>{n}</bdi></span>)}</p>
        <div className="card table-card">
          <table role="table">
            <thead role="rowgroup"><tr role="row">
              {(['member', 'status', 'startedCol', 'handedIn', 'delay', 'attempts'] as const).map((k) => <th key={k} role="columnheader" scope="col">{t(k)}</th>)}
              {showReview && <th role="columnheader" scope="col" className="no-print">{t('reviewCol')}</th>}
            </tr></thead>
            <tbody role="rowgroup">
              {rows.map(({ member, r, view, late }) => (
                <tr key={member.id} role="row">
                  <th role="rowheader" scope="row"><span className="who"><Avatar name={member.name} url={member.photoURL} size="small" tone={memberTone(member.id)} /><bdi>{member.name}</bdi></span></th>
                  <td role="cell" data-label={t('status')}><StatusTag status={view} /></td>
                  <td role="cell" data-label={t('startedCol')}>{r?.startedAt ? stamp(r.startedAt) : '–'}</td>
                  <td role="cell" data-label={t('handedIn')}>{r?.submittedAt ? stamp(r.submittedAt) : '–'}</td>
                  <td role="cell" data-label={t('delay')} className={late ? 'bad' : undefined}><bdi>{late}</bdi></td>
                  <td role="cell" data-label={t('attempts')}><bdi>{r?.version ?? 0}</bdi></td>
                  {showReview && <td role="cell" className="no-print">
                    <button className={view === 'submitted' ? 'btn small primary' : 'btn small'} aria-label={`${t('reviewAction')}: ${member.name}`} onClick={() => setReviewing(member)}>{t('reviewAction')}</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
      {reviewing && <ReviewDialog task={task} member={reviewing} response={responses.find((x) => x.id === reviewing.id)} onClose={() => setReviewing(null)} />}
    </section>
  );
}

function ReviewDialog({ task, member, response, onClose }: { task: Task; member: Member; response?: TaskResponse; onClose(): void }) {
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const { review } = useTaskActions();
  const all = useCollection<Submission>(`tasks/${task.id}/responses/${member.id}/submissions`);
  const list = [...all.data].sort((a, b) => b.version - a.version);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (verdict: 'review' | 'done' | 'rejected') => {
    if (verdict === 'rejected' && !note.trim()) { toast('needNote', true); return; }
    setBusy(true);
    const ok = await run(() => review(task, member, response, verdict, note.trim()), 'reviewSaved');
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog title={`${t('reviewOf')} ${member.name}`} onClose={onClose}>
      <Status loading={all.loading} error={all.error} />
      {!all.loading && !list.length && <p className="muted">{t('nothingSubmitted')}</p>}
      {list.map((s) => <div key={s.id} className="card pad"><SubmissionView submission={s} /></div>)}
      <div className="form">
        <Field label={t('noteForMember')}><textarea rows={3} maxLength={1000} dir="auto" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="actions">
          <button className="btn primary" disabled={busy || all.loading} onClick={() => decide('done')}>{t('approve')}</button>
          <button className="btn danger" disabled={busy || all.loading || !list.length} onClick={() => decide('rejected')}>{t('requestChanges')}</button>
          {list.length > 0 && <button className="btn" disabled={busy || all.loading} onClick={() => decide('review')}>{t('markReviewing')}</button>}
        </div>
      </div>
    </Dialog>
  );
}
