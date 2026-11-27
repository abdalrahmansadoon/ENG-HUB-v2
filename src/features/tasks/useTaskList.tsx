import { useSession } from '../../data/context';
import type { Task } from '../../data/types';
import { useSubjects } from '../useSubjects';
import { useResponses } from './responses';
import TaskRow from './TaskRow';
import { useTasks } from './useTasks';

/** المهام الجاهزة للعرض مع رد العضو عليها، ودالة ترسمها كقائمة. */
export function useTaskList() {
  const { user } = useSession();
  const tasks = useTasks();
  const responses = useResponses();
  const subjects = useSubjects();
  const response = (id: string) => responses.byTask[id]?.find((r) => r.id === user.uid);
  const mine = (id: string) => response(id)?.status;
  // لا نصنف المهمة قبل معرفة ردودها، حتى لا تقفز بين الأقسام.
  const ready = tasks.data.filter((x) => responses.byTask[x.id]);
  const waiting = tasks.loading || ready.length < tasks.data.length;
  const rows = (list: Task[], extra: (x: Task) => { date?: boolean; dayTag?: string } = () => ({})) => (
    <ul className="card">
      {list.map((x) => <TaskRow key={x.id} task={x} mine={response(x.id)} subject={subjects.nameOf(x.subjectId)} tone={subjects.tone(x.subjectId)}
        doneBy={responses.byTask[x.id].filter((r) => r.status === 'done').length} {...extra(x)} />)}
    </ul>
  );
  return { tasks, ready, waiting, mine, rows, byTask: responses.byTask };
}
