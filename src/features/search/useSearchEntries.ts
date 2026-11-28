import { useMemo } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Item, Quiz } from '../../data/types';
import type { Entry } from '../../lib/search';
import { usePrefs } from '../../ui/prefs';
import { useAnnouncements } from '../announcements/useAnnouncements';
import { useCards, useDecks } from '../cards/useCards';
import { useNotes } from '../notes/useNotes';
import { taskPath } from '../tasks/actions';
import { useTasks } from '../tasks/useTasks';
import { useSubjects } from '../useSubjects';

/** كل ما يمكن البحث فيه، من بيانات يملك العضو قراءتها. */
export function useSearchEntries() {
  const { isAdmin } = useSession();
  const { t } = usePrefs();
  const subjects = useSubjects();
  const tasks = useTasks();
  const items = useCollection<Item>('items');
  const quizzes = useCollection<Quiz>('quizzes', isAdmin ? {} : { where: ['published', '==', true] });
  const announcements = useAnnouncements();
  const notes = useNotes();
  const decks = useDecks();
  const cards = useCards();
  const sources = [subjects, tasks, items, quizzes, announcements, notes, decks, cards];
  const loading = sources.some((s) => s.loading);
  const failed = sources.some((s) => s.error);
  const entries = useMemo<Entry[]>(() => {
    const rooms = [{ id: 'general', name: t('roomGeneral'), other: '' }, ...subjects.data.map((s) => ({ id: s.id, name: s.name, other: s.nameEn }))];
    // اسم المادة يدخل في نص كل ما يتبعها، فيجده البحث باسمها.
    const about = (id: string) => { const s = subjects.data.find((x) => x.id === id); return s ? `${s.name} ${s.nameEn}` : ''; };
    return [
      ...tasks.data.map((x): Entry => ({ id: x.id, type: 'task', title: x.title, body: `${x.details} ${about(x.subjectId)}`, subjectId: x.subjectId, to: taskPath(x) })),
      ...subjects.data.map((s): Entry => ({ id: s.id, type: 'subject', title: subjects.label(s), body: `${s.name} ${s.nameEn}`, subjectId: s.id, to: `/subjects/${s.id}` })),
      ...items.data.map((i): Entry => ({ id: i.id, type: 'item', title: i.title, body: `${i.group} ${t(i.category)} ${about(i.subjectId)}`, subjectId: i.subjectId, to: `/subjects/${i.subjectId}/items/${i.id}` })),
      ...quizzes.data.map((q): Entry => ({ id: q.id, type: 'quiz', title: q.title, body: about(q.subjectId), subjectId: q.subjectId, to: `/quizzes/${q.id}` })),
      ...announcements.data.map((a): Entry => ({ id: a.id, type: 'announcement', title: a.title, body: `${a.body} ${about(a.subjectId)}`, subjectId: a.subjectId, to: `/announcements#${a.id}` })),
      ...notes.data.map((n): Entry => ({ id: n.id, type: 'note', title: n.title || t('untitled'), body: `${n.body} ${n.tags.join(' ')} ${about(n.subjectId)}`, subjectId: n.subjectId, to: `/notes/${n.id}` })),
      ...decks.data.map((d): Entry => {
        const own = cards.data.filter((c) => c.deckId === d.id);
        return { id: d.id, type: 'card', title: d.name, body: `${own.map((c) => `${c.front} ${c.back} ${c.tags.join(' ')}`).join(' ')} ${about(d.subjectId)}`, subjectId: d.subjectId, to: `/cards/${d.id}` };
      }),
      ...rooms.map((r): Entry => ({ id: r.id, type: 'chat', title: `${t('chat')}: ${r.name}`, body: r.other, subjectId: r.id === 'general' ? '' : r.id, to: `/chat/${r.id}` })),
    ];
    // t تتغير مع اللغة، فتشمل تغير أسماء المواد.
  }, [t, subjects.data, tasks.data, items.data, quizzes.data, announcements.data, notes.data, decks.data, cards.data]);
  return { entries, loading, failed, subjects };
}
