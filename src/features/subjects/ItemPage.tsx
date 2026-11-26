import { Check, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDoc, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Item, Progress } from '../../data/types';
import { resolveMedia } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { BackLink, Empty, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import ItemForm from './ItemForm';
import VideoPlayer from './VideoPlayer';

export default function ItemPage() {
  const { subjectId = '', itemId = '' } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const { user, isAdmin } = useSession();
  const { t } = usePrefs();
  const { run, confirm } = useFeedback();
  const item = useDoc<Item>(`items/${itemId}`);
  const path = `users/${user.uid}/progress/${itemId}`;
  const progress = useDoc<Progress>(path);
  const [editing, setEditing] = useState(false);
  const back = `/subjects/${subjectId}${item.data ? `?tab=${item.data.category}` : ''}`;
  if (item.loading || !item.data) return <><BackLink to={back} />{item.loading ? <Status loading /> : <Empty title={t('notFound')} />}</>;
  const data = item.data;
  const media = resolveMedia(data.url);

  return (
    <>
      <BackLink to={back} />
      <PageHead title={data.title}>
        {isAdmin && <div className="tools">
          <button className="icon-btn" aria-label={t('edit')} onClick={() => setEditing(true)}><Pencil size={18} /></button>
          <button className="icon-btn danger" aria-label={t('delete')} onClick={async () => {
            if (await confirm('confirmItem') && await run(() => store.remove(`items/${itemId}`), 'deleted')) navigate(back);
          }}><Trash2 size={18} /></button>
        </div>}
      </PageHead>
      {data.group && <p className="meta"><span>{data.group}</span></p>}
      {media && media.type !== 'link' && <VideoPlayer key={media.src} media={media} title={data.title} />}
      <div className="actions">
        <button className="btn choice done" aria-pressed={!!progress.data} disabled={progress.loading}
          onClick={() => run(() => (progress.data ? store.remove(path) : store.set(path, { subjectId: data.subjectId, at: NOW })))}>
          <Check size={18} aria-hidden />{t(progress.data ? 'studied' : 'markStudied')}
        </button>
        {media && <a className="btn" href={media.type === 'link' ? media.src : data.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden />{t('openLink')}</a>}
      </div>
      {editing && <ItemForm item={data} subjectId={data.subjectId} category={data.category} onClose={() => setEditing(false)} />}
    </>
  );
}
