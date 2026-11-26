import { useMemo } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Task } from '../../data/types';

export function useTasks() {
  const { user, isAdmin } = useSession();
  const result = useCollection<Task>('tasks', isAdmin ? {} : { where: ['audience', 'array-contains-any', ['all', user.uid]] });
  const data = useMemo(() => [...result.data].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt), [result.data]);
  return { ...result, data };
}
