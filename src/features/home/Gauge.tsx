import type { CSSProperties } from 'react';
import { usePrefs } from '../../ui/prefs';

const point = (degrees: number, radius: number) => {
  const a = (degrees * Math.PI) / 180;
  return [120 - radius * Math.cos(a), 120 - radius * Math.sin(a)] as const;
};
const ticks = Array.from({ length: 19 }, (_, i) => i * 10);
const arc = 'M 20 120 A 100 100 0 0 1 220 120';

/** منقلة تقيس المنجز من مهام اليوم. */
export default function Gauge({ value, total }: { value: number; total: number }) {
  const { t } = usePrefs();
  const ratio = total ? Math.min(value / total, 1) : 0;
  return (
    <div className="gauge" {...(total ? { role: 'meter', 'aria-label': t('doneCount'), 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': value } : {})}>
      <svg viewBox="0 0 240 128" aria-hidden="true">
        <path className="track" d={arc} />
        {ratio > 0 && <path className="fill" d={arc} pathLength={100} strokeDasharray={`${ratio * 100} 100`} />}
        <g className="ticks">
          {ticks.map((d) => {
            const [x1, y1] = point(d, d % 30 === 0 ? 72 : 80);
            const [x2, y2] = point(d, 87);
            return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <line className="needle" x1="120" y1="120" x2="54" y2="120" style={{ '--turn': `${ratio * 180}deg` } as CSSProperties} />
        <circle className="hub" cx="120" cy="120" r="7" />
      </svg>
      {total ? (
        <>
          <p className="gauge-value"><bdi>{value}</bdi> {t('of')} <bdi>{total}</bdi></p>
          <p className="gauge-label">{t('doneCount')}</p>
        </>
      ) : <p className="gauge-label">{t('noTodayTasks')}</p>}
    </div>
  );
}
