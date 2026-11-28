import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import { clockKey, toKey } from '../../lib/dates';
import * as lib from '../../lib/pomodoro';
import type { Phase, PomodoroSettings, Timer } from '../../lib/pomodoro';
import { notify } from '../../lib/pwa';
import { useFeedback } from '../../ui/feedback';
import { usePrefs } from '../../ui/prefs';

interface Saved { timer: Timer; settings: PomodoroSettings }
interface Value extends Saved {
  start(): void; pause(): void;
  skip(): void;
  /** يحفظ ما ذوكر من المرحلة الحالية وينهيها */
  finish(): void;
  reset(): void;
  select(phase: Phase): void;
  describe(subjectId: string, goal: string): void;
  configure(settings: PomodoroSettings): void;
}
const Context = createContext<Value | null>(null);
export const usePomodoro = () => useContext(Context)!;
export const phaseKeys = { focus: 'phFocus', short: 'phShort', long: 'phLong' } as const;

function load(key: string): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null') as Saved | null;
    const settings = lib.normalizeSettings(raw?.settings);
    const timer = raw?.timer;
    const sound = timer && ['focus', 'short', 'long'].includes(timer.phase) && Number.isFinite(timer.left) && Number.isFinite(timer.length);
    return { settings, timer: sound ? timer : lib.fresh(settings) };
  } catch { return { settings: lib.defaultPomodoro, timer: lib.fresh(lib.defaultPomodoro) }; }
}

let audio: AudioContext | null = null;
/** المتصفح لا يسمح بالصوت إلا بعد ضغطة من المستخدم. */
const unlockAudio = () => { try { audio ??= new AudioContext(); void audio.resume(); } catch { /* غير مدعوم */ } };
function chime() {
  if (!audio) return;
  const from = audio.currentTime;
  [660, 880, 1100].forEach((frequency, i) => {
    const tone = audio!.createOscillator();
    const gain = audio!.createGain();
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, from + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.18, from + i * 0.22 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, from + i * 0.22 + 0.4);
    tone.connect(gain).connect(audio!.destination);
    tone.start(from + i * 0.22);
    tone.stop(from + i * 0.22 + 0.42);
  });
}

/** مؤقت واحد للتطبيق كله: يستمر عند تغيير الصفحة وإعادة تحميلها. */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { user, rules3 } = useSession();
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const key = `enghub.timer.v1:${user.uid}`;
  const [state, setState] = useState(() => load(key));
  const { timer, settings } = state;
  const ref = useRef(state);
  ref.current = state;
  const commit = useCallback((next: Partial<Saved>) => {
    const merged = { ...ref.current, ...next };
    ref.current = merged;
    setState(merged);
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* التخزين غير متاح */ }
  }, [key]);

  // تبويب آخر غيّر المؤقت.
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === key) setState(load(key)); };
    addEventListener('storage', sync);
    return () => removeEventListener('storage', sync);
  }, [key]);

  const record = useCallback((done: Timer, minutes: number) => {
    if (minutes < 1 || done.startedAt === null) return;
    if (!rules3) { toast('timerNotSaved', true); return; }
    // المعرف من وقت البدء، فلا تتكرر الجلسة إن أنهاها تبويبان.
    void run(() => store.set(`users/${user.uid}/sessions/timer-${done.startedAt}`, {
      subjectId: done.subjectId, taskId: '', date: toKey(new Date(done.startedAt!)), start: clockKey(done.startedAt!),
      planned: Math.round(done.length / 60_000), actual: minutes, goal: done.goal.slice(0, 200), notes: '', status: 'done', timer: true, createdAt: NOW,
    }), 'sessionSaved');
  }, [rules3, store, user.uid, run, toast]);

  useEffect(() => {
    if (timer.endsAt === null) return;
    const check = () => {
      const { timer: current, settings: options } = ref.current;
      const now = Date.now();
      if (current.endsAt === null || current.endsAt > now) return;
      // انتهت والتطبيق مغلق: نحسبها ولا نبدأ التالية وحدها.
      const stale = now - current.endsAt > 60_000;
      const next = lib.advance(current, options, true);
      commit({ timer: options.auto && !stale ? lib.start(next, now) : next });
      if (current.phase === 'focus') record(current, Math.round(current.length / 60_000));
      if (stale) return;
      if (options.sound) chime();
      void notify(t(current.phase === 'focus' ? 'focusOver' : 'breakOver'), { body: t(phaseKeys[next.phase]), tag: 'timer', data: { to: '/study' } });
    };
    const id = setTimeout(check, Math.max(0, timer.endsAt - Date.now()) + 50);
    // المؤقتات تتباطأ في الخلفية.
    document.addEventListener('visibilitychange', check);
    return () => { clearTimeout(id); document.removeEventListener('visibilitychange', check); };
  }, [timer.endsAt, commit, record, t]);

  const value: Value = {
    timer, settings,
    start: () => { unlockAudio(); commit({ timer: lib.start(ref.current.timer, Date.now()) }); },
    pause: () => commit({ timer: lib.pause(ref.current.timer, Date.now()) }),
    skip: () => commit({ timer: lib.advance(ref.current.timer, ref.current.settings, false) }),
    finish: () => {
      const current = ref.current.timer;
      const minutes = lib.focusedMinutes(current, Date.now());
      if (minutes < 1) { toast('tooShort', true); return; }
      commit({ timer: lib.advance(current, ref.current.settings, true) });
      record(current, minutes);
    },
    reset: () => { const c = ref.current.timer; commit({ timer: lib.fresh(ref.current.settings, c.phase, 0, c.subjectId, c.goal) }); },
    select: (phase) => { const c = ref.current.timer; commit({ timer: lib.fresh(ref.current.settings, phase, c.rounds, c.subjectId, c.goal) }); },
    describe: (subjectId, goal) => commit({ timer: { ...ref.current.timer, subjectId, goal } }),
    configure: (next) => {
      const c = ref.current.timer;
      // لا نغير مرحلة بدأت.
      commit({ settings: next, timer: c.startedAt === null ? lib.fresh(next, c.phase, c.rounds, c.subjectId, c.goal) : c });
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** الوقت المتبقي، يتحدث كل نصف ثانية أثناء التشغيل. */
export function useRemaining() {
  const { timer } = usePomodoro();
  const [, tick] = useState(0);
  useEffect(() => {
    if (timer.endsAt === null) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [timer.endsAt]);
  return lib.remaining(timer, Date.now());
}
