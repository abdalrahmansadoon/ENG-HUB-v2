import { Check, ExternalLink, NotebookPen, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDoc, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Item, Progress } from '../../data/types';
import { itemKind, resolveMedia } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { BackLink, Empty, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useNotes } from '../notes/useNotes';
import { useSubjects } from '../useSubjects';
import ItemForm from './ItemForm';
import VideoPlayer from './VideoPlayer';

export default function ItemPage() {
  const { subjectId = '', itemId = '' } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const { user, isAdmin, rules3 } = useSession();
  const notes = useNotes();
  const { t } = usePrefs();
  const { run, confirm } = useFeedback();
  const subjects = useSubjects();
  const item = useDoc<Item>(`items/${itemId}`);
  const path = `users/${user.uid}/progress/${itemId}`;
  const progress = useDoc<Progress>(path);
  const [editing, setEditing] = useState(false);
  const back = `/subjects/${subjectId}${item.data ? `?tab=${item.data.category}` : ''}`;
  if (item.loading || !item.data) return <><BackLink to={back} />{item.loading ? <Status loading /> : <Empty page title={t('notFound')} />}</>;
  const data = item.data;
  const media = resolveMedia(data.url);
  const playable = media && media.type !== 'link';
  const studied = !!progress.data;

  return (
    <>
      <div className="topbar">
        <BackLink to={back} />
        {isAdmin && <div className="tools">
          <button className="icon-btn" aria-label={t('edit')} onClick={() => setEditing(true)}><Pencil size={18} aria-hidden /></button>
          <button className="icon-btn danger" aria-label={t('delete')} onClick={async () => {
            if (await confirm('confirmItem') && await run(() => store.remove(`items/${itemId}`), 'deleted')) navigate(back);
          }}><Trash2 size={18} aria-hidden /></button>
        </div>}
      </div>
      <header className="group">
        <h1>{data.title}</h1>
        <p className="meta">
          <span className={`subject-dot tone-${subjects.tone(data.subjectId)}`}>{subjects.nameOf(data.subjectId)}</span>
          <span>{t(`kind_${itemKind(data.url)}`)}</span>
          {data.group && <span>{data.group}</span>}
        </p>
      </header>
      {playable && <VideoPlayer key={media.src} media={media} title={data.title} />}
      {media && !playable && <a className="btn primary block" href={media.src} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden />{t('openLink')}</a>}
      <button className={`btn block ${studied ? 'done' : playable ? 'primary' : 'tonal'}`} aria-pressed={studied} disabled={progress.loading}
        onClick={() => run(() => (studied ? store.remove(path) : store.set(path, { subjectId: data.subjectId, at: NOW })))}>
        <Check size={18} aria-hidden />{t(studied ? 'studied' : 'markStudied')}
      </button>
      {playable && <a className="btn block" href={data.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden />{t('openLink')}</a>}
      {rules3 && <section className="group">
        <div className="group-head">
          <h2>{t('myNotes')}</h2>
          <Link className="text-btn" to={`/notes/new?subject=${data.subjectId}&item=${itemId}`}><NotebookPen size={18} aria-hidden />{t('newNote')}</Link>
        </div>
        {notes.data.some((n) => n.itemId === itemId) ? (
          <ul className="card">{notes.data.filter((n) => n.itemId === itemId).map((n) => (
            <li key={n.id}><Link to={`/notes/${n.id}`} className="row link"><span className="row-main"><strong dir="auto">{n.title || t('untitled')}</strong></span></Link></li>
          ))}</ul>
        ) : <p className="muted">{t('noItemNotes')}</p>}
      </section>}
      {editing && <ItemForm item={data} subjectId={data.subjectId} category={data.category} onClose={() => setEditing(false)} />}
    </>
  );
}
