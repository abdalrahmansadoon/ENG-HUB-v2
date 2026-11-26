import { useMemo } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Task } from '../../data/types';
import { addDays, today } from '../../lib/dates';

export function useTasks() {
  const { user, isAdmin } = useSession();
  const result = useCollection<Task>('tasks', isAdmin ? {} : { where: ['audience', 'array-contains-any', ['all', user.uid]] });
  // المهام الأقدم من 30 يوماً لا تظهر في القائمة ولا نستمع لردودها، توفيراً لحصة القراءة.
  const since = addDays(today(), -30);
  const data = useMemo(() => result.data.filter((x) => x.dueDate >= since)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt), [result.data, since]);
  return { ...result, data };
}
