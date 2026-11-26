import { Check, ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { AnswerKey, Attempt, Quiz } from '../../data/types';
import { score } from '../../lib/quiz';
import { safeUrl } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { BackLink, Dimension, Empty, Form, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import QuizForm from './QuizForm';

export default function QuizPage() {
  const { quizId = '' } = useParams();
  const quiz = useDoc<Quiz>(`quizzes/${quizId}`);
  const { t } = usePrefs();
  if (quiz.loading || !quiz.data) return <><BackLink to="/quizzes" />{quiz.loading ? <Status loading /> : <Empty title={t('notFound')} />}</>;
  return <QuizView key={quizId} quiz={quiz.data} />;
}

function QuizView({ quiz }: { quiz: Quiz }) {
  const store = useStore();
  const navigate = useNavigate();
  const { isAdmin } = useSession();
  const { t } = usePrefs();
  const { run, confirm, toast } = useFeedback();
  const subjects = useSubjects();
  const base = `quizzes/${quiz.id}`;
  const [editing, setEditing] = useState(false);
  const key = useDoc<AnswerKey>(isAdmin ? `${base}/private/key` : null);
  const attempts = useCollection<Attempt>(isAdmin ? `${base}/attempts` : null);
  const edit = () => (attempts.data.length ? toast('editLocked', true) : setEditing(true));
  const remove = async () => {
    if (!(await confirm('confirmQuiz'))) return;
    const ok = await run(async () => {
      for (const a of await store.list(`${base}/attempts`)) await store.remove(`${base}/attempts/${a.id}`);
      await store.remove(`${base}/private/key`);
      await store.remove(base);
    }, 'deleted');
    if (ok) navigate('/quizzes');
  };
  return (
    <>
      <BackLink to="/quizzes" />
      <PageHead title={quiz.title}>
        {isAdmin && <div className="tools">
          <button className="btn" onClick={() => run(() => store.update(base, { published: !quiz.published }), 'saved')}>{t(quiz.published ? 'unpublish' : 'publish')}</button>
          <button className="icon-btn" aria-label={t('editQuiz')} onClick={edit} disabled={attempts.loading || !key.data}><Pencil size={18} /></button>
          <button className="icon-btn danger" aria-label={t('delete')} onClick={remove}><Trash2 size={18} /></button>
        </div>}
      </PageHead>
      <p className="meta"><span>{subjects.nameOf(quiz.subjectId)}</span></p>
      {quiz.kind === 'pdf'
        ? <a className="btn primary" href={safeUrl(quiz.pdfUrl) || undefined} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} aria-hidden />{t('openPdf')}</a>
        : isAdmin ? <AdminView quiz={quiz} /> : <Take key={quiz.questions.length} quiz={quiz} />}
      {editing && key.data && <QuizForm quiz={quiz} subjectId={quiz.subjectId} answers={key.data.answers} onClose={() => setEditing(false)} />}
    </>
  );
}

function Take({ quiz }: { quiz: Quiz }) {
  const store = useStore();
  const { user, name } = useSession();
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const path = `quizzes/${quiz.id}/attempts/${user.uid}`;
  const attempt = useDoc<Attempt>(path);
  const [saving, setSaving] = useState(false);
  // لا نطلب مفتاح الإجابة إلا بعد أن يؤكد الخادم المحاولة.
  const key = useDoc<AnswerKey>(attempt.data && !saving ? `quizzes/${quiz.id}/private/key` : null);
  const [answers, setAnswers] = useState<number[]>(() => quiz.questions.map(() => -1));
  if (attempt.loading || attempt.error) return <Status loading={attempt.loading} error={attempt.error} />;

  const submit = async () => {
    if (answers.some((a) => a < 0)) { toast('answerAll', true); return; }
    if (!navigator.onLine) { toast('needOnline', true); return; }
    setSaving(true);
    await run(() => store.set(path, { answers, name, submittedAt: NOW }), 'saved');
    setSaving(false);
  };

  if (attempt.data && !saving) {
    if (key.data) return <Review quiz={quiz} chosen={attempt.data.answers} correct={key.data.answers} />;
    return key.loading ? <Status loading /> : <Status error={key.error ?? new Error('missing-key')} />;
  }
  return (
    <Form onSubmit={submit} submitLabel={t('submit')}>
      <p className="muted">{t('oneAttempt')}</p>
      {quiz.questions.map((q, n) => (
        <fieldset key={n} className="sheet question">
          <legend className="sr">{t('question')} {n + 1}</legend>
          <p className="q-text"><bdi className="q-num">{n + 1}</bdi><span dir="auto">{q.text}</span></p>
          {q.imageUrl && <img src={q.imageUrl} alt={`${t('question')} ${n + 1}`} />}
          {q.options.map((o, i) => (
            <label key={i} className="answer"><input type="radio" name={`q${n}`} checked={answers[n] === i} onChange={() => setAnswers(answers.map((a, j) => (j === n ? i : a)))} /><span dir="auto">{o}</span></label>
          ))}
        </fieldset>
      ))}
    </Form>
  );
}

function Review({ quiz, chosen, correct }: { quiz: Quiz; chosen: number[]; correct: number[] }) {
  const { t } = usePrefs();
  return (
    <>
      <section className="sheet pad"><h2>{t('yourScore')}</h2><Dimension value={score(chosen, correct)} total={correct.length} label={t('yourScore')} /></section>
      {quiz.questions.map((q, n) => (
        <div key={n} className="sheet question">
          <p className="q-text"><bdi className="q-num">{n + 1}</bdi><span dir="auto">{q.text}</span></p>
          {q.imageUrl && <img src={q.imageUrl} alt={`${t('question')} ${n + 1}`} />}
          {q.options.map((o, i) => {
            const state = i === correct[n] ? 'right' : i === chosen[n] ? 'wrong' : '';
            return <p key={i} className={`answer ${state}`}>{state === 'right' ? <Check size={18} aria-label={t('correct')} /> : state === 'wrong' ? <X size={18} aria-label={t('wrongAnswer')} /> : <span className="dot" />}<span dir="auto">{o}</span></p>;
          })}
        </div>
      ))}
    </>
  );
}

function AdminView({ quiz }: { quiz: Quiz }) {
  const store = useStore();
  const { t } = usePrefs();
  const { run, confirm } = useFeedback();
  const key = useDoc<AnswerKey>(`quizzes/${quiz.id}/private/key`);
  const attempts = useCollection<Attempt>(`quizzes/${quiz.id}/attempts`);
  if (key.loading || !key.data) return <Status loading={key.loading} error={key.error} />;
  const answers = key.data.answers;
  return (
    <section className="group">
      <h2>{t('results')}</h2>
      <Status loading={attempts.loading} error={attempts.error} />
      {!attempts.loading && !attempts.data.length && <p className="muted">{t('noResults')}</p>}
      {attempts.data.length > 0 && <ul className="sheet list">{attempts.data.map((a) => (
        <li key={a.id} className="row plain"><span className="row-main">{a.name}</span><bdi className="dim-value">{score(a.answers, answers)} / {answers.length}</bdi>
          <button className="text-btn" onClick={async () => { if (await confirm('confirmRetry')) await run(() => store.remove(`quizzes/${quiz.id}/attempts/${a.id}`), 'saved'); }}>{t('allowRetry')}</button></li>
      ))}</ul>}
    </section>
  );
}
