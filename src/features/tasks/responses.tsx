import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSession, useStore } from '../../data/context';
import type { TaskResponse } from '../../data/types';
import { addDays, today } from '../../lib/dates';
import { useTasks } from './useTasks';

interface Value { byTask: Record<string, TaskResponse[]> }
const Context = createContext<Value>({ byTask: {} });
export const useResponses = () => useContext(Context);

export function ResponsesProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { user, name } = useSession();
  const tasks = useTasks();
  // لا نستمع لردود المهام البعيدة (نسخ متكررة قادمة) حتى يقترب موعدها.
  const horizon = addDays(today(), 30);
  const ids = tasks.data.filter((x) => !x.personal && x.dueDate <= horizon).map((x) => x.id).sort().join(',');
  const [live, setLive] = useState<Value['byTask']>({});
  useEffect(() => {
    if (!ids) return;
    const stops = ids.split(',').map((id) => store.watch(`tasks/${id}/responses`, {},
      (docs) => setLive((old) => ({ ...old, [id]: docs as unknown as TaskResponse[] })),
      (e) => {
        // قد تُحذف المهمة أثناء الاستماع: نعامل ردودها كفارغة.
        console.error(e);
        setLive((old) => ({ ...old, [id]: [] }));
      }));
    return () => stops.forEach((stop) => stop());
  }, [ids, store]);
  const byTask = useMemo(() => {
    const all = { ...live };
    for (const task of tasks.data) {
      if (task.personal) all[task.id] = task.done ? [{ id: user.uid, status: 'done', name, updatedAt: task.doneAt ?? task.createdAt }] : [];
      else if (task.dueDate > horizon) all[task.id] = [];
    }
    return all;
  }, [live, tasks.data, horizon, user.uid, name]);
  return <Context.Provider value={{ byTask }}>{children}</Context.Provider>;
}
