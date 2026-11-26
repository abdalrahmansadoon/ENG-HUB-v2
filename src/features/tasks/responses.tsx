import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../../data/context';
import type { TaskResponse } from '../../data/types';
import { useTasks } from './useTasks';

interface Value { byTask: Record<string, TaskResponse[]> }
const Context = createContext<Value>({ byTask: {} });
export const useResponses = () => useContext(Context);

export function ResponsesProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const tasks = useTasks();
  const ids = tasks.data.map((x) => x.id).sort().join(',');
  const [byTask, setByTask] = useState<Value['byTask']>({});
  useEffect(() => {
    if (!ids) return;
    const stops = ids.split(',').map((id) => store.watch(`tasks/${id}/responses`, {},
      (docs) => setByTask((old) => ({ ...old, [id]: docs as unknown as TaskResponse[] })),
      (e) => {
        // قد تُحذف المهمة أثناء الاستماع: نعامل ردودها كفارغة.
        console.error(e);
        setByTask((old) => ({ ...old, [id]: [] }));
      }));
    return () => stops.forEach((stop) => stop());
  }, [ids, store]);
  return <Context.Provider value={{ byTask }}>{children}</Context.Provider>;
}
