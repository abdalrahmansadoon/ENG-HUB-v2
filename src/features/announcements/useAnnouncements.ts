import { useCollection, useSession } from '../../data/context';
import type { Announcement, AnnouncementKind } from '../../data/types';
import type { Key } from '../../lib/i18n';

export const kindKeys: Record<AnnouncementKind, Key> = { news: 'anNews', date: 'anDate', subject: 'anSubject', exam: 'anExam', schedule: 'anSchedule' };

/** أحدث إعلانات الدفعة. */
export function useAnnouncements() {
  const { rules3 } = useSession();
  return useCollection<Announcement>(rules3 ? 'announcements' : null, { orderBy: ['createdAt', 'desc'], limit: 60 });
}
