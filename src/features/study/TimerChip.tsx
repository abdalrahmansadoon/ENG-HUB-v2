import { Pause, Timer } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clock } from '../../lib/pomodoro';
import { usePrefs } from '../../ui/prefs';
import { phaseKeys, usePomodoro, useRemaining } from './pomodoro';

function Chip() {
  const { t } = usePrefs();
  const { timer } = usePomodoro();
  const left = useRemaining();
  const Icon = timer.endsAt === null ? Pause : Timer;
  return (
    <Link to="/study" className="timer-chip mat">
      <Icon size={18} aria-hidden /><bdi dir="ltr">{clock(left)}</bdi><span>{t(phaseKeys[timer.phase])}</span>
    </Link>
  );
}

/** تذكير بالمؤقت العامل في بقية الصفحات. */
export default function TimerChip() {
  const { timer } = usePomodoro();
  const { pathname } = useLocation();
  return timer.startedAt === null || pathname === '/study' || pathname.startsWith('/chat') ? null : <Chip />;
}
