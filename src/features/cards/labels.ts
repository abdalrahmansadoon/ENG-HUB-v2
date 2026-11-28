import type { Difficulty } from '../../data/types';
import type { Key } from '../../lib/i18n';

export const difficultyKeys: Record<Difficulty, Key> = { easy: 'dfEasy', medium: 'dfMedium', hard: 'dfHard' };
export const ratingKeys: Key[] = ['rtAgain', 'rtHard', 'rtGood', 'rtEasy'];
