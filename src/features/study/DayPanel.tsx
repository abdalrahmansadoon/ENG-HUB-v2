import { Check, Flame, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSession, useStore } from '../../data/context';
import type { Goal } from '../../data/types';
import { formatDay, today, weekdayIndex, addDays } from '../../lib/dates';
import { daysEnding } from '../../lib/analytics';
import { weekStart } from '../../lib/planner';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form, Meter } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import type { Planner } from '../planner/usePlanner';

export const dayName = (n: number, lang: string) =>
  new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long' }).format(new Date(2026, 0, 4 + n)); // 4 يناير 2026 أحد

function PlanSettings({ plan, onClose }: { plan: Planner['plan']; onClose(): void }) {
  const store = useStore();
  const { user } = useSession();
  const { t, lang } = usePrefs();
  const { run, toast } = useFeedback();
  const [target, setTarget] = useState(String(plan.target));
  const [rest, setRest] = useState(plan.rest);
  const first = weekdayIndex(weekStart(today()));
  return (
    <Dialog title={t('studySettings')} onClose={onClose}>
      <Form submitLabel={t('save')} onSubmit={async () => {
        if (rest.length > 6) { toast('restTooMany', true); return; }
        if (await run(() => store.set(`users/${user.uid}/settings/planner`, { target: Number(target), rest }), 'saved')) onClose();
      }}>
        <Field label={t('dailyTarget')}><input type="number" inputMode="numeric" required min={5} max={720} step={5} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <fieldset>
          <legend>{t('restDays')}</legend>
          {Array.from({ length: 7 }, (_, i) => (first + i) % 7).map((n) => (
            <label key={n} className="check">
              <input type="checkbox" checked={rest.includes(n)} onChange={(e) => setRest(e.target.checked ? [...rest, n] : rest.filter((x) => x !== n))} />{dayName(n, lang)}
            </label>
          ))}
          <p className="muted">{t('restNote')}</p>
        </fieldset>
      </Form>
    </Dialog>
  );
}

/** هدف اليوم وسلسلة الأيام المحققة. */
export function StreakCard({ planner }: { planner: Planner }) {
  const { t, lang } = usePrefs();
  const [editing, setEditing] = useState(false);
  const now = today();
  const { plan, minutes, met, streak } = planner;
  const done = minutes[now] ?? 0;
  return (
    <section className="card pad">
      <div className="group-head">
        <h2>{t('dailyGoal')}</h2>
        <button type="button" className="icon-btn plain" aria-label={t('studySettings')} onClick={() => setEditing(true)}><Settings2 size={18} aria-hidden /></button>
      </div>
      <Meter value={done} total={plan.target} label={t('minutesToday')} />
      <div className="streak">
        <Flame size={28} aria-hidden />
        <p><b><bdi>{streak}</bdi></b><span>{t('streakDays')}</span></p>
      </div>
      <ol className="day-strip" aria-label={t('lastDays')}>
        {daysEnding(now, 14).map((day) => {
          const state = met(day) ? 'met' : plan.rest.includes(weekdayIndex(day)) ? 'rest' : day === now ? 'open' : 'miss';
          const label = `${formatDay(day, lang)}: ${t(state === 'met' ? 'dayMet' : state === 'rest' ? 'dayRest' : state === 'open' ? 'dayOpen' : 'dayMiss')}`;
          return <li key={day} className={state} title={label}>{state === 'met' && <Check size={12} aria-hidden />}<span className="sr">{label}</span></li>;
        })}
      </ol>
      <p className="muted">{t('streakNote')}</p>
      {editing && <PlanSettings plan={plan} onClose={() => setEditing(false)} />}
    </section>
  );
}

const MAX_GOALS = 12;

/** أهداف اليوم: قائمة قصيرة يشطبها العضو. */
export function GoalsCard({ planner }: { planner: Planner }) {
  const store = useStore();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const [text, setText] = useState('');
  const now = today();
  const items = planner.goalsOn(now)?.items ?? [];
  const carried = (planner.goalsOn(addDays(now, -1))?.items ?? []).filter((g) => !g.done && !items.some((x) => x.text === g.text));
  const save = (next: Goal[]) => run(() => store.set(`users/${user.uid}/goals/${now}`, { date: now, items: next.slice(0, MAX_GOALS) }));
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || items.length >= MAX_GOALS) return;
    void save([...items, { text: text.trim().slice(0, 140), done: false }]);
    setText('');
  };
  return (
    <section className="card pad">
      <div className="group-head"><h2>{t('todayGoals')}</h2>{items.length > 0 && <span><bdi>{items.filter((g) => g.done).length}/{items.length}</bdi></span>}</div>
      {!items.length && <p className="muted">{t('noGoals')}</p>}
      {items.length > 0 && <ul className="goals">{items.map((g, i) => (
        <li key={`${i}-${g.text}`}>
          <label className="check"><input type="checkbox" checked={g.done} onChange={(e) => save(items.map((x, n) => (n === i ? { ...x, done: e.target.checked } : x)))} /><span className={g.done ? 'struck' : undefined}>{g.text}</span></label>
          <button type="button" className="icon-btn plain" aria-label={`${t('delete')}: ${g.text}`} onClick={() => save(items.filter((_, n) => n !== i))}><Trash2 size={16} aria-hidden /></button>
        </li>
      ))}</ul>}
      {items.length < MAX_GOALS && <form className="reply-box" onSubmit={add}>
        <input aria-label={t('newGoal')} placeholder={t('newGoal')} maxLength={140} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="icon-btn" disabled={!text.trim()} aria-label={t('addGoal')}><Plus size={20} aria-hidden /></button>
      </form>}
      {carried.length > 0 && <button type="button" className="text-btn" onClick={() => save([...items, ...carried])}><span>{t('carryGoals')} (<bdi>{carried.length}</bdi>)</span></button>}
    </section>
  );
}
