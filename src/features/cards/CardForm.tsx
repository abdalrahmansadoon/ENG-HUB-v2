import { Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Card, Difficulty } from '../../data/types';
import { startEase } from '../../lib/cards';
import { formatShort, today } from '../../lib/dates';
import { parseTags } from '../../lib/tags';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import UploadField from '../../ui/UploadField';
import { difficultyKeys, ratingKeys } from './labels';

export default function CardForm({ card, deckId, onClose }: { card?: Card; deckId: string; onClose(): void }) {
  const store = useStore();
  const { user } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [image, setImage] = useState(card?.image ?? '');
  const [tags, setTags] = useState(card?.tags.join('، ') ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(card?.difficulty ?? 'medium');
  const [another, setAnother] = useState(!card);
  const [uploading, setUploading] = useState(false);
  const first = useRef<HTMLTextAreaElement>(null);

  const save = async () => {
    const data = { front: front.trim(), back: back.trim(), image, tags: parseTags(tags), difficulty };
    const ok = await run(() => (card
      // الصعوبة تحدد سرعة التباعد قبل أول مراجعة فقط.
      ? store.update(`users/${user.uid}/cards/${card.id}`, { ...data, ...(!card.reviews && { ease: startEase[difficulty] }) })
      : store.set(`users/${user.uid}/cards/${store.newId()}`, {
        ...data, deckId, ease: startEase[difficulty], interval: 0, due: today(), reviews: 0, lapses: 0, history: [], createdAt: NOW,
      })), 'saved');
    if (!ok) return;
    if (card || !another) { onClose(); return; }
    setFront(''); setBack(''); setImage('');
    first.current?.focus();
  };

  return (
    <Dialog title={t(card ? 'editCard' : 'newCard')} onClose={onClose}>
      <Form submitLabel={t('save')} onSubmit={save} disabled={uploading}>
        <Field label={t('cardFront')}><textarea ref={first} required rows={2} maxLength={2000} dir="auto" value={front} onChange={(e) => setFront(e.target.value)} /></Field>
        <Field label={t('cardBack')}><textarea required rows={3} maxLength={4000} dir="auto" value={back} onChange={(e) => setBack(e.target.value)} /></Field>
        <p className="muted">{t('mathHint')} <bdi dir="ltr">$x^2$</bdi></p>
        {image ? (
          <ul className="thumbs"><li><img src={image} alt={t('cardImage')} /><button type="button" className="icon-btn danger" aria-label={t('removeImage')} onClick={() => setImage('')}><X size={16} aria-hidden /></button></li></ul>
        ) : <UploadField label={t('addImage')} accept="image/*" only="image" onBusy={setUploading} onUploaded={(url) => setImage(url)} />}
        <div className="two">
          <Field label={t('difficulty')}>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {(['easy', 'medium', 'hard'] as const).map((d) => <option key={d} value={d}>{t(difficultyKeys[d])}</option>)}
            </select>
          </Field>
          <Field label={t('tags')} hint={t('optional')}><input maxLength={300} dir="auto" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        </div>
        {!card && <label className="check"><input type="checkbox" checked={another} onChange={(e) => setAnother(e.target.checked)} />{t('addAnother')}</label>}
      </Form>
      {card && card.history.length > 0 && (
        <section className="group">
          <h3>{t('reviewHistory')}</h3>
          <p className="muted">{t('reviewsCount')}: <bdi>{card.reviews}</bdi>، {t('lapsesCount')}: <bdi>{card.lapses}</bdi></p>
          <ul className="history">{[...card.history].reverse().slice(0, 8).map((h) => <li key={h.at}><span>{formatShort(h.at, lang)}</span><span>{t(ratingKeys[h.rating])}</span></li>)}</ul>
        </section>
      )}
      {card && <button type="button" className="text-btn danger" onClick={async () => {
        if (await confirm('confirmCard') && await run(() => store.remove(`users/${user.uid}/cards/${card.id}`), 'deleted')) onClose();
      }}><Trash2 size={18} aria-hidden />{t('delete')}</button>}
    </Dialog>
  );
}
