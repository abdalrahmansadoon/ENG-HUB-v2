import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StudySession } from '../../data/types';
import { today } from '../../lib/dates';
import { Empty, PageHead, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import { usePlanner } from '../planner/usePlanner';
import { GoalsCard, StreakCard } from './DayPanel';
import PlanView from './PlanView';
import SessionForm from './SessionForm';
import SessionList from './SessionList';
import TimerCard from './TimerCard';

export default function StudyPage() {
  const { t } = usePrefs();
  const planner = usePlanner();
  const [params, setParams] = useSearchParams();
  const plan = params.get('tab') === 'plan';
  const [form, setForm] = useState<{ session?: StudySession; date?: string } | null>(null);
  const now = today();
  const todays = planner.sessions.filter((s) => s.date === now);
  const open = (session: StudySession) => setForm({ session });
  const data = (content: () => ReactNode) => (
    <NeedsRules>
      {planner.loading || planner.error ? <Status loading={planner.loading} error={planner.error} /> : content()}
    </NeedsRules>
  );
  return (
    <>
      <PageHead title={t('study')} />
      <div className="segmented view-switch" role="group" aria-label={t('studyViews')}>
        <button aria-pressed={!plan} onClick={() => setParams({}, { replace: true })}>{t('viewToday')}</button>
        <button aria-pressed={plan} onClick={() => setParams({ tab: 'plan' }, { replace: true })}>{t('viewPlan')}</button>
      </div>
      {plan ? data(() => <PlanView sessions={planner.sessions} onOpen={open} onAdd={(date) => setForm({ date })} />) : (
        <div className="split cols">
          <div>
            <TimerCard />
            {data(() => (
              <section className="group">
                <div className="group-head">
                  <h2>{t('todaySessions')}</h2>
                  <button type="button" className="text-btn" onClick={() => setForm({})}><Plus size={18} aria-hidden />{t('addSession')}</button>
                </div>
                {todays.length ? <SessionList sessions={todays} onOpen={open} /> : <Empty title={t('noSessions')}><span>{t('noSessionsHint')}</span></Empty>}
              </section>
            ))}
          </div>
          <div>{data(() => <><StreakCard planner={planner} /><GoalsCard planner={planner} /></>)}</div>
        </div>
      )}
      {form && <SessionForm session={form.session} preset={form.date ? { date: form.date } : undefined} onClose={() => setForm(null)} />}
    </>
  );
}
