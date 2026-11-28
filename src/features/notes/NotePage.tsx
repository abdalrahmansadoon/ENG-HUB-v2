import { Eye, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import { NOW, type Data } from '../../data/store';
import type { Item, Note } from '../../data/types';
import { parseTags } from '../../lib/tags';
import { useFeedback } from '../../ui/feedback';
import { BackLink, Empty, Field, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import UploadField from '../../ui/UploadField';
import { useSubjects } from '../useSubjects';
import RichText from './RichText';

interface Draft { title: string; body: string; subjectId: string; itemId: string; tags: string; images: string[] }
type Saving = 'idle' | 'dirty' | 'saving' | 'saved' | 'local' | 'failed';
const content = (d: Draft) => ({ ...d, title: d.title.slice(0, 140), tags: parseTags(d.tags) });
const isBlank = (d: Draft) => !d.title.trim() && !d.body.trim() && !d.images.length;

/** محرر بحفظ تلقائي: بعد توقف الكتابة، وعند مغادرة الصفحة. */
function Editor({ id, initial, existing }: { id: string; initial: Draft; existing: boolean }) {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run, confirm, toast } = useFeedback();
  const subjects = useSubjects();
  const [draft, setDraft] = useState(initial);
  const [preview, setPreview] = useState(existing && !!initial.body);
  const [status, setStatus] = useState<Saving>('idle');
  const items = useCollection<Item>(draft.subjectId ? 'items' : null, { where: ['subjectId', '==', draft.subjectId] });
  const latest = useRef(draft);
  latest.current = draft;
  const saved = useRef(JSON.stringify(content(initial)));
  const created = useRef(existing);
  const removed = useRef(false);
  const path = `users/${user.uid}/notes/${id}`;

  const flush = useCallback(() => {
    const data = content(latest.current);
    const snapshot = JSON.stringify(data);
    if (removed.current || snapshot === saved.current || (!created.current && isBlank(latest.current))) return false;
    saved.current = snapshot;
    const body: Data = { ...data, updatedAt: NOW };
    const write = created.current ? store.update(path, body) : store.set(path, { ...body, createdAt: NOW });
    created.current = true;
    setStatus(navigator.onLine ? 'saving' : 'local');
    write.then(
      () => { if (saved.current === snapshot) setStatus('saved'); },
      (error) => { console.error(error); saved.current = ''; setStatus('failed'); toast('noteNotSaved', true); },
    );
    return true;
  }, [store, path, toast]);

  useEffect(() => {
    if (JSON.stringify(content(draft)) === saved.current) return;
    setStatus('dirty');
    const timer = setTimeout(() => {
      // بعد أول حفظ لم تعد الملاحظة «جديدة»: إعادة التحميل تقرأ المحفوظ.
      if (flush() && location.state) navigate(location.pathname, { replace: true, state: null });
    }, 900);
    return () => clearTimeout(timer);
  }, [draft, flush, navigate, location.pathname, location.state]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', hide);
    addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', hide); removeEventListener('pagehide', flush); flush(); };
  }, [flush]);

  const set = (change: Partial<Draft>) => setDraft((old) => ({ ...old, ...change }));
  const label = { idle: '', dirty: t('noteEditing'), saving: t('noteSaving'), saved: t('saved'), local: t('noteLocal'), failed: t('noteNotSaved') }[status];
  const linked = items.data.find((i) => i.id === draft.itemId);

  return (
    <>
      <div className="topbar">
        <BackLink to="/notes" />
        <span className="save-state" role="status">{label}</span>
        <div className="tools">
          <button type="button" className="btn small" aria-pressed={preview} onClick={() => setPreview(!preview)}>
            {preview ? <Pencil size={18} aria-hidden /> : <Eye size={18} aria-hidden />}{t(preview ? 'editNote' : 'previewNote')}
          </button>
          <button type="button" className="icon-btn danger" aria-label={t('delete')} onClick={async () => {
            if (!await confirm('confirmNote')) return;
            removed.current = true;
            if (!created.current || await run(() => store.remove(path), 'deleted')) navigate('/notes', { replace: true });
            else removed.current = false;
          }}><Trash2 size={18} aria-hidden /></button>
        </div>
      </div>

      {preview ? (
        <article className="card pad note-view">
          <h1 dir="auto">{draft.title || t('untitled')}</h1>
          <p className="meta">
            <span className={`subject-dot tone-${subjects.tone(draft.subjectId)}`}>{subjects.nameOf(draft.subjectId)}</span>
            {linked && <Link className="more" to={`/subjects/${linked.subjectId}/items/${linked.id}`}>{linked.title}</Link>}
          </p>
          {draft.body ? <RichText text={draft.body} /> : <p className="muted">{t('emptyNote')}</p>}
          {draft.images.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`${t('noteImage')} ${i + 1}`} loading="lazy" /></a>)}
          {parseTags(draft.tags).length > 0 && <p className="tag-list">{parseTags(draft.tags).map((x) => <Link key={x} className="tag" to={`/notes?tag=${encodeURIComponent(x)}`}>{x}</Link>)}</p>}
        </article>
      ) : (
        <div className="form">
          <h1 className="sr">{t(existing ? 'editNote' : 'newNote')}</h1>
          <input className="note-title" aria-label={t('title')} placeholder={t('title')} dir="auto" maxLength={140} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <div className="two">
            <Field label={t('subject')}>
              <select value={draft.subjectId} onChange={(e) => set({ subjectId: e.target.value, itemId: '' })}>
                <option value="">{t('general')}</option>
                {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
              </select>
            </Field>
            {draft.subjectId && <Field label={t('relatedItem')} hint={t('optional')}>
              <select value={draft.itemId} onChange={(e) => set({ itemId: e.target.value })}>
                <option value="">{t('none')}</option>
                {items.data.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </Field>}
            <Field label={t('tags')} hint={t('tagsHint')}><input maxLength={300} dir="auto" value={draft.tags} onChange={(e) => set({ tags: e.target.value })} /></Field>
          </div>
          <Field label={t('noteBody')}><textarea className="note-body" dir="auto" maxLength={20000} value={draft.body} onChange={(e) => set({ body: e.target.value })} /></Field>
          <p className="muted">{t('mathHint')} <bdi dir="ltr">$x^2$</bdi> {t('mathBlockHint')} <bdi dir="ltr">$$\int_0^1 x\,dx$$</bdi></p>
          {draft.images.length > 0 && <ul className="thumbs">{draft.images.map((url, i) => (
            <li key={url}><img src={url} alt={`${t('noteImage')} ${i + 1}`} /><button type="button" className="icon-btn danger" aria-label={`${t('removeImage')} ${i + 1}`} onClick={() => set({ images: draft.images.filter((x) => x !== url) })}><X size={16} aria-hidden /></button></li>
          ))}</ul>}
          {draft.images.length < 6 && <UploadField label={t('addImage')} accept="image/*" only="image" onUploaded={(url) => setDraft((old) => ({ ...old, images: [...old.images, url].slice(0, 6) }))} />}
        </div>
      )}
    </>
  );
}

const fromNote = (n: Note): Draft => ({ title: n.title, body: n.body, subjectId: n.subjectId, itemId: n.itemId, tags: n.tags.join('، '), images: n.images });

function Loader({ id }: { id: string }) {
  const { user } = useSession();
  const { t } = usePrefs();
  const fresh = (useLocation().state as { fresh?: { subjectId: string; itemId: string } } | null)?.fresh;
  // الملاحظة الجديدة تبدأ فوراً حتى دون اتصال.
  const [start, setStart] = useState(() => (fresh ? { existing: false, draft: { title: '', body: '', tags: '', images: [], ...fresh } as Draft } : null));
  const note = useDoc<Note>(start ? null : `users/${user.uid}/notes/${id}`);
  useEffect(() => { if (note.data) setStart({ existing: true, draft: fromNote(note.data) }); }, [note.data]);
  if (start) return <Editor id={id} initial={start.draft} existing={start.existing} />;
  return <><BackLink to="/notes" />{note.loading || note.error ? <Status loading={note.loading} error={note.error} /> : !note.data && <Empty page title={t('notFound')} />}</>;
}

export default function NotePage() {
  const { noteId = '' } = useParams();
  return <NeedsRules><Loader key={noteId} id={noteId} /></NeedsRules>;
}
