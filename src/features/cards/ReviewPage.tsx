import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Card } from '../../data/types';
import { isDue, schedule, type Rating } from '../../lib/cards';
import { today } from '../../lib/dates';
import { useFeedback } from '../../ui/feedback';
import { BackLink, Empty, Meter, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import RichText from '../notes/RichText';
import { ratingKeys } from './labels';
import { useCards, useDecks } from './useCards';

const ratings: Rating[] = [0, 1, 2, 3];

/** جلسة مراجعة. في وضع التمرين لا تتغير المواعيد. */
function Run({ cards, initial, practice, back }: { cards: Card[]; initial: string[]; practice: boolean; back: string }) {
  const store = useStore();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const [queue, setQueue] = useState(initial);
  const [shown, setShown] = useState(false);
  const [missed, setMissed] = useState(0);
  const flipButton = useRef<HTMLButtonElement>(null);
  const goodButton = useRef<HTMLButtonElement>(null);
  // بطاقة حُذفت أثناء الجلسة تُتخطى.
  const left = queue.filter((id) => cards.some((c) => c.id === id));
  const card = cards.find((c) => c.id === left[0]);
  const total = initial.length;
  const finished = total - new Set(left).size;

  const rate = (rating: Rating) => {
    if (!card) return;
    if (!practice) {
      const next = schedule(card, rating, today(), Date.now());
      void run(() => store.update(`users/${user.uid}/cards/${card.id}`, { ...next, reviewedAt: NOW }));
    }
    if (rating === 0) setMissed((n) => n + 1);
    // ما لم تتذكره يعود في آخر الجلسة.
    setQueue(rating === 0 ? [...left.slice(1), card.id] : left.slice(1));
    setShown(false);
  };

  useEffect(() => { (shown ? goodButton : flipButton).current?.focus({ preventScroll: true }); }, [shown, card?.id, queue.length]);
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
      const onControl = (e.target as HTMLElement).closest('button, a, input, textarea, select');
      if (!shown && !onControl && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setShown(true); }
      if (shown && /^[1-4]$/.test(e.key)) { e.preventDefault(); rate((Number(e.key) - 1) as Rating); }
    };
    addEventListener('keydown', keys);
    return () => removeEventListener('keydown', keys);
  });

  if (!card) return (
    <div className="empty" role="status">
      <p>{t('reviewDone')}</p>
      <span>{t('reviewedCards')}: <bdi>{total}</bdi>، {t('missedTimes')}: <bdi>{missed}</bdi></span>
      <Link to={back} className="btn primary">{t('back')}</Link>
    </div>
  );
  return (
    <div className="review">
      <Meter value={finished} total={total} label={t('reviewProgress')} />
      {practice && <p className="muted">{t('practiceNote')}</p>}
      <article key={`${card.id}-${queue.length}`} className="flashcard card" aria-live="polite">
        <div><RichText text={card.front} />{card.image && <img src={card.image} alt={t('cardImage')} />}</div>
        {shown && <div className="answer-side"><RichText text={card.back} /></div>}
      </article>
      {!shown ? (
        <button ref={flipButton} type="button" className="btn primary block" onClick={() => setShown(true)}>{t('showAnswer')}</button>
      ) : (
        <div className="ratings" role="group" aria-label={t('howWell')}>
          {ratings.map((r) => {
            const days = schedule(card, r, today(), 0).interval;
            return (
              <button key={r} ref={r === 2 ? goodButton : undefined} type="button" className={`btn rate-${r}`} onClick={() => rate(r)}>
                <span>{t(ratingKeys[r])}</span>
                {!practice && <small>{days ? <>{t('afterDays')} <bdi>{days}</bdi></> : t('againNow')}</small>}
              </button>
            );
          })}
        </div>
      )}
      <p className="muted keys-hint">{t('reviewKeys')}</p>
    </div>
  );
}

function Loader({ deckId, practice }: { deckId?: string; practice: boolean }) {
  const { t } = usePrefs();
  const cards = useCards(deckId);
  const decks = useDecks();
  const back = deckId ? `/cards/${deckId}` : '/cards';
  const [initial, setInitial] = useState<string[] | null>(null);
  // قائمة الجلسة تثبت عند بدئها.
  useEffect(() => {
    if (initial || cards.loading || cards.error || decks.loading) return;
    const ids = new Set(decks.data.map((d) => d.id));
    setInitial(cards.data.filter((c) => ids.has(c.deckId) && (practice || isDue(c, today()))).map((c) => c.id));
  }, [initial, cards.loading, cards.error, cards.data, decks.loading, decks.data, practice]);
  return (
    <>
      <div className="topbar"><BackLink to={back} /><h1 className="small-title">{t(practice ? 'practiceAll' : 'reviewDue')}</h1><span /></div>
      {!initial ? <Status loading={!cards.error} error={cards.error} />
        : !initial.length ? <Empty title={t('nothingDue')}><Link to={back} className="btn">{t('back')}</Link></Empty>
        : <Run cards={cards.data} initial={initial} practice={practice} back={back} />}
    </>
  );
}

export default function ReviewPage() {
  const { deckId } = useParams();
  const practice = useSearchParams()[0].get('all') === '1';
  return <NeedsRules><Loader key={`${deckId}-${practice}`} deckId={deckId} practice={practice} /></NeedsRules>;
}
