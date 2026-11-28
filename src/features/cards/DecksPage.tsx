import { Layers, Play, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isDue } from '../../lib/cards';
import { today } from '../../lib/dates';
import { Empty, PageHead, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import DeckForm from './DeckForm';
import { useCards, useDecks } from './useCards';

function List() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const decks = useDecks();
  const cards = useCards();
  const subjects = useSubjects();
  const [adding, setAdding] = useState(false);
  const now = today();
  const ids = new Set(decks.data.map((d) => d.id));
  const due = cards.data.filter((c) => ids.has(c.deckId) && isDue(c, now)).length;
  if (decks.loading || cards.loading || decks.error || cards.error) return <Status loading={decks.loading || cards.loading} error={decks.error ?? cards.error} />;
  return (
    <>
      {due > 0 && <Link to="/cards/review" className="btn signal block"><Play size={18} aria-hidden /><span>{t('reviewDue')} (<bdi>{due}</bdi>)</span></Link>}
      {!decks.data.length ? (
        <Empty title={t('noDecks')}><span>{t('noDecksHint')}</span><button type="button" className="btn primary" onClick={() => setAdding(true)}>{t('newDeck')}</button></Empty>
      ) : (
        <ul className="card-grid">{decks.data.map((d) => {
          const own = cards.data.filter((c) => c.deckId === d.id);
          const waiting = own.filter((c) => isDue(c, now)).length;
          return (
            <li key={d.id}>
              <Link to={`/cards/${d.id}`} className="row link">
                <span className={`tile tone-${subjects.tone(d.subjectId)}`}><Layers size={20} aria-hidden /></span>
                <span className="row-main">
                  <strong>{d.name}</strong>
                  <span className="meta"><span>{subjects.nameOf(d.subjectId)}</span><span>{t('cardsCount')}: <bdi>{own.length}</bdi></span></span>
                </span>
                {waiting > 0 && <span className="tag day-tag">{t('dueNow')}: <bdi>{waiting}</bdi></span>}
              </Link>
            </li>
          );
        })}</ul>
      )}
      <button type="button" className="btn primary fab" onClick={() => setAdding(true)}><Plus size={20} aria-hidden />{t('newDeck')}</button>
      {adding && <DeckForm onClose={() => setAdding(false)} onSaved={(id) => navigate(`/cards/${id}`)} />}
    </>
  );
}

export default function DecksPage() {
  const { t } = usePrefs();
  return <><PageHead title={t('flashcards')}><p>{t('privateNote')}</p></PageHead><NeedsRules><List /></NeedsRules></>;
}
