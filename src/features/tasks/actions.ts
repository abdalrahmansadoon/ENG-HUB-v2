import { useSession, useStore } from '../../data/context';
import { NOW, type Data, type Store } from '../../data/store';
import type { ResponseStatus, Task, TaskResponse } from '../../data/types';

export const taskPath = (task: Pick<Task, 'id' | 'personal'>) => (task.personal ? `/tasks/p/${task.id}` : `/tasks/${task.id}`);

/** يحذف مهمة الدفعة مع ردودها وتسليماتها وتعليقاتها. */
async function removeShared(store: Store, id: string, rules2: boolean) {
  const base = `tasks/${id}`;
  for (const response of await store.list(`${base}/responses`)) {
    if (rules2) for (const s of await store.list(`${base}/responses/${response.id}/submissions`)) await store.remove(`${base}/responses/${response.id}/submissions/${s.id}`);
    await store.remove(`${base}/responses/${response.id}`);
  }
  for (const c of await store.list(`${base}/comments`)) await store.remove(`${base}/comments/${c.id}`);
  await store.remove(base);
}

export function useTaskActions() {
  const store = useStore();
  const { user, name, rules2 } = useSession();

  /** يضبط حالة العضو، والضغط على الحالة نفسها يلغيها. */
  function setStatus(task: Task, current: TaskResponse | undefined, status: ResponseStatus) {
    if (task.personal) {
      const done = current?.status !== 'done';
      return store.update(`users/${user.uid}/tasks/${task.id}`, { done, doneAt: done ? NOW : 0 });
    }
    const path = `tasks/${task.id}/responses/${user.uid}`;
    // سجل التسليم والمراجعة لا يُحذف.
    const history = Boolean(current?.version || current?.reviewedAt);
    if (current?.status === status) {
      if (!history) return store.remove(path);
      status = 'accepted';
    }
    const data: Data = { status, name, updatedAt: NOW };
    if (!rules2) return store.set(path, data);
    if (!current?.startedAt && (status === 'accepted' || status === 'done')) data.startedAt = NOW;
    return store.setMany([[path, data]], { merge: true });
  }

  /** نسخة تسليم جديدة؛ السابقة تبقى كما هي. */
  function submit(task: Task, current: TaskResponse | undefined, solution: { text: string; urls: string[]; names: string[]; link: string }) {
    const version = (current?.version ?? 0) + 1;
    const path = `tasks/${task.id}/responses/${user.uid}`;
    const response: Data = { status: 'submitted', name, updatedAt: NOW, version, submittedAt: NOW };
    if (!current?.startedAt) response.startedAt = NOW;
    return store.setMany([
      [`${path}/submissions/${version}`, { ...solution, version, at: NOW }],
      [path, response],
    ], { merge: true });
  }

  /** قرار المشرف على عمل عضو. */
  function review(task: Task, member: { id: string; name: string }, current: TaskResponse | undefined, verdict: 'review' | 'done' | 'rejected', note: string) {
    const path = `tasks/${task.id}/responses/${member.id}`;
    const stamp = { reviewedBy: user.uid, reviewedAt: NOW };
    const entries: [string, Data][] = [[path, { status: verdict, name: current?.name ?? member.name, updatedAt: NOW, ...stamp }]];
    if (current?.version) entries.push([`${path}/submissions/${current.version}`, { verdict, reviewNote: note, ...stamp }]);
    return store.setMany(entries, { merge: true });
  }

  /** يحذف المهمة، أو هي والنسخ التالية من السلسلة. */
  async function remove(task: Task, following: Task[] = []) {
    for (const t of [task, ...following]) {
      if (t.personal) await store.remove(`users/${user.uid}/tasks/${t.id}`);
      else await removeShared(store, t.id, rules2);
    }
  }

  return { setStatus, submit, review, remove };
}
