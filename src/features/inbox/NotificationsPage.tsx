import { Bell, BellOff, CalendarClock, CheckCheck, ChevronDown, ClipboardCheck, ClipboardList, FileText, ListChecks, Mail, MailOpen, Megaphone, Settings2, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatShort, formatTime, today, toKey } from '../../lib/dates';
import type { Key } from '../../lib/i18n';
import { categories, dismiss, groupNotices, isRead, markAllRead, markRead, restore, type Category, type Notice, type NoticeKind } from '../../lib/notifications';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Empty, Field, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { noticeKeys, useInbox } from './inbox';

const icons: Record<NoticeKind, typeof Bell> = {
  newTask: ListChecks, dueChanged: CalendarClock, dueSoon: CalendarClock, accepted: ClipboardCheck, rejected: ClipboardCheck,
  again: ClipboardCheck, submitted: ClipboardCheck, newItem: FileText, newQuiz: ClipboardList, announcement: Megaphone,
};
export const categoryKeys: Record<Category, Key> = { tasks: 'ncTasks', deadlines: 'ncDeadlines', reviews: 'ncReviews', content: 'ncContent', announcements: 'ncAnnouncements' };

function Row({ notice }: { notice: Notice }) {
  const { t, lang } = usePrefs();
  const { state, save } = useInbox();
  const subjects = useSubjects();
  const read = isRead(notice, state);
  const Icon = icons[notice.kind];
  const sameDay = toKey(new Date(notice.at)) === today();
  return (
    <li className={read ? 'notice-row' : 'notice-row unread'}>
      <Link to={notice.to} className="row-main" onClick={() => { if (!read) save(markRead(state, [notice.id], true)); }}>
        <span className="tile small"><Icon size={18} aria-hidden /></span>
        <span className="row-main">
          <span className="notice-kind">{t(noticeKeys[notice.kind])}{!read && <span className="sr"> ({t('unreadOne')})</span>}</span>
          <strong dir="auto">{notice.title}</strong>
          <span className="meta">
            {notice.who && <span>{notice.who}</span>}
            <span>{subjects.nameOf(notice.subjectId)}</span>
            {notice.dueDate && <span>{t('dueDate')}: {formatDate(notice.dueDate, lang)}</span>}
            <span>{sameDay ? formatTime(notice.at, lang) : formatShort(notice.at, lang)}</span>
          </span>
        </span>
      </Link>
      <span className="notice-actions">
        <button type="button" className="icon-btn plain" aria-label={`${t(read ? 'markUnread' : 'markReadOne')}: ${notice.title}`} onClick={() => save(markRead(state, [notice.id], !read))}>
          {read ? <Mail size={18} aria-hidden /> : <MailOpen size={18} aria-hidden />}
        </button>
        <button type="button" className="icon-btn plain" aria-label={`${t('delete')}: ${notice.title}`} onClick={() => save(dismiss(state, [notice.id]))}><Trash2 size={18} aria-hidden /></button>
      </span>
    </li>
  );
}

function Preferences({ onClose }: { onClose(): void }) {
  const { t } = usePrefs();
  const { run } = useFeedback();
  const { state, save } = useInbox();
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  return (
    <Dialog title={t('notificationSettings')} onClose={onClose}>
      <fieldset>
        <legend>{t('showCategories')}</legend>
        {categories.map((c) => (
          <label key={c} className="check">
            <input type="checkbox" checked={!state.off.includes(c)} onChange={(e) => save({ ...state, off: e.target.checked ? state.off.filter((x) => x !== c) : [...state.off, c] })} />{t(categoryKeys[c])}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('browserAlerts')}</legend>
        <p className="muted">{t('browserAlertsNote')}</p>
        {!supported ? <p className="muted">{t('notificationsNone')}</p>
          : permission === 'granted' ? <p className="muted">{t('notificationsOn')}</p>
          : permission === 'denied' ? <p className="muted">{t('notificationsBlocked')}</p>
          : <button type="button" className="btn tonal" onClick={() => run(async () => setPermission(await Notification.requestPermission()))}>{t('enableNotifications')}</button>}
        <div className="two">
          <Field label={t('quietFrom')}><input type="time" value={state.quietFrom} onChange={(e) => save({ ...state, quietFrom: e.target.value })} /></Field>
          <Field label={t('quietTo')}><input type="time" value={state.quietTo} onChange={(e) => save({ ...state, quietTo: e.target.value })} /></Field>
        </div>
        <p className="muted">{t('quietNote')}</p>
      </fieldset>
      {state.dismissed.length > 0 && <button type="button" className="btn" onClick={() => save(restore(state, state.dismissed))}><Undo2 size={18} aria-hidden />{t('restoreDeleted')}</button>}
    </Dialog>
  );
}

export default function NotificationsPage() {
  const { t } = usePrefs();
  const subjects = useSubjects();
  const { notices, state, unread, loading, error, save } = useInbox();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [settings, setSettings] = useState(false);
  const list = onlyUnread ? notices.filter((n) => !isRead(n, state)) : notices;
  const groups = groupNotices(list);
  return (
    <>
      <PageHead title={t('notifications')}>
        <span className="tools">
          <button type="button" className="btn small" disabled={!unread} onClick={() => save(markAllRead(state, Date.now()))}><CheckCheck size={18} aria-hidden />{t('markAllRead')}</button>
          <button type="button" className="icon-btn" aria-label={t('notificationSettings')} onClick={() => setSettings(true)}><Settings2 size={18} aria-hidden /></button>
        </span>
      </PageHead>
      <div className="segmented view-switch" role="group" aria-label={t('notificationFilter')}>
        <button aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>{t('allNotices')}</button>
        <button aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}><span>{t('unreadOnly')} (<bdi>{unread}</bdi>)</span></button>
      </div>
      <Status loading={loading} error={error} />
      {!loading && !groups.length && <Empty title={t(onlyUnread ? 'allRead' : 'noNotifications')}>{!onlyUnread && <span><BellOff size={16} aria-hidden /> {t('noNotificationsHint')}</span>}</Empty>}
      {groups.length > 0 && (
        <ul className="card notices">
          {groups.map((group) => {
            if (group.length === 1) return <Row key={group[0].id} notice={group[0]} />;
            const first = group[0];
            const fresh = group.filter((n) => !isRead(n, state)).length;
            return (
              <li key={first.group} className={fresh ? 'notice-group unread' : 'notice-group'}>
                <details>
                  <summary>
                    <span className="tile small"><Bell size={18} aria-hidden /></span>
                    <span className="row-main">
                      <strong>{t(noticeKeys[first.kind])} (<bdi>{group.length}</bdi>)</strong>
                      <span className="meta"><span>{first.kind === 'submitted' ? first.title : first.kind === 'newItem' ? subjects.nameOf(first.subjectId) : first.title}</span>{fresh > 0 && <span className="tag accepted">{t('unreadOne')}: {fresh}</span>}</span>
                    </span>
                    <ChevronDown size={20} aria-hidden />
                  </summary>
                  <ul>{group.map((n) => <Row key={n.id} notice={n} />)}</ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted">{t('notificationsScope')}</p>
      {settings && <Preferences onClose={() => setSettings(false)} />}
    </>
  );
}
