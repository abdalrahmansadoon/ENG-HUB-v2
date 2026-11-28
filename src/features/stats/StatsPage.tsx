import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../data/context';
import { formatDay, today } from '../../lib/dates';
import { PageHead } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import ClassStats from './ClassStats';
import MyStats from './MyStats';

export default function StatsPage() {
  const { isAdmin } = useSession();
  const { t, lang } = usePrefs();
  const [params, setParams] = useSearchParams();
  const period = params.get('days') === '30' ? 30 : 7;
  const group = isAdmin && params.get('view') === 'class';
  const go = (days: number, view: boolean) => {
    const next: Record<string, string> = {};
    if (days === 30) next.days = '30';
    if (view) next.view = 'class';
    setParams(next, { replace: true });
  };
  return (
    <>
      <PageHead title={t('stats')}><p>{formatDay(today(), lang)}</p></PageHead>
      <div className="stat-switches no-print">
        {isAdmin && <div className="segmented view-switch" role="group" aria-label={t('statsViews')}>
          <button aria-pressed={!group} onClick={() => go(period, false)}>{t('myStats')}</button>
          <button aria-pressed={group} onClick={() => go(period, true)}>{t('classStats')}</button>
        </div>}
        <div className="segmented view-switch" role="group" aria-label={t('period')}>
          <button aria-pressed={period === 7} onClick={() => go(7, group)}>{t('last7')}</button>
          <button aria-pressed={period === 30} onClick={() => go(30, group)}>{t('last30')}</button>
        </div>
      </div>
      <p className="print-only">{t(period === 7 ? 'last7' : 'last30')}</p>
      {group ? <ClassStats period={period} /> : <MyStats period={period} />}
    </>
  );
}
