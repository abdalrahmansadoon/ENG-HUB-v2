import { Pause, Play, RotateCcw, Save, SkipForward, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { clock, limits, type Phase, type PomodoroSettings } from '../../lib/pomodoro';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { phaseKeys, usePomodoro, useRemaining } from './pomodoro';

const ticks = Array.from({ length: 60 }, (_, i) => i);

function TimerSettings({ onClose }: { onClose(): void }) {
  const { t } = usePrefs();
  const { settings, configure } = usePomodoro();
  const [draft, setDraft] = useState<PomodoroSettings>(settings);
  const number = (key: keyof typeof limits, label: Parameters<typeof t>[0]) => (
    <Field label={t(label)}>
      <input type="number" inputMode="numeric" required min={limits[key][0]} max={limits[key][1]} value={draft[key] || ''}
        onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
    </Field>
  );
  return (
    <Dialog title={t('timerSettings')} onClose={onClose}>
      <Form submitLabel={t('save')} onSubmit={async () => { configure(draft); onClose(); }}>
        <div className="two">
          {number('focus', 'focusMinutes')}
          {number('short', 'shortMinutes')}
          {number('long', 'longMinutes')}
          {number('every', 'longEvery')}
        </div>
        <label className="check"><input type="checkbox" checked={draft.auto} onChange={(e) => setDraft({ ...draft, auto: e.target.checked })} />{t('autoStart')}</label>
        <label className="check"><input type="checkbox" checked={draft.sound} onChange={(e) => setDraft({ ...draft, sound: e.target.checked })} />{t('timerSound')}</label>
      </Form>
    </Dialog>
  );
}

/** قرص المؤقت على سطح القص: ستون علامة وقوس يتناقص مع الوقت. */
export default function TimerCard() {
  const { t } = usePrefs();
  const pomodoro = usePomodoro();
  const { timer } = pomodoro;
  const left = useRemaining();
  const subjects = useSubjects();
  const [editing, setEditing] = useState(false);
  const running = timer.endsAt !== null;
  const started = timer.startedAt !== null;
  const ratio = timer.length ? left / timer.length : 0;
  return (
    <section className="timer mat" aria-label={t('focusTimer')}>
      <div className="phases" role="group" aria-label={t('timerPhase')}>
        {(['focus', 'short', 'long'] as Phase[]).map((p) => (
          <button key={p} type="button" aria-pressed={timer.phase === p} disabled={started && timer.phase !== p} onClick={() => timer.phase !== p && pomodoro.select(p)}>{t(phaseKeys[p])}</button>
        ))}
      </div>
      <div className="dial">
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <g className="ticks">{ticks.map((i) => <line key={i} x1="120" y1="6" x2="120" y2={i % 5 ? 12 : 18} transform={`rotate(${i * 6} 120 120)`} />)}</g>
          <circle className="track" cx="120" cy="120" r="90" />
          {ratio > 0 && <circle className="left" cx="120" cy="120" r="90" pathLength={100} strokeDasharray={`${ratio * 100} 100`} transform="rotate(-90 120 120)" />}
        </svg>
        <div className="dial-text">
          <b role="timer" aria-label={t('timeLeft')} dir="ltr">{clock(left)}</b>
          <span>{t(phaseKeys[timer.phase])}</span>
          <span>{t('roundsDone')}: <bdi>{timer.rounds}</bdi></span>
        </div>
      </div>
      <p className="sr" role="status">{t(running ? 'timerRunning' : started ? 'timerPaused' : 'timerReady')}</p>
      <div className="timer-actions">
        <button type="button" className="btn signal" onClick={running ? pomodoro.pause : pomodoro.start}>
          {running ? <Pause size={20} aria-hidden /> : <Play size={20} aria-hidden />}
          {t(running ? 'pauseTimer' : started ? 'resumeTimer' : 'startTimer')}
        </button>
        {started && timer.phase === 'focus' && <button type="button" className="btn on-mat" onClick={pomodoro.finish}><Save size={18} aria-hidden />{t('finishSave')}</button>}
        {started && <button type="button" className="btn on-mat" onClick={pomodoro.reset}><RotateCcw size={18} aria-hidden />{t('resetTimer')}</button>}
        <button type="button" className="btn on-mat" onClick={pomodoro.skip}><SkipForward size={18} aria-hidden />{t('skipPhase')}</button>
      </div>
      <div className="timer-fields">
        <select aria-label={t('subject')} value={timer.subjectId} onChange={(e) => pomodoro.describe(e.target.value, timer.goal)}>
          <option value="">{t('general')}</option>
          {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
        </select>
        <input aria-label={t('sessionGoal')} placeholder={t('goalPlaceholder')} maxLength={200} value={timer.goal} onChange={(e) => pomodoro.describe(timer.subjectId, e.target.value)} />
        <button type="button" className="btn on-mat" onClick={() => setEditing(true)}><SlidersHorizontal size={18} aria-hidden />{t('timerSettings')}</button>
      </div>
      {editing && <TimerSettings onClose={() => setEditing(false)} />}
    </section>
  );
}
