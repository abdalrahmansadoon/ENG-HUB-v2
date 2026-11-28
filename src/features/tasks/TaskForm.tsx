import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useCollection, useSession, useStore } from '../../data/context';
import { NOW, type Data } from '../../data/store';
import type { Attachment, Item, Priority, Profile, Quiz, Task } from '../../data/types';
import { addDays, today, weekday } from '../../lib/dates';
import { occurrences, priorities, type Repeat } from '../../lib/tasks';
import { safeUrl } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import UploadField from '../../ui/UploadField';
import { useSubjects } from '../useSubjects';
import { priorityKeys } from './tags';

type Who = 'all' | 'some' | 'me';
/** أسبوع يبدأ بالسبت. */
const weekOrder = [6, 0, 1, 2, 3, 4, 5];
const dayKey = (n: number) => addDays('2026-01-03', (n + 1) % 7); // 3 يناير 2026 سبت
const diff = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

interface Props { task?: Task; copy?: Task; later?: Task[]; /** يبدأ مهمة خاصة بصاحبها */ own?: boolean; onClose(): void }

/** إضافة مهمة أو تعديلها. `copy` يبدأ مهمة جديدة من أخرى، و`later` النسخ التالية في السلسلة. */
export default function TaskForm({ task, copy, later = [], own = false, onClose }: Props) {
  const store = useStore();
  const { user, isAdmin, rules2 } = useSession();
  const { t, lang } = usePrefs();
  const { run, toast } = useFeedback();
  const subjects = useSubjects();
  const from = task ?? copy;
  const [who, setWho] = useState<Who>(!isAdmin || own || from?.personal ? 'me' : !from || from.audience.includes('all') ? 'all' : 'some');
  const members = useCollection<Profile>(isAdmin ? 'profiles' : null);
  const [picked, setPicked] = useState<string[]>(from && !from.personal ? from.audience.filter((a) => a !== 'all') : []);
  const [title, setTitle] = useState(copy ? `${copy.title} ${t('copySuffix')}`.slice(0, 140) : task?.title ?? '');
  const [details, setDetails] = useState(from?.details ?? '');
  const [subjectId, setSubject] = useState(from?.subjectId ?? '');
  const [dueDate, setDue] = useState(task?.dueDate ?? today());
  const [priority, setPriority] = useState<Priority>(from?.priority ?? 'normal');
  const [startDate, setStart] = useState(task?.startDate ?? '');
  const [criteria, setCriteria] = useState(from?.criteria ?? '');
  const [links, setLinks] = useState<Attachment[]>(from?.links ?? []);
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [itemId, setItem] = useState(from?.itemId ?? '');
  const [quizId, setQuiz] = useState(from?.quizId ?? '');
  const [review, setReview] = useState(from?.review ?? false);
  const [comments, setComments] = useState(!from?.noComments);
  const [resubmit, setResubmit] = useState(!from?.noResubmit);
  const [cancelled, setCancelled] = useState(task?.cancelled ?? false);
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [until, setUntil] = useState(() => addDays(today(), 28));
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [apply, setApply] = useState(false);
  const [uploading, setUploading] = useState(false);

  const items = useCollection<Item>(subjectId ? 'items' : null, { where: ['subjectId', '==', subjectId] });
  const quizzes = useCollection<Quiz>('quizzes', isAdmin ? {} : { where: ['published', '==', true] });
  const subjectQuizzes = quizzes.data.filter((q) => !subjectId || q.subjectId === subjectId);

  const personal = who === 'me';
  const dates = task ? [dueDate] : occurrences(dueDate, repeat, until, weekdays);

  const addLink = (name: string, raw: string) => {
    const url = safeUrl(raw);
    if (!url) { toast('errUrl', true); return false; }
    setLinks((old) => (old.length >= 8 ? old : [...old, { url, name: (name.trim() || new URL(url).hostname).slice(0, 100) }]));
    return true;
  };

  const save = async () => {
    // رابط كُتب ولم يُضغط «إضافة» يُضاف تلقائياً.
    let all = links;
    if (linkUrl.trim()) {
      const url = safeUrl(linkUrl);
      if (!url) { toast('errUrl', true); return; }
      all = [...links, { url, name: (linkName.trim() || new URL(url).hostname).slice(0, 100) }].slice(0, 8);
    }
    if (who === 'some' && !picked.length) { toast('pickOne', true); return; }
    if (startDate && startDate > dueDate) { toast('badStart', true); return; }
    if (repeat === 'days' && !weekdays.length) { toast('pickDay', true); return; }
    if (!dates.length) { toast('badRange', true); return; }

    const content: Data = { title: title.trim(), details: details.trim(), subjectId, priority, criteria: criteria.trim(), links: all, itemId, quizId };
    if (!personal) Object.assign(content, {
      audience: who === 'all' ? ['all'] : picked,
      ...(rules2 && { review, noComments: !comments, noResubmit: !resubmit, cancelled }),
    });
    const root = personal ? `users/${user.uid}/tasks` : 'tasks';

    const ok = await run(async () => {
      if (task) {
        const moved = !personal && dueDate !== task.dueDate;
        const entries: [string, Data][] = [[`${root}/${task.id}`, { ...content, dueDate, startDate, ...(moved && { dueChangedAt: NOW }) }]];
        // النسخ التالية تأخذ المحتوى نفسه وتحتفظ بمواعيدها.
        if (apply) for (const other of later) entries.push([`${root}/${other.id}`, content]);
        await store.setMany(entries, { merge: true });
        return;
      }
      const seriesId = dates.length > 1 ? store.newId() : '';
      await store.setMany(dates.map((date) => [`${root}/${store.newId()}`, {
        ...content, dueDate: date,
        startDate: startDate ? addDays(date, -diff(startDate, dueDate)) : '',
        ...(seriesId && { seriesId }),
        createdAt: NOW, ...(!personal && { createdBy: user.uid }),
      }]));
    }, 'saved');
    if (ok) onClose();
  };

  return (
    <Dialog title={t(task ? 'editTask' : 'newTask')} onClose={onClose}>
      <Form onSubmit={save} submitLabel={t('save')} disabled={uploading}>
        <Field label={t('title')}><input required maxLength={140} pattern=".*\S.*" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t('details')} hint={t('optional')}><textarea rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
        <div className="two">
          <Field label={t('subject')}>
            <select value={subjectId} onChange={(e) => { setSubject(e.target.value); setItem(''); setQuiz(''); }}>
              <option value="">{t('general')}</option>
              {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
            </select>
          </Field>
          <Field label={t('dueDate')}><input type="date" required value={dueDate} onChange={(e) => setDue(e.target.value)} /></Field>
          <Field label={t('priority')}>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {priorities.map((p) => <option key={p} value={p}>{t(priorityKeys[p])}</option>)}
            </select>
          </Field>
          {!task && <Field label={t('repeat')}>
            <select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
              {([['none', 'rpNone'], ['daily', 'rpDaily'], ['weekly', 'rpWeekly'], ['monthly', 'rpMonthly'], ['days', 'rpDays']] as const).map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </select>
          </Field>}
        </div>
        {!task && repeat !== 'none' && <div className="form repeat-box">
          {repeat === 'days' && <div className="day-picks" role="group" aria-label={t('repeatDays')}>
            {weekOrder.map((n) => <label key={n}><input type="checkbox" checked={weekdays.includes(n)}
              onChange={(e) => setWeekdays(e.target.checked ? [...weekdays, n] : weekdays.filter((x) => x !== n))} /><span>{weekday(dayKey(n), lang, lang === 'ar' ? 'long' : 'short')}</span></label>)}
          </div>}
          <Field label={t('repeatUntil')}><input type="date" required min={dueDate} value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
          <p className="muted" role="status">{t('willCreate')}: <bdi>{dates.length}</bdi>. {t('maxCopies')}</p>
        </div>}

        {isAdmin && !task?.personal && <fieldset>
          <legend>{t('forWho')}</legend>
          <label className="check"><input type="radio" name="who" checked={who === 'all'} onChange={() => setWho('all')} />{t('everyone')}</label>
          <label className="check"><input type="radio" name="who" checked={who === 'some'} onChange={() => setWho('some')} />{t('specific')}</label>
          {rules2 && !task && <label className="check"><input type="radio" name="who" checked={who === 'me'} onChange={() => setWho('me')} />{t('onlyMe')}</label>}
          {who === 'some' && (
            <div className="members">
              {members.data.map((m) => (
                <label key={m.id} className="check">
                  <input type="checkbox" checked={picked.includes(m.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))} />{m.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>}
        {personal && <p className="muted">{t('onlyMeNote')}</p>}

        {!personal && rules2 && <fieldset>
          <legend>{t('followUp')}</legend>
          <label className="check"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />{t('needsReview')}</label>
          {review && <label className="check"><input type="checkbox" checked={resubmit} onChange={(e) => setResubmit(e.target.checked)} />{t('allowResubmit')}</label>}
          <label className="check"><input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} />{t('allowComments')}</label>
        </fieldset>}

        <details className="more-options" open={Boolean(from?.links?.length || from?.criteria || from?.itemId || from?.quizId || task?.startDate) || undefined}>
          <summary>{t('moreOptions')}</summary>
          <div className="form">
            <Field label={t('startDate')} hint={t('optional')}><input type="date" max={dueDate} value={startDate} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label={t('criteria')} hint={t('optional')}><input maxLength={300} value={criteria} onChange={(e) => setCriteria(e.target.value)} /></Field>
            {subjectId && <Field label={t('relatedItem')} hint={t('optional')}>
              <select value={itemId} onChange={(e) => setItem(e.target.value)}>
                <option value="">{t('none')}</option>
                {items.data.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </Field>}
            {subjectQuizzes.length > 0 && <Field label={t('relatedQuiz')} hint={t('optional')}>
              <select value={quizId} onChange={(e) => setQuiz(e.target.value)}>
                <option value="">{t('none')}</option>
                {subjectQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
            </Field>}
            <fieldset>
              <legend>{t('attachments')}</legend>
              {links.length > 0 && <ul className="attach-list">{links.map((a, i) => (
                <li key={`${a.url}-${i}`}><bdi>{a.name}</bdi>
                  <button type="button" className="icon-btn plain danger" aria-label={`${t('removeLink')}: ${a.name}`} onClick={() => setLinks(links.filter((_, n) => n !== i))}><Trash2 size={16} aria-hidden /></button></li>
              ))}</ul>}
              {links.length < 8 && <>
                <Field label={t('link')}><input type="url" dir="ltr" inputMode="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} /></Field>
                <Field label={t('linkName')} hint={t('optional')}><input maxLength={100} value={linkName} onChange={(e) => setLinkName(e.target.value)} /></Field>
                <button type="button" className="btn small" disabled={!linkUrl.trim()} onClick={() => { if (addLink(linkName, linkUrl)) { setLinkName(''); setLinkUrl(''); } }}><Plus size={18} aria-hidden />{t('addLink')}</button>
                <UploadField label={t('orUpload')} accept="image/*,application/pdf" onBusy={setUploading} onUploaded={(url, name) => addLink(name, url)} />
              </>}
            </fieldset>
          </div>
        </details>

        {task && rules2 && !personal && <label className="check"><input type="checkbox" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} />{t('cancelTask')}</label>}
        {task && later.length > 0 && <label className="check"><input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} /><span>{t('applyFollowing')} (<bdi>{later.length}</bdi>)</span></label>}
      </Form>
    </Dialog>
  );
}
