import { Check, CircleDashed, SkipForward, Timer } from 'lucide-react';
import type { StudySession } from '../../data/types';
import { formatClock } from '../../lib/dates';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { statusKeys } from './SessionForm';

export default function SessionList({ sessions, onOpen }: { sessions: StudySession[]; onOpen(s: StudySession): void }) {
  const { t, lang } = usePrefs();
  const subjects = useSubjects();
  return (
    <ul className="card">
      {sessions.map((s) => {
        const Icon = s.status === 'done' ? (s.timer ? Timer : Check) : s.status === 'skipped' ? SkipForward : CircleDashed;
        return (
          <li key={s.id}>
            <button type="button" className="row link plain-row" onClick={() => onOpen(s)}>
              <span className={`tile small tone-${subjects.tone(s.subjectId)}`}><Icon size={18} aria-hidden /></span>
              <span className="row-main">
                <strong>{s.goal || subjects.nameOf(s.subjectId)}</strong>
                <span className="meta">
                  {s.goal && <span>{subjects.nameOf(s.subjectId)}</span>}
                  {s.start && <span>{formatClock(s.start, lang)}</span>}
                  <span><bdi>{s.status === 'done' ? s.actual : s.planned}</bdi> {t('minutes')}</span>
                </span>
              </span>
              <span className={`tag ${s.status === 'done' ? 'done' : s.status === 'skipped' ? 'declined' : ''}`}>{t(statusKeys[s.status])}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
