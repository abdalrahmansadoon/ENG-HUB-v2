export type Phase = 'focus' | 'short' | 'long';
export interface PomodoroSettings { focus: number; short: number; long: number; every: number; auto: boolean; sound: boolean }
export const defaultPomodoro: PomodoroSettings = { focus: 25, short: 5, long: 15, every: 4, auto: false, sound: true };
export const limits = { focus: [1, 180], short: [1, 60], long: [1, 90], every: [2, 8] } as const;

/** يقبل أي قيمة محفوظة ويعيد إعدادات سليمة. */
export function normalizeSettings(raw: unknown): PomodoroSettings {
  const value = (raw ?? {}) as Partial<Record<keyof PomodoroSettings, unknown>>;
  const number = (key: keyof typeof limits) => {
    const n = Math.round(Number(value[key]));
    return Number.isFinite(n) && n >= limits[key][0] && n <= limits[key][1] ? n : defaultPomodoro[key];
  };
  return {
    focus: number('focus'), short: number('short'), long: number('long'), every: number('every'),
    auto: value.auto === true, sound: value.sound !== false,
  };
}

export interface Timer {
  phase: Phase;
  /** وقت انتهاء المرحلة أثناء التشغيل */
  endsAt: number | null;
  /** المتبقي وهو متوقف */
  left: number;
  /** طول المرحلة الحالية */
  length: number;
  /** جلسات التركيز المكتملة منذ البدء */
  rounds: number;
  subjectId: string; goal: string;
  /** أول تشغيل للمرحلة الحالية */
  startedAt: number | null;
}

export function fresh(settings: PomodoroSettings, phase: Phase = 'focus', rounds = 0, subjectId = '', goal = ''): Timer {
  const length = settings[phase] * 60_000;
  return { phase, endsAt: null, left: length, length, rounds, subjectId, goal, startedAt: null };
}
export const remaining = (t: Timer, now: number) => (t.endsAt === null ? t.left : Math.max(0, t.endsAt - now));
export const start = (t: Timer, now: number): Timer => ({ ...t, endsAt: now + t.left, startedAt: t.startedAt ?? now });
export const pause = (t: Timer, now: number): Timer => ({ ...t, endsAt: null, left: remaining(t, now) });
export const focusedMinutes = (t: Timer, now: number) =>
  (t.phase === 'focus' && t.startedAt !== null ? Math.floor((t.length - remaining(t, now)) / 60_000) : 0);

/** المرحلة التالية بعد انتهاء الحالية أو تخطيها. التخطي لا يحتسب جلسة. */
export function advance(t: Timer, settings: PomodoroSettings, completed: boolean): Timer {
  const rounds = t.rounds + (completed && t.phase === 'focus' ? 1 : 0);
  const phase: Phase = t.phase !== 'focus' ? 'focus' : completed && rounds % settings.every === 0 ? 'long' : 'short';
  return fresh(settings, phase, rounds, t.subjectId, t.goal);
}

export const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
