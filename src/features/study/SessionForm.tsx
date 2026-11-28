import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { SessionStatus, StudySession } from '../../data/types';
import { today } from '../../lib/dates';
import type { Key } from '../../lib/i18n';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useTasks } from '../tasks/useTasks';
import { useSubjects } from '../useSubjects';

export const statusKeys: Record<SessionStatus, Key> = { planned: 'ssPlanned', done: 'ssDone', skipped: 'ssSkipped' };

interface Props { session?: StudySession; preset?: Partial<StudySession>; onClose(): void }

export default function SessionForm({ session, preset, onClose }: Props) {
  const store = useStore();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run, confirm } = useFeedback();
  const subjects = useSubjects();
  const tasks = useTasks();
  const from = session ?? preset ?? {};
  const [subjectId, setSubject] = useState(from.subjectId ?? '');
  const [taskId, setTask] = useState(from.taskId ?? '');
  const [date, setDate] = useState(from.date ?? today());
  const [start, setStart] = useState(from.start ?? '');
  const [planned, setPlanned] = useState(String(from.planned ?? 45));
  const [actual, setActual] = useState(String(session?.actual || from.planned || 45));
  const [status, setStatus] = useState<SessionStatus>(from.status ?? (date < today() ? 'done' : 'planned'));
  const [goal, setGoal] = useState(from.goal ?? '');
  const [notes, setNotes] = useState(from.notes ?? '');
  const open = tasks.data.filter((x) => x.id === taskId || (!x.cancelled && x.dueDate >= today() && (!subjectId || x.subjectId === subjectId)));
  const path = `users/${user.uid}/sessions/${session?.id ?? ''}`;

  const save = async () => {
    const data = {
      subjectId, taskId, date, start, planned: Number(planned), actual: status === 'done' ? Number(actual) : 0,
      goal: goal.trim(), notes: notes.trim(), status,
    };
    const ok = await run(() => (session
      ? store.update(path, data)
      : store.set(`users/${user.uid}/sessions/${store.newId()}`, { ...data, createdAt: NOW })), 'saved');
    if (ok) onClose();
  };

  return (
    <Dialog title={t(session ? 'editSession' : 'newSession')} onClose={onClose}>
      <Form onSubmit={save} submitLabel={t('save')}>
        <div className="segmented" role="group" aria-label={t('status')}>
          {(['planned', 'done', 'skipped'] as const).map((v) => <button key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)}>{t(statusKeys[v])}</button>)}
        </div>
        <div className="two">
          <Field label={t('subject')}>
            <select value={subjectId} onChange={(e) => { setSubject(e.target.value); setTask(''); }}>
              <option value="">{t('general')}</option>
              {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
            </select>
          </Field>
          {open.length > 0 && <Field label={t('relatedTask')} hint={t('optional')}>
            <select value={taskId} onChange={(e) => {
              const task = open.find((x) => x.id === e.target.value);
              setTask(e.target.value);
              if (task) { setSubject(task.subjectId); if (!goal) setGoal(task.title.slice(0, 200)); }
            }}>
              <option value="">{t('none')}</option>
              {open.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </Field>}
          <Field label={t('date')}><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t('startTime')} hint={t('optional')}><input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label={t('plannedMinutes')}><input type="number" inputMode="numeric" required min={1} max={720} value={planned} onChange={(e) => setPlanned(e.target.value)} /></Field>
          {status === 'done' && <Field label={t('actualMinutes')}><input type="number" inputMode="numeric" required min={1} max={720} value={actual} onChange={(e) => setActual(e.target.value)} /></Field>}
        </div>
        <Field label={t('sessionGoal')} hint={t('optional')}><input maxLength={200} value={goal} onChange={(e) => setGoal(e.target.value)} /></Field>
        <Field label={t('sessionNotes')} hint={t('optional')}><textarea rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </Form>
      {session && <button type="button" className="text-btn danger" onClick={async () => {
        if (await confirm('confirmSession') && await run(() => store.remove(path), 'deleted')) onClose();
      }}><Trash2 size={18} aria-hidden />{t('delete')}</button>}
    </Dialog>
  );
}
