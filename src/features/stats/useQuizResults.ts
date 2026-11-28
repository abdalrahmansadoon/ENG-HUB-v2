import { useEffect, useState } from 'react';
import { useSession, useStore } from '../../data/context';
import type { AnswerKey, Attempt, Quiz } from '../../data/types';
import { score } from '../../lib/quiz';

export interface QuizResult { quiz: Quiz; score: number; total: number; at: number }

/** درجات العضو في الاختبارات التي سلّمها، محسوبة من إجاباته ومفتاح الاختبار. */
export function useQuizResults(quizzes: Quiz[]) {
  const store = useStore();
  const { user } = useSession();
  const ids = quizzes.filter((q) => q.kind === 'mcq').map((q) => q.id).sort().join(',');
  const [attempts, setAttempts] = useState<Record<string, Attempt | null>>({});
  const [keys, setKeys] = useState<Record<string, number[]>>({});
  useEffect(() => {
    if (!ids) return;
    const stops: (() => void)[] = [];
    const asked = new Set<string>();
    for (const id of ids.split(',')) {
      stops.push(store.watchDoc(`quizzes/${id}/attempts/${user.uid}`, (doc) => {
        setAttempts((old) => ({ ...old, [id]: doc as unknown as Attempt | null }));
        // المفتاح لا يُقرأ إلا بعد التسليم.
        if (!doc || asked.has(id)) return;
        asked.add(id);
        stops.push(store.watchDoc(`quizzes/${id}/private/key`,
          (key) => setKeys((old) => ({ ...old, [id]: (key as unknown as AnswerKey | null)?.answers ?? [] })), (e) => console.error(e)));
      }, (e) => { console.error(e); setAttempts((old) => ({ ...old, [id]: null })); }));
    }
    return () => stops.forEach((stop) => stop());
  }, [ids, store, user.uid]);
  const results: QuizResult[] = quizzes.flatMap((quiz) => {
    const attempt = attempts[quiz.id];
    const key = keys[quiz.id];
    return attempt && key?.length ? [{ quiz, score: score(attempt.answers, key), total: key.length, at: attempt.submittedAt }] : [];
  }).sort((a, b) => b.at - a.at);
  const loading = quizzes.some((q) => q.kind === 'mcq' && (attempts[q.id] === undefined || (attempts[q.id] && !keys[q.id])));
  return { results, loading };
}
