import { useMemo } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Card, Deck } from '../../data/types';
import { byDue } from '../../lib/cards';

export function useDecks() {
  const { user, rules3 } = useSession();
  const result = useCollection<Deck>(rules3 ? `users/${user.uid}/decks` : null);
  const data = useMemo(() => [...result.data].sort((a, b) => b.createdAt - a.createdAt), [result.data]);
  return { ...result, data };
}
/** بطاقات مجموعة واحدة، أو كل البطاقات، الأقرب استحقاقاً أولاً. */
export function useCards(deckId?: string) {
  const { user, rules3 } = useSession();
  const result = useCollection<Card>(rules3 ? `users/${user.uid}/cards` : null, deckId ? { where: ['deckId', '==', deckId] } : {});
  const data = useMemo(() => [...result.data].sort(byDue), [result.data]);
  return { ...result, data };
}
