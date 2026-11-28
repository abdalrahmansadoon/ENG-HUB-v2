import { useMemo } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Note } from '../../data/types';

/** ملاحظات العضو، الأحدث تعديلاً أولاً. */
export function useNotes() {
  const { user, rules3 } = useSession();
  const result = useCollection<Note>(rules3 ? `users/${user.uid}/notes` : null);
  const data = useMemo(() => [...result.data].sort((a, b) => b.updatedAt - a.updatedAt), [result.data]);
  return { ...result, data };
}
