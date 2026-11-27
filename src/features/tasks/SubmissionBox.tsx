import { ChevronDown, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Submission, Task, TaskResponse } from '../../data/types';
import { memberOptions } from '../../lib/tasks';
import { safeUrl } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import UploadField from '../../ui/UploadField';
import { useTaskActions } from './actions';
import { SubmissionView } from './Submissions';

/** تسليمات العضو نفسه لمهمة تتطلب مراجعة. */
export default function SubmissionBox({ task, mine, disabled }: { task: Task; mine?: TaskResponse; disabled: boolean }) {
  const { user, rules2 } = useSession();
  const { t } = usePrefs();
  const all = useCollection<Submission>(rules2 && mine?.version ? `tasks/${task.id}/responses/${user.uid}/submissions` : null);
  const [open, setOpen] = useState(false);
  const [latest, ...older] = [...all.data].sort((a, b) => b.version - a.version);
  const can = memberOptions(task, mine).submit && rules2;

  return (
    <section className="group no-print">
      <h2>{t('mySolution')}</h2>
      <Status loading={all.loading} error={all.error} />
      {latest && <div className="card pad"><SubmissionView submission={latest} /></div>}
      {older.length > 0 && <details className="group">
        <summary><span>{t('earlierVersions')} (<bdi>{older.length}</bdi>)</span><ChevronDown size={20} aria-hidden /></summary>
        <div className="card pad">{older.map((s) => <SubmissionView key={s.id} submission={s} />)}</div>
      </details>}
      {!mine?.version && <p className="muted">{t('reviewNeeded')}</p>}
      {can ? <button className="btn primary" disabled={disabled} onClick={() => setOpen(true)}><Upload size={18} aria-hidden />{t(mine?.version ? 'resubmit' : 'submitSolution')}</button>
        : Boolean(mine?.version) && task.noResubmit && mine?.status !== 'done' && <p className="muted">{t('noResubmit')}</p>}
      {open && <SubmitDialog task={task} mine={mine} onClose={() => setOpen(false)} />}
    </section>
  );
}

function SubmitDialog({ task, mine, onClose }: { task: Task; mine?: TaskResponse; onClose(): void }) {
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const { submit } = useTaskActions();
  // المسودة تبقى على الجهاز حتى يتم التسليم.
  const key = `enghub.draft.task:${task.id}`;
  const [draft, setDraft] = useState(() => {
    const empty = { text: '', link: '', urls: [] as string[], names: [] as string[] };
    try { return { ...empty, ...JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<typeof empty> }; } catch { return empty; }
  });
  const change = (next: Partial<typeof draft>) => setDraft((old) => {
    const value = { ...old, ...next };
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* التخزين غير متاح */ }
    return value;
  });
  const [uploading, setUploading] = useState(false);

  const save = async () => {
    const link = draft.link.trim() ? safeUrl(draft.link) : '';
    if (draft.link.trim() && !link) { toast('errUrl', true); return; }
    const text = draft.text.trim();
    if (!text && !link && !draft.urls.length) { toast('emptySolution', true); return; }
    if (await run(() => submit(task, mine, { text, link, urls: draft.urls, names: draft.names }), 'handedIn')) {
      try { localStorage.removeItem(key); } catch { /* التخزين غير متاح */ }
      onClose();
    }
  };

  return (
    <Dialog title={t(mine?.version ? 'resubmit' : 'submitSolution')} onClose={onClose}>
      {task.noResubmit && <p className="notice">{t('oneSubmit')}</p>}
      <Form onSubmit={save} submitLabel={t('submitSolution')} disabled={uploading}>
        <Field label={t('solutionText')}><textarea rows={5} maxLength={5000} dir="auto" value={draft.text} onChange={(e) => change({ text: e.target.value })} /></Field>
        <Field label={t('solutionLink')} hint={t('optional')}><input type="url" dir="ltr" maxLength={500} value={draft.link} onChange={(e) => change({ link: e.target.value })} /></Field>
        {draft.urls.length > 0 && <ul className="attach-list">{draft.urls.map((url, i) => (
          <li key={url}><bdi>{draft.names[i]}</bdi>
            <button type="button" className="icon-btn plain danger" aria-label={`${t('removeLink')}: ${draft.names[i]}`}
              onClick={() => change({ urls: draft.urls.filter((_, n) => n !== i), names: draft.names.filter((_, n) => n !== i) })}><Trash2 size={16} aria-hidden /></button></li>
        ))}</ul>}
        {draft.urls.length < 6 && <UploadField label={t('addFile')} accept="image/*,application/pdf" onBusy={setUploading}
          onUploaded={(url, name) => setDraft((old) => {
            const value = { ...old, urls: [...old.urls, url], names: [...old.names, name.slice(0, 120)] };
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* التخزين غير متاح */ }
            return value;
          })} />}
      </Form>
    </Dialog>
  );
}
