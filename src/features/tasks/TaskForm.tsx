import { useState } from 'react';
import { useCollection, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Profile, Task } from '../../data/types';
import { today } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';

export default function TaskForm({ task, onClose }: { task?: Task; onClose(): void }) {
  const store = useStore();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const subjects = useSubjects();
  const members = useCollection<Profile>('profiles');
  const [title, setTitle] = useState(task?.title ?? '');
  const [details, setDetails] = useState(task?.details ?? '');
  const [subjectId, setSubject] = useState(task?.subjectId ?? '');
  const [dueDate, setDue] = useState(task?.dueDate ?? today());
  const [everyone, setEveryone] = useState(!task || task.audience.includes('all'));
  const [picked, setPicked] = useState<string[]>(task?.audience.filter((a) => a !== 'all') ?? []);

  const save = async () => {
    if (!everyone && !picked.length) { toast('pickOne', true); return; }
    const data = { title: title.trim(), details: details.trim(), subjectId, dueDate, audience: everyone ? ['all'] : picked };
    const ok = await run(() => task
      ? store.update(`tasks/${task.id}`, data)
      : store.add('tasks', { ...data, createdBy: user.uid, createdAt: NOW }), 'saved');
    if (ok) onClose();
  };

  return (
    <Dialog title={t(task ? 'editTask' : 'newTask')} onClose={onClose}>
      <Form onSubmit={save} submitLabel={t('save')}>
        <Field label={t('title')}><input required maxLength={140} pattern=".*\S.*" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t('details')} hint={t('optional')}><textarea rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
        <div className="two">
          <Field label={t('subject')}>
            <select value={subjectId} onChange={(e) => setSubject(e.target.value)}>
              <option value="">{t('general')}</option>
              {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
            </select>
          </Field>
          <Field label={t('dueDate')}><input type="date" required value={dueDate} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <fieldset>
          <legend>{t('forWho')}</legend>
          <label className="check"><input type="radio" name="who" checked={everyone} onChange={() => setEveryone(true)} />{t('everyone')}</label>
          <label className="check"><input type="radio" name="who" checked={!everyone} onChange={() => setEveryone(false)} />{t('specific')}</label>
          {!everyone && (
            <div className="members">
              {members.data.map((m) => (
                <label key={m.id} className="check">
                  <input type="checkbox" checked={picked.includes(m.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))} />{m.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </Form>
    </Dialog>
  );
}
