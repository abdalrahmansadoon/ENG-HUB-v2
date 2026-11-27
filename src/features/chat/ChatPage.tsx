import { ImagePlus, Lock, LockOpen, Reply, SendHorizontal, Trash2, UserX, VolumeX, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { useBackend, useCollection, useDoc, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Message, Mute, Room } from '../../data/types';
import { upload, uploadsReady } from '../../lib/cloudinary';
import { formatShort, formatTime, toKey } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { Avatar, Dialog, Empty, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { memberTone } from '../../ui/tone';
import { useSubjects } from '../useSubjects';

export default function ChatPage() {
  const { roomId } = useParams();
  const subjects = useSubjects();
  const { t } = usePrefs();
  const tabs = useRef<HTMLElement>(null);
  // نُظهر الغرفة الحالية إذا كانت خارج الجزء المرئي من الشريط.
  useEffect(() => { tabs.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [roomId, subjects.loading]);
  if (!roomId) return <Navigate to="/chat/general" replace />;
  const rooms = [{ id: 'general', name: t('roomGeneral'), tone: undefined as number | undefined },
    ...subjects.data.map((s) => ({ id: s.id, name: subjects.label(s), tone: subjects.tone(s.id) as number | undefined }))];
  const known = rooms.some((r) => r.id === roomId);
  return (
    <div className="chat">
      <h1 className="sr">{t('chat')}</h1>
      <nav className="chips" ref={tabs} aria-label={t('chat')}>{rooms.map((r) => <NavLink key={r.id} to={`/chat/${r.id}`} className={r.tone ? `tone-${r.tone}` : ''}>{r.name}</NavLink>)}</nav>
      <div className="room">
        {known ? <RoomView key={roomId} roomId={roomId} /> : subjects.loading ? <Status loading /> : <Empty title={t('notFound')} />}
      </div>
    </div>
  );
}

function RoomView({ roomId }: { roomId: string }) {
  const store = useStore();
  const { demo } = useBackend();
  const { user, name, isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const [count, setCount] = useState(50);
  const path = `rooms/${roomId}/messages`;
  const messages = useCollection<Message>(path, { orderBy: ['createdAt', 'desc'], limit: count });
  const room = useDoc<Room>(`rooms/${roomId}`);
  const mine = useDoc<Mute>(`mutes/${user.uid}`);
  // نبقي الرسائل ظاهرة أثناء تحميل الأقدم منها.
  const [kept, setKept] = useState<Message[]>([]);
  if (!messages.loading && kept !== messages.data) setKept(messages.data);
  const list = [...(messages.loading ? kept : messages.data)].reverse();
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [replyTo, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMuted, setShowMuted] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const newest = list.at(-1)?.id;
  useLayoutEffect(() => { if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight; }, [newest]);

  const locked = room.data?.locked === true;
  const blocked = !isAdmin && (locked || !!mine.data);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const value = text.trim();
    if (busy || (!value && !image)) return;
    setBusy(true);
    stick.current = true;
    const draft = { text, image, replyTo };
    setText(''); setImage(''); setReply('');
    const ok = await run(() => store.add(path, { uid: user.uid, name, text: value, imageUrl: image, replyTo, createdAt: NOW }));
    if (!ok) { setText(draft.text); setImage(draft.image); setReply(draft.replyTo); }
    setBusy(false);
  };

  let day = '';
  return (
    <>
      {isAdmin && <div className="tools chat-tools">
        <button className="btn small" onClick={() => run(() => store.set(`rooms/${roomId}`, { locked: !locked }))}>
          {locked ? <LockOpen size={16} aria-hidden /> : <Lock size={16} aria-hidden />}{t(locked ? 'unlock' : 'lock')}</button>
        <button className="btn small" onClick={() => setShowMuted(true)}><VolumeX size={16} aria-hidden />{t('mutedList')}</button>
      </div>}
      <div className="messages" ref={box} aria-live="polite"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        <Status loading={messages.loading && !list.length} error={messages.error} />
        {!messages.loading && !messages.error && !list.length && <Empty title={t('noMessages')} />}
        {list.length >= count && <button className="text-btn" onClick={() => { stick.current = false; setCount(count + 50); }}>{t('older')}</button>}
        {list.map((m) => {
          const key = toKey(new Date(m.createdAt));
          const header = key !== day ? formatShort(m.createdAt, lang) : '';
          day = key;
          const own = m.uid === user.uid;
          return (
            <div key={m.id} className="msg-wrap">
              {header && <p className="day">{header}</p>}
              <div className={own ? 'msg-line own' : 'msg-line'}>
                {!own && <Avatar name={m.name} size="small" tone={memberTone(m.uid)} />}
                <article className={own ? 'msg own' : `msg tone-${memberTone(m.uid)}`}>
                  {!own && <strong>{m.name}</strong>}
                  {m.replyTo && <blockquote dir="auto">{m.replyTo}</blockquote>}
                  {m.imageUrl && <a href={m.imageUrl} target="_blank" rel="noopener noreferrer"><img src={m.imageUrl} alt={t('image')} loading="lazy" /></a>}
                  {m.text && <p className="pre" dir="auto">{m.text}</p>}
                  <footer>
                    <time>{formatTime(m.createdAt, lang)}</time>
                    {!blocked && <button aria-label={t('reply')} onClick={() => setReply(`${m.name}: ${m.text || t('image')}`.slice(0, 200))}><Reply size={15} /></button>}
                    {(own || isAdmin) && <button aria-label={t('delete')} onClick={async () => { if (await confirm('confirmMessage')) await run(() => store.remove(`${path}/${m.id}`)); }}><Trash2 size={15} /></button>}
                    {isAdmin && !own && <button aria-label={`${t('mute')}: ${m.name}`} onClick={async () => { if (await confirm('confirmMute')) await run(() => store.set(`mutes/${m.uid}`, { name: m.name }), 'saved'); }}><UserX size={15} /></button>}
                  </footer>
                </article>
              </div>
            </div>
          );
        })}
      </div>
      {blocked ? <p className="composer-blocked">{t(mine.data ? 'muted' : 'locked')}</p> : (
        <form className="composer" onSubmit={send}>
          {replyTo && <p className="pending"><span dir="auto">{replyTo}</span><button type="button" className="icon-btn plain" aria-label={t('cancel')} onClick={() => setReply('')}><X size={16} /></button></p>}
          {image && <p className="pending"><img src={image} alt={t('image')} /><button type="button" className="icon-btn plain" aria-label={t('cancel')} onClick={() => setImage('')}><X size={16} /></button></p>}
          <div className="composer-row">
            {!demo && uploadsReady && <label className="icon-btn file-btn"><ImagePlus size={20} aria-hidden /><span className="sr">{t('attach')}</span>
              <input type="file" accept="image/*" disabled={busy} onChange={async (e) => {
                const input = e.currentTarget; const file = input.files?.[0];
                if (!file) return;
                setBusy(true); await run(async () => setImage(await upload(file, undefined, 'image'))); setBusy(false); input.value = '';
              }} /></label>}
            <textarea rows={1} maxLength={2000} dir="auto" aria-label={t('writeMessage')} placeholder={t('writeMessage')} value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia('(pointer: fine)').matches) { e.preventDefault(); void send(); } }} />
            <button className="btn primary send" aria-label={t('send')} disabled={busy || (!text.trim() && !image)}><SendHorizontal size={20} className="flip" /></button>
          </div>
        </form>
      )}
      {showMuted && <MutedDialog onClose={() => setShowMuted(false)} />}
    </>
  );
}

function MutedDialog({ onClose }: { onClose(): void }) {
  const store = useStore();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const muted = useCollection<Mute>('mutes');
  return (
    <Dialog title={t('mutedList')} onClose={onClose}>
      <Status loading={muted.loading} error={muted.error} />
      {!muted.loading && !muted.data.length && <p className="muted">{t('noMuted')}</p>}
      {muted.data.length > 0 && <ul className="card">{muted.data.map((m) => (
        <li key={m.id} className="row"><Avatar name={m.name} size="small" tone={memberTone(m.id)} /><span className="row-main"><bdi>{m.name}</bdi></span>
          <button className="btn small" onClick={() => run(() => store.remove(`mutes/${m.id}`), 'saved')}>{t('unmute')}</button></li>
      ))}</ul>}
    </Dialog>
  );
}
