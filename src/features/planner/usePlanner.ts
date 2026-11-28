import { useMemo } from 'react';
import { useCollection, useDoc, useSession } from '../../data/context';
import type { DayGoals, PlannerSettings, StudySession } from '../../data/types';
import { addDays, today } from '../../lib/dates';
import { HISTORY_DAYS, achieved, bySchedule, defaultPlanner, minutesByDay, streak } from '../../lib/planner';

/** جلسات المذاكرة (آخر 90 يوماً والقادمة). */
export function useSessions() {
  const { user, rules3 } = useSession();
  const since = addDays(today(), -HISTORY_DAYS);
  const result = useCollection<StudySession>(rules3 ? `users/${user.uid}/sessions` : null, { where: ['date', '>=', since] });
  const data = useMemo(() => [...result.data].sort(bySchedule), [result.data]);
  return { ...result, data };
}

/** الجلسات والأهداف وإعدادات اليوم وسلسلة الأيام المحققة. */
export function usePlanner() {
  const { user, rules3 } = useSession();
  const root = rules3 ? `users/${user.uid}` : null;
  const sessions = useSessions();
  const since = addDays(today(), -HISTORY_DAYS);
  const goals = useCollection<DayGoals>(root && `${root}/goals`, { where: ['date', '>=', since] });
  const settings = useDoc<PlannerSettings>(root && `${root}/settings/planner`);
  const plan = { target: settings.data?.target ?? defaultPlanner.target, rest: settings.data?.rest ?? defaultPlanner.rest };
  const minutes = minutesByDay(sessions.data);
  const goalsOn = (day: string) => goals.data.find((g) => g.date === day);
  const met = (day: string) => achieved(minutes[day] ?? 0, goalsOn(day), plan.target);
  return {
    sessions: sessions.data, minutes, plan, goalsOn, met, streak: streak(today(), met, plan.rest),
    // إعدادات لم تُحفظ بعد لا تؤخر العرض.
    loading: sessions.loading || goals.loading,
    error: sessions.error ?? goals.error ?? settings.error,
  };
}
export type Planner = ReturnType<typeof usePlanner>;
