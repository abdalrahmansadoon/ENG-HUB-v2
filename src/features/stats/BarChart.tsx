import { formatDay, formatDate, today, weekday } from '../../lib/dates';
import type { DayValue } from '../../lib/analytics';
import { usePrefs } from '../../ui/prefs';

interface Props {
  /** اسم ما يقاس، وهو عنوان المخطط */
  label: string;
  days: DayValue[];
  tone?: 's1' | 's2';
  empty: string;
}

/** أعمدة يومية لقياس واحد: تلميح عند المرور أو التركيز، وعرض كجدول. */
export default function BarChart({ label, days, tone = 's1', empty }: Props) {
  const { t, lang } = usePrefs();
  const max = Math.max(1, ...days.map((d) => d.value));
  const total = days.reduce((n, d) => n + d.value, 0);
  const dense = days.length > 10;
  const now = today();
  return (
    <figure className="card chart">
      <figcaption><span>{label}</span><b><bdi>{total}</bdi></b></figcaption>
      {!total ? <p className="muted">{empty}</p> : <>
        <ul className={dense ? 'bars dense' : 'bars'} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d, i) => (
            <li key={d.day} className={i < days.length * 0.25 ? 'tip-start' : i >= days.length * 0.75 ? 'tip-end' : undefined}>
              <button type="button" className="bar" data-today={d.day === now || undefined} aria-label={`${formatDay(d.day, lang)}: ${label} ${d.value}`}>
                <span className="bar-stack">
                  {d.value > 0 && !dense && <b>{d.value}</b>}
                  {d.value > 0 && <i className={tone} style={{ height: `${(d.value / max) * 6.5}rem` }} />}
                </span>
                <span>{!dense ? (lang === 'ar' ? weekday(d.day, lang).replace(/^ال/, '') : weekday(d.day, lang, 'short'))
                  : (days.length - 1 - i) % 7 === 0 ? <bdi>{Number(d.day.slice(8))}</bdi> : ' '}</span>
                <span className="tip" aria-hidden="true"><strong>{formatDay(d.day, lang)}</strong><span>{label}: <bdi>{d.value}</bdi></span></span>
              </button>
            </li>
          ))}
        </ul>
        <details>
          <summary>{t('asTable')}</summary>
          <table>
            <thead><tr><th scope="col">{t('day')}</th><th scope="col">{label}</th></tr></thead>
            <tbody>{days.map((d) => <tr key={d.day}><th scope="row">{formatDate(d.day, lang)}</th><td>{d.value}</td></tr>)}</tbody>
          </table>
        </details>
      </>}
    </figure>
  );
}
