import type { Card, Difficulty } from '../data/types';
import { addDays } from './dates';

/** 0 لم أتذكرها، 1 بصعوبة، 2 جيد، 3 سهلة */
export type Rating = 0 | 1 | 2 | 3;
export const startEase: Record<Difficulty, number> = { easy: 2.7, medium: 2.5, hard: 2.2 };
export const MAX_INTERVAL = 365;
export const HISTORY_SIZE = 20;

type State = Pick<Card, 'ease' | 'interval' | 'reviews' | 'lapses' | 'history'>;

/** التكرار المتباعد (مبني على SM-2): الأسهل تعود بعد مدة أطول. */
export function schedule(card: State, rating: Rating, today: string, now: number): State & Pick<Card, 'due'> {
  const ease = Math.round(Math.min(3.2, Math.max(1.3, card.ease + [-0.2, -0.15, 0, 0.15][rating])) * 100) / 100;
  const last = card.interval;
  let interval = 0;
  if (rating === 1) interval = last ? Math.max(last + 1, Math.round(last * 1.2)) : 1;
  if (rating === 2) interval = !last ? 1 : last === 1 ? 3 : Math.max(last + 1, Math.round(last * ease));
  if (rating === 3) interval = !last ? 4 : Math.max(last + 2, Math.round(last * ease * 1.3));
  interval = Math.min(interval, MAX_INTERVAL);
  return {
    ease, interval, due: addDays(today, interval),
    reviews: card.reviews + 1, lapses: card.lapses + (rating === 0 ? 1 : 0),
    history: [...card.history, { at: now, rating }].slice(-HISTORY_SIZE),
  };
}
export const isDue = (card: Pick<Card, 'due'>, today: string) => card.due <= today;
/** الأقدم استحقاقاً أولاً. */
export const byDue = (a: Card, b: Card) => a.due.localeCompare(b.due) || a.createdAt - b.createdAt;
