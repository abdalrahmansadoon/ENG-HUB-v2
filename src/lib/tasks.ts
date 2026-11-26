import type { ResponseStatus, Task } from '../data/types';

export type Bucket = 'late' | 'today' | 'next' | 'closed';
export function bucketOf(task: Task, status: ResponseStatus | undefined, today: string): Bucket {
  if (status === 'done' || status === 'declined') return 'closed';
  if (task.dueDate < today) return 'late';
  return task.dueDate === today ? 'today' : 'next';
}
