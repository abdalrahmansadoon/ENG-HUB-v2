import { Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession, useStore } from '../../data/context';
import type { Announcement } from '../../data/types';
import { formatDay, formatShort, relativeDay, today } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { Empty, PageHead, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import AnnouncementForm from './AnnouncementForm';
import { kindKeys, useAnnouncements } from './useAnnouncements';

function List() {
  const store = useStore();
  const { isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const subjects = useSubjects();
  const items = useAnnouncements();
  const [form, setForm] = useState<{ item?: Announcement } | null>(null);
  const target = useLocation().hash.slice(1);
  const ready = !items.loading;
  // الرابط من الإشعار أو التقويم يصل إلى الإعلان نفسه.
  useEffect(() => {
    if (!target || !ready) return;
    const el = document.getElementById(target);
    el?.scrollIntoView({ block: 'center' });
    el?.focus({ preventScroll: true });
  }, [target, ready]);
  if (items.loading || items.error) return <Status loading={items.loading} error={items.error} />;
  const now = today();
  const sorted = [...items.data].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
  return (
    <>
      {!sorted.length && <Empty title={t('noAnnouncements')}><span>{t(isAdmin ? 'noAnnouncementsAdmin' : 'noAnnouncementsStudent')}</span></Empty>}
      <ul className="announcements">
        {sorted.map((a) => (
          <li key={a.id}>
            <article id={a.id} tabIndex={-1} className={`card pad announcement ${target === a.id ? 'targeted' : ''}`}>
              <header className="group-head">
                <h2 dir="auto">{a.pinned && <Pin size={16} aria-label={t('pinned')} />} {a.title}</h2>
                {isAdmin && <span className="tools">
                  <button type="button" className="icon-btn plain" aria-label={`${t('edit')}: ${a.title}`} onClick={() => setForm({ item: a })}><Pencil size={18} aria-hidden /></button>
                  <button type="button" className="icon-btn plain danger" aria-label={`${t('delete')}: ${a.title}`} onClick={async () => {
                    if (await confirm('confirmAnnouncement')) await run(() => store.remove(`announcements/${a.id}`), 'deleted');
                  }}><Trash2 size={18} aria-hidden /></button>
                </span>}
              </header>
              <p className="meta">
                <span className="tag accepted">{t(kindKeys[a.kind])}</span>
                <span className={`subject-dot tone-${subjects.tone(a.subjectId)}`}>{subjects.nameOf(a.subjectId)}</span>
                <span>{formatShort(a.createdAt, lang)}</span>
              </p>
              {a.date && <p className="event-date"><strong>{formatDay(a.date, lang)}</strong><span className={a.date >= now ? 'tag day-tag' : 'tag'}>{relativeDay(a.date, now, lang)}</span></p>}
              {a.body && <p className="pre" dir="auto">{a.body}</p>}
            </article>
          </li>
        ))}
      </ul>
      {isAdmin && <button type="button" className="btn primary fab" onClick={() => setForm({})}><Plus size={20} aria-hidden />{t('newAnnouncement')}</button>}
      {form && <AnnouncementForm item={form.item} onClose={() => setForm(null)} />}
    </>
  );
}

export default function AnnouncementsPage() {
  const { t } = usePrefs();
  return <><PageHead title={t('announcements')} /><NeedsRules><List /></NeedsRules></>;
}
