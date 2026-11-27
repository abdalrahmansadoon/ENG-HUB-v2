import { useMemo } from 'react';
import { useCollection, useSession } from '../../data/context';
import type { Task } from '../../data/types';
import { addDays, today } from '../../lib/dates';
import { byUrgency } from '../../lib/tasks';

/** مهام الدفعة التي تخص العضو، ومعها مهامه الشخصية. */
export function useTasks() {
  const { user, isAdmin, rules2 } = useSession();
  const shared = useCollection<Task>('tasks', isAdmin ? {} : { where: ['audience', 'array-contains-any', ['all', user.uid]] });
  const own = useCollection<Task>(rules2 ? `users/${user.uid}/tasks` : null);
  // المهام الأقدم من 30 يوماً لا تظهر في القائمة ولا نستمع لردودها، توفيراً لحصة القراءة.
  const since = addDays(today(), -30);
  const data = useMemo(() => [
    ...shared.data,
    ...own.data.map((x): Task => ({ ...x, personal: true, audience: [user.uid], createdBy: user.uid })),
  ].filter((x) => x.dueDate >= since).sort(byUrgency), [shared.data, own.data, user.uid, since]);
  return { data, loading: shared.loading || own.loading, error: shared.error ?? own.error };
}
