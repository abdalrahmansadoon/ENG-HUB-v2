import { Pencil, Play, Plus, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDoc, useSession, useStore } from '../../data/context';
import type { Card, Deck } from '../../data/types';
import { isDue } from '../../lib/cards';
import { formatDate, today } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { BackLink, Empty, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import CardForm from './CardForm';
import DeckForm from './DeckForm';
import { difficultyKeys } from './labels';
import { useCards } from './useCards';

function Content({ deckId }: { deckId: string }) {
  const store = useStore();
  const navigate = useNavigate();
  const { user } = useSession();
  const { t, lang } = usePrefs();
  const { run, confirm } = useFeedback();
  const subjects = useSubjects();
  const deck = useDoc<Deck>(`users/${user.uid}/decks/${deckId}`);
  const cards = useCards(deckId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ card?: Card } | null>(null);
  if (deck.loading || !deck.data) return <><BackLink to="/cards" />{deck.loading || deck.error ? <Status loading={deck.loading} error={deck.error} /> : <Empty page title={t('notFound')} />}</>;
  const now = today();
  const due = cards.data.filter((c) => isDue(c, now)).length;
  const remove = async () => {
    if (!await confirm('confirmDeck')) return;
    const done = await run(async () => {
      await Promise.all(cards.data.map((c) => store.remove(`users/${user.uid}/cards/${c.id}`)));
      await store.remove(`users/${user.uid}/decks/${deckId}`);
    }, 'deleted');
    if (done) navigate('/cards', { replace: true });
  };
  return (
    <>
      <div className="topbar">
        <BackLink to="/cards" />
        <div className="tools">
          <button type="button" className="icon-btn" aria-label={t('editDeck')} onClick={() => setEditing(true)}><Pencil size={18} aria-hidden /></button>
          <button type="button" className="icon-btn danger" aria-label={t('deleteDeck')} disabled={cards.loading} onClick={remove}><Trash2 size={18} aria-hidden /></button>
        </div>
      </div>
      <header className="group">
        <h1>{deck.data.name}</h1>
        <p className="meta"><span className={`subject-dot tone-${subjects.tone(deck.data.subjectId)}`}>{subjects.nameOf(deck.data.subjectId)}</span><span>{t('cardsCount')}: <bdi>{cards.data.length}</bdi></span></p>
      </header>
      {cards.data.length > 0 && <div className="actions">
        {due > 0 && <Link to={`/cards/${deckId}/review`} className="btn signal"><Play size={18} aria-hidden /><span>{t('reviewDue')} (<bdi>{due}</bdi>)</span></Link>}
        <Link to={`/cards/${deckId}/review?all=1`} className="btn"><Repeat size={18} aria-hidden />{t('practiceAll')}</Link>
      </div>}
      <Status loading={cards.loading} error={cards.error} />
      {!cards.loading && !cards.error && !cards.data.length && <Empty title={t('noCards')}><button type="button" className="btn primary" onClick={() => setForm({})}>{t('newCard')}</button></Empty>}
      {cards.data.length > 0 && <ul className="card">{cards.data.map((c) => (
        <li key={c.id}>
          <button type="button" className="row link plain-row" onClick={() => setForm({ card: c })}>
            <span className="row-main">
              <strong dir="auto" className="clip">{c.front}</strong>
              <span className="meta"><span>{isDue(c, now) ? t('dueNow') : `${t('nextReview')} ${formatDate(c.due, lang)}`}</span><span>{t(difficultyKeys[c.difficulty])}</span>{c.tags.map((x) => <span key={x} className="tag">{x}</span>)}</span>
            </span>
            <Pencil size={16} aria-hidden />
          </button>
        </li>
      ))}</ul>}
      <button type="button" className="btn primary fab" onClick={() => setForm({})}><Plus size={20} aria-hidden />{t('newCard')}</button>
      {editing && <DeckForm deck={deck.data} onClose={() => setEditing(false)} />}
      {form && <CardForm card={form.card} deckId={deckId} onClose={() => setForm(null)} />}
    </>
  );
}

export default function DeckPage() {
  const { deckId = '' } = useParams();
  return <NeedsRules><Content key={deckId} deckId={deckId} /></NeedsRules>;
}
