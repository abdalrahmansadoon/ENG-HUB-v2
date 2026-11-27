import { formatDay, today, weekday } from '../../lib/dates';
import type { DayActivity } from '../../lib/home';
import { usePrefs } from '../../ui/prefs';

/** أعمدة مكدسة: عدد المهام المنجزة والمحتوى المذاكر لكل يوم. */
export default function ActivityChart({ days }: { days: DayActivity[] }) {
  const { t, lang } = usePrefs();
  const max = Math.max(1, ...days.map((d) => d.done + d.studied));
  const empty = days.every((d) => !d.done && !d.studied);
  const now = today();
  if (empty) return <div className="empty"><span>{t('noActivity')}</span></div>;
  const height = (n: number) => ({ height: `${(n / max) * 7.25}rem` });
  return (
    <div className="card chart">
      <div className="legend">
        <span><i className="s1" />{t('actDone')}</span>
        <span><i className="s2" />{t('actStudied')}</span>
      </div>
      <ul className="bars">
        {days.map((d) => (
          <li key={d.day}>
            <button type="button" className="bar" data-today={d.day === now || undefined}
              aria-label={`${formatDay(d.day, lang)}: ${t('actDone')} ${d.done}، ${t('actStudied')} ${d.studied}`}>
              <span className="bar-stack">
                {d.done + d.studied > 0 && <b>{d.done + d.studied}</b>}
                {d.studied > 0 && <i className="s2" style={height(d.studied)} />}
                {d.done > 0 && <i className="s1" style={height(d.done)} />}
              </span>
              <span>{lang === 'ar' ? weekday(d.day, lang).replace(/^ال/, '') : weekday(d.day, lang, 'short')}</span>
              <span className="tip" aria-hidden="true">
                <strong>{formatDay(d.day, lang)}</strong>
                <span>{t('actDone')}: <bdi>{d.done}</bdi></span>
                <span>{t('actStudied')}: <bdi>{d.studied}</bdi></span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <details>
        <summary>{t('asTable')}</summary>
        <table>
          <thead><tr><th scope="col">{t('day')}</th><th scope="col">{t('actDone')}</th><th scope="col">{t('actStudied')}</th></tr></thead>
          <tbody>{days.map((d) => <tr key={d.day}><th scope="row">{formatDay(d.day, lang)}</th><td>{d.done}</td><td>{d.studied}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
