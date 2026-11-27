import { Pencil, SendHorizontal, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Comment, Profile, ResponseStatus, Task, TaskResponse } from '../../data/types';
import { formatDay, formatShort } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { Avatar, BackLink, Empty, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { memberTone } from '../../ui/tone';
import { useSubjects } from '../useSubjects';
import TaskForm from './TaskForm';

export default function TaskPage() {
  const { taskId = '' } = useParams();
  const task = useDoc<Task>(`tasks/${taskId}`);
  const { t } = usePrefs();
  if (task.loading || !task.data) {
    return <><BackLink to="/tasks" />{task.loading ? <Status loading /> : <Empty title={t('notFound')} />}</>;
  }
  return <TaskView key={taskId} task={task.data} />;
}

function TaskView({ task }: { task: Task }) {
  const store = useStore();
  const navigate = useNavigate();
  const { user, name, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const subjects = useSubjects();
  const base = `tasks/${task.id}`;
  const responses = useCollection<TaskResponse>(`${base}/responses`);
  const comments = useCollection<Comment>(`${base}/comments`, { orderBy: ['createdAt', 'asc'] });
  const profiles = useCollection<Profile>('profiles');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const mine = responses.data.find((r) => r.id === user.uid)?.status;
  const assigned = task.audience.includes('all') || task.audience.includes(user.uid);

  const respond = (status: ResponseStatus) => run(() => (mine === status
    ? store.remove(`${base}/responses/${user.uid}`)
    : store.set(`${base}/responses/${user.uid}`, { status, name, updatedAt: NOW })));

  const remove = async () => {
    if (!(await confirm('confirmTask'))) return;
    const ok = await run(async () => {
      for (const sub of ['responses', 'comments']) {
        for (const d of await store.list(`${base}/${sub}`)) await store.remove(`${base}/${sub}/${d.id}`);
      }
      await store.remove(base);
    }, 'deleted');
    if (ok) navigate('/tasks');
  };

  const [sending, setSending] = useState(false);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    if (await run(() => store.add(`${base}/comments`, { uid: user.uid, name, text: value, createdAt: NOW }))) setText('');
    setSending(false);
  };

  const members = profiles.data.filter((p) => task.audience.includes('all') || task.audience.includes(p.id));

  const photo = (uid: string) => profiles.data.find((p) => p.id === uid)?.photoURL;

  return (
    <>
      <div className="topbar">
        <BackLink to="/tasks" />
        {isAdmin && <div className="tools">
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label={t('edit')}><Pencil size={18} aria-hidden /></button>
          <button className="icon-btn danger" onClick={remove} aria-label={t('delete')}><Trash2 size={18} aria-hidden /></button>
        </div>}
      </div>
      <div className="task-page">
      <div className="task-head">
      <header className="group">
        <h1>{task.title}</h1>
        <p className="meta">
          <span className={`subject-dot tone-${subjects.tone(task.subjectId)}`}>{subjects.nameOf(task.subjectId)}</span>
          <span className="tag day-tag">{t('dueDate')}: {formatDay(task.dueDate, lang)}</span>
        </p>
      </header>
      {task.details && <p className="card pad pre" dir="auto">{task.details}</p>}
      </div>
      <div className="task-side">
      {assigned && (
        <div className="segmented respond" role="group" aria-label={t('myReply')}>
          {([['accepted', 'accept'], ['done', 'markDone'], ['declined', 'decline']] as const).map(([status, label]) => (
            <button key={status} className={status} aria-pressed={mine === status} disabled={responses.loading}
              onClick={() => respond(status)}>{t(mine === status ? status : label)}</button>
          ))}
        </div>
      )}
      <section className="group">
        <h2>{t('replies')}</h2>
        <Status loading={responses.loading || profiles.loading} error={responses.error ?? profiles.error} />
        {!responses.loading && members.length > 0 && <ul className="card">
          {members.map((m) => {
            const status = responses.data.find((r) => r.id === m.id)?.status;
            return (
              <li key={m.id} className="row">
                <Avatar name={m.name} url={m.photoURL} size="small" tone={memberTone(m.id)} />
                <span className="row-main"><bdi>{m.name}</bdi></span>
                <span className={`tag ${status ?? ''}`}>{t(status ?? 'waiting')}</span>
              </li>
            );
          })}
        </ul>}
      </section>
      </div>
      <div className="task-talk">
      <section className="group">
        <h2>{t('comments')}</h2>
        <Status loading={comments.loading} error={comments.error} />
        {!comments.loading && !comments.data.length && <p className="muted">{t('noComments')}</p>}
        {comments.data.length > 0 && <ul className="thread">
          {comments.data.map((c) => (
            <li key={c.id} className="comment">
              <Avatar name={c.name} url={photo(c.uid)} size="small" tone={memberTone(c.uid)} />
              <div className="comment-body"><span className="meta"><strong>{c.name}</strong><span>{formatShort(c.createdAt, lang)}</span></span><p className="pre" dir="auto">{c.text}</p></div>
              {(isAdmin || c.uid === user.uid) && <button className="icon-btn plain" aria-label={t('delete')}
                onClick={async () => { if (await confirm('confirmComment')) await run(() => store.remove(`${base}/comments/${c.id}`)); }}><Trash2 size={16} aria-hidden /></button>}
            </li>
          ))}
        </ul>}
        <form className="reply-box" onSubmit={send}>
          <textarea rows={1} maxLength={1000} aria-label={t('writeComment')} placeholder={t('writeComment')} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn primary send" aria-label={t('send')} disabled={!text.trim() || sending}><SendHorizontal size={20} className="flip" aria-hidden /></button>
        </form>
      </section>
      </div>
      </div>
      {editing && <TaskForm task={task} onClose={() => setEditing(false)} />}
    </>
  );
}
