import { ChevronsUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { Priority } from '../../data/types';
import type { Key } from '../../lib/i18n';
import type { ViewStatus } from '../../lib/tasks';
import { usePrefs } from '../../ui/prefs';

export const statusKeys: Record<ViewStatus, Key> = {
  new: 'stNew', accepted: 'stAccepted', declined: 'stDeclined', submitted: 'stSubmitted', review: 'stReview',
  done: 'stDone', rejected: 'stRejected', late: 'late', cancelled: 'stCancelled',
};
export function StatusTag({ status }: { status: ViewStatus }) {
  const { t } = usePrefs();
  return <span className={`tag st-${status}`}>{t(statusKeys[status])}</span>;
}

export const priorityKeys: Record<Priority, Key> = { low: 'prLow', normal: 'prNormal', high: 'prHigh', urgent: 'prUrgent' };
/** الأولوية العادية لا تُذكر. الأيقونة تغني عن اللون وحده. */
export function PriorityTag({ priority = 'normal' }: { priority?: Priority }) {
  const { t } = usePrefs();
  if (priority === 'normal') return null;
  const Icon = priority === 'urgent' ? ChevronsUp : priority === 'high' ? ChevronUp : ChevronDown;
  return <span className={`tag pr-${priority}`}><Icon size={13} aria-hidden />{t(priorityKeys[priority])}</span>;
}
