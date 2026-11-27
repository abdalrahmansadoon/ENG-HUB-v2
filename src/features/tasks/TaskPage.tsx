import { ChevronDown, ClipboardList, Copy, ExternalLink, Pencil, SendHorizontal, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Comment, Item, Profile, Quiz, ResponseStatus, Task, TaskResponse } from '../../data/types';
import { formatDay, formatShort, today } from '../../lib/dates';
import { memberOptions, viewStatus } from '../../lib/tasks';
import { itemKind, safeUrl } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { Avatar, BackLink, Dialog, Empty, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { memberTone } from '../../ui/tone';
import { KindIcon } from '../subjects/KindIcon';
import { useSubjects } from '../useSubjects';
import { useTaskActions } from './actions';
import SubmissionBox from './SubmissionBox';
import { useStamp } from './Submissions';
import { PriorityTag, priorityKeys, StatusTag } from './tags';
import TaskForm from './TaskForm';
import Tracking from './Tracking';
import { useTasks } from './useTasks';

export default function TaskPage({ personal = false }: { personal?: boolean }) {
  const { taskId = '' } = useParams();
  const { user, name, rules2, rulesOld } = useSession();
  const task = useDoc<Task>(!personal ? `tasks/${taskId}` : rules2 ? `users/${user.uid}/tasks/${taskId}` : null);
  const { t } = usePrefs();
  // المهمة الخاصة تنتظر التأكد من القواعد قبل أن نقول إنها غير موجودة.
  const loading = task.loading || (personal && !rules2 && !rulesOld);
  if (loading || !task.data) {
    return <><BackLink to="/tasks" />{loading ? <Status loading /> : <Empty title={t('notFound')} />}</>;
  }
  const data: Task = personal ? { ...task.data, personal: true, audience: [user.uid], createdBy: user.uid } : task.data;
  const own: TaskResponse[] | null = personal
    ? (data.done ? [{ id: user.uid, status: 'done', name, updatedAt: data.doneAt ?? data.createdAt }] : [])
    : null;
  return <TaskView key={`${personal}-${taskId}`} task={data} own={own} />;
}

function TaskView({ task, own }: { task: Task; own: TaskResponse[] | null }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const subjects = useSubjects();
  const { setStatus, remove } = useTaskActions();
  const shared = useCollection<TaskResponse>(own ? null : `tasks/${task.id}/responses`);
  const responses = own ? { data: own, loading: false, error: null } : shared;
  const profiles = useCollection<Profile>('profiles');
  const item = useDoc<Item>(task.itemId ? `items/${task.itemId}` : null);
  const quiz = useDoc<Quiz>(task.quizId ? `quizzes/${task.quizId}` : null);
  const all = useTasks();
  const later = task.seriesId ? all.data.filter((x) => x.seriesId === task.seriesId && Boolean(x.personal) === Boolean(task.personal) && x.dueDate > task.dueDate) : [];
  const [dialog, setDialog] = useState<'edit' | 'copy' | 'delete' | null>(null);

  const mine = responses.data.find((r) => r.id === user.uid);
  const assigned = task.audience.includes('all') || task.audience.includes(user.uid);
  const can = memberOptions(task, mine);
  // صاحب المهمة الخاصة يديرها، ومهام الدفعة يديرها المشرف.
  const manage = task.personal || isAdmin;
  const members = profiles.data.filter((p) => task.audience.includes('all') || task.audience.includes(p.id));
  const nameOf = (uid: string) => profiles.data.find((p) => p.id === uid)?.name;
  const view = viewStatus(task, mine?.status, today());
  const links = (task.links ?? []).filter((a) => safeUrl(a.url));

  const destroy = async (following: Task[]) => {
    setDialog(null);
    if (await run(() => remove(task, following), 'deleted')) navigate('/tasks');
  };
  const askDelete = async () => {
    if (later.length) setDialog('delete');
    else if (await confirm(task.personal ? 'confirmPersonal' : 'confirmTask')) await destroy([]);
  };
  const respond = (status: ResponseStatus) => run(() => setStatus(task, mine, status));

  const info: [string, string][] = [];
  if (!task.personal) {
    info.push([t('owner'), nameOf(task.createdBy) ?? '–']);
    info.push([t('assignees'), task.audience.includes('all') ? t('everyone') : members.map((m) => m.name).join('، ') || '–']);
  }
  if (task.startDate) info.push([t('startDate'), formatDay(task.startDate, lang)]);
  info.push([t('priority'), t(priorityKeys[task.priority ?? 'normal'])]);
  info.push([t('createdOn'), formatShort(task.createdAt, lang)]);

  return (
    <>
      <div className="topbar">
        <BackLink to="/tasks" />
        {manage && <div className="tools">
          <button className="icon-btn" onClick={() => setDialog('copy')} aria-label={t('duplicate')}><Copy size={18} aria-hidden /></button>
          <button className="icon-btn" onClick={() => setDialog('edit')} aria-label={t('edit')}><Pencil size={18} aria-hidden /></button>
          <button className="icon-btn danger" onClick={askDelete} aria-label={t('delete')}><Trash2 size={18} aria-hidden /></button>
        </div>}
      </div>
      <div className="task-page">
        <div className="task-head">
          <header className="group">
            <h1>{task.title}</h1>
            <p className="meta">
              <span className={`subject-dot tone-${subjects.tone(task.subjectId)}`}>{subjects.nameOf(task.subjectId)}</span>
              <span className="tag day-tag">{t('dueDate')}: {formatDay(task.dueDate, lang)}</span>
              <PriorityTag priority={task.priority} />
              {task.personal && <span className="tag">{t('personal')}</span>}
              {task.seriesId && <span className="tag">{t('recurring')}</span>}
            </p>
          </header>
          {task.cancelled && <p className="notice">{t('cancelledNote')}</p>}
          {task.details && <p className="card pad pre" dir="auto">{task.details}</p>}
          {task.criteria && <section className="group"><h2>{t('criteria')}</h2><p className="card pad pre" dir="auto">{task.criteria}</p></section>}
          {(links.length > 0 || item.data || quiz.data) && <section className="group">
            <h2>{t('attachments')}</h2>
            <ul className="card">
              {item.data && <li><Link to={`/subjects/${item.data.subjectId}/items/${item.data.id}`} className="row link"><span className="tile small"><KindIcon kind={itemKind(item.data.url)} size={18} /></span><span className="row-main"><strong>{item.data.title}</strong></span></Link></li>}
              {quiz.data && <li><Link to={`/quizzes/${quiz.data.id}`} className="row link"><span className="tile small"><ClipboardList size={18} aria-hidden /></span><span className="row-main"><strong>{quiz.data.title}</strong></span></Link></li>}
              {links.map((a, i) => {
                const url = safeUrl(a.url);
                const host = new URL(url).hostname;
                return <li key={`${a.url}-${i}`}><a href={url} target="_blank" rel="noopener noreferrer" className="row link">
                  <span className="tile small"><ExternalLink size={18} aria-hidden /></span>
                  <span className="row-main"><strong><bdi>{a.name}</bdi></strong>{a.name !== host && <span className="meta"><bdi dir="ltr">{host}</bdi></span>}</span>
                </a></li>;
              })}
            </ul>
          </section>}
        </div>

        <div className="task-side">
          {assigned && !task.cancelled && (
            <section className="group no-print">
              <div className="group-head"><h2>{t('myStatus')}</h2>{!responses.loading && <StatusTag status={view} />}</div>
              {task.personal ? (
                <button className={mine ? 'btn tonal' : 'btn primary'} aria-pressed={Boolean(mine)} onClick={() => respond('done')}>{t(mine ? 'undo' : 'markDone')}</button>
              ) : can.reply && (
                <div className="segmented respond" role="group" aria-label={t('myReply')}>
                  {([['accepted', 'accept'], ['done', 'markDone'], ['declined', 'decline']] as const).filter(([status]) => status !== 'done' || can.done).map(([status, label]) => (
                    <button key={status} className={status} aria-pressed={mine?.status === status} disabled={responses.loading}
                      onClick={() => respond(status)}>{t(mine?.status === status ? status : label)}</button>
                  ))}
                </div>
              )}
            </section>
          )}
          {assigned && task.review && !task.personal && <SubmissionBox task={task} mine={mine} disabled={responses.loading} />}
          <section className="group">
            <h2>{t('taskInfo')}</h2>
            <dl className="card info">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><bdi>{v}</bdi></dd></div>)}</dl>
          </section>
          {!task.personal && !isAdmin && <section className="group">
            <h2>{t('replies')}</h2>
            <Status loading={responses.loading || profiles.loading} error={responses.error ?? profiles.error} />
            {!responses.loading && members.length > 0 && <ul className="card">
              {members.map((m) => (
                <li key={m.id} className="row">
                  <Avatar name={m.name} url={m.photoURL} size="small" tone={memberTone(m.id)} />
                  <span className="row-main"><bdi>{m.name}</bdi></span>
                  <StatusTag status={viewStatus(task, responses.data.find((r) => r.id === m.id)?.status, today())} />
                </li>
              ))}
            </ul>}
          </section>}
        </div>

        {!task.personal && <div className="task-talk">
          {isAdmin && <>
            <Status loading={responses.loading || profiles.loading} error={responses.error ?? profiles.error} />
            {!responses.loading && !profiles.loading && !responses.error && <Tracking task={task} members={members} responses={responses.data} />}
          </>}
          <Comments task={task} profiles={profiles.data} />
          <Activity task={task} responses={responses.data} nameOf={nameOf} />
        </div>}
      </div>
      {dialog === 'edit' && <TaskForm task={task} later={later} onClose={() => setDialog(null)} />}
      {dialog === 'copy' && <TaskForm copy={task} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && <Dialog title={t('delete')} onClose={() => setDialog(null)}>
        <p>{t('seriesDelete')}</p>
        <div className="menu">
          <button className="btn danger" onClick={() => destroy([])}>{t('deleteOnly')}</button>
          <button className="btn danger" onClick={() => destroy(later)}>{t('deleteFollowing')} (<bdi>{later.length + 1}</bdi>)</button>
          <button className="btn" onClick={() => setDialog(null)}>{t('cancel')}</button>
        </div>
      </Dialog>}
    </>
  );
}

function Comments({ task, profiles }: { task: Task; profiles: (Profile & { id: string })[] }) {
  const store = useStore();
  const { user, name, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const base = `tasks/${task.id}/comments`;
  const comments = useCollection<Comment>(base, { orderBy: ['createdAt', 'asc'] });
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const open = isAdmin || !task.noComments;
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    if (await run(() => store.add(base, { uid: user.uid, name, text: value, createdAt: NOW }))) setText('');
    setSending(false);
  };
  return (
    <section className="group comments">
      <h2>{t('comments')}</h2>
      <Status loading={comments.loading} error={comments.error} />
      {!comments.loading && !comments.data.length && open && <p className="muted">{t('noComments')}</p>}
      {comments.data.length > 0 && <ul className="thread">
        {comments.data.map((c) => (
          <li key={c.id} className="comment">
            <Avatar name={c.name} url={profiles.find((p) => p.id === c.uid)?.photoURL} size="small" tone={memberTone(c.uid)} />
            <div className="comment-body"><span className="meta"><strong>{c.name}</strong><span>{formatShort(c.createdAt, lang)}</span></span><p className="pre" dir="auto">{c.text}</p></div>
            {(isAdmin || c.uid === user.uid) && <button className="icon-btn plain no-print" aria-label={t('delete')}
              onClick={async () => { if (await confirm('confirmComment')) await run(() => store.remove(`${base}/${c.id}`)); }}><Trash2 size={16} aria-hidden /></button>}
          </li>
        ))}
      </ul>}
      {open ? (
        <form className="reply-box no-print" onSubmit={send}>
          <textarea rows={1} maxLength={1000} aria-label={t('writeComment')} placeholder={t('writeComment')} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn primary send" aria-label={t('send')} disabled={!text.trim() || sending}><SendHorizontal size={20} className="flip" aria-hidden /></button>
        </form>
      ) : <p className="muted">{t('commentsClosed')}</p>}
    </section>
  );
}

/** سجل مختصر مستخلص من تواريخ المهمة وردودها. */
function Activity({ task, responses, nameOf }: { task: Task; responses: TaskResponse[]; nameOf(uid: string): string | undefined }) {
  const { t } = usePrefs();
  const stamp = useStamp();
  const events = [
    { key: 'created', at: task.createdAt, text: `${nameOf(task.createdBy) ?? ''} ${t('evCreated')}` },
    ...responses.flatMap((r) => [
      ...(r.startedAt ? [{ key: `s-${r.id}`, at: r.startedAt, text: `${r.name} ${t('evStarted')}` }] : []),
      ...(r.submittedAt ? [{ key: `h-${r.id}`, at: r.submittedAt, text: `${r.name} ${t('evSubmitted')} ${r.version ?? 1}` }] : []),
      ...(r.reviewedAt ? [{ key: `r-${r.id}`, at: r.reviewedAt, text: `${t('evReviewed')} ${r.name}` }] : []),
    ]),
  ].sort((a, b) => b.at - a.at).slice(0, 20);
  return (
    <details className="group no-print">
      <summary><span>{t('activityLog')} (<bdi>{events.length}</bdi>)</span><ChevronDown size={20} aria-hidden /></summary>
      <ol className="activity">{events.map((e) => <li key={e.key}><span>{e.text}</span><time>{stamp(e.at)}</time></li>)}</ol>
    </details>
  );
}
