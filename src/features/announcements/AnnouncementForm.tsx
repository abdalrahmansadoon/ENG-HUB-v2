import { useState } from 'react';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Announcement, AnnouncementKind } from '../../data/types';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { kindKeys } from './useAnnouncements';

export default function AnnouncementForm({ item, onClose }: { item?: Announcement; onClose(): void }) {
  const store = useStore();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const subjects = useSubjects();
  const [title, setTitle] = useState(item?.title ?? '');
  const [body, setBody] = useState(item?.body ?? '');
  const [kind, setKind] = useState<AnnouncementKind>(item?.kind ?? 'news');
  const [date, setDate] = useState(item?.date ?? '');
  const [subjectId, setSubject] = useState(item?.subjectId ?? '');
  const [pinned, setPinned] = useState(item?.pinned ?? false);
  return (
    <Dialog title={t(item ? 'editAnnouncement' : 'newAnnouncement')} onClose={onClose}>
      <Form submitLabel={t(item ? 'save' : 'publish')} onSubmit={async () => {
        const data = { title: title.trim(), body: body.trim(), kind, date, subjectId, pinned };
        const ok = await run(() => (item
          ? store.update(`announcements/${item.id}`, data)
          : store.set(`announcements/${store.newId()}`, { ...data, createdBy: user.uid, createdAt: NOW })), 'saved');
        if (ok) onClose();
      }}>
        <Field label={t('title')}><input required maxLength={140} pattern=".*\S.*" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label={t('details')} hint={t('optional')}><textarea rows={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <div className="two">
          <Field label={t('announcementKind')}>
            <select value={kind} onChange={(e) => setKind(e.target.value as AnnouncementKind)}>
              {(Object.keys(kindKeys) as AnnouncementKind[]).map((k) => <option key={k} value={k}>{t(kindKeys[k])}</option>)}
            </select>
          </Field>
          <Field label={t('subject')}>
            <select value={subjectId} onChange={(e) => setSubject(e.target.value)}>
              <option value="">{t('general')}</option>
              {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
            </select>
          </Field>
          <Field label={t('eventDate')} hint={t('showsInCalendar')}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />{t('pinToHome')}</label>
      </Form>
    </Dialog>
  );
}
