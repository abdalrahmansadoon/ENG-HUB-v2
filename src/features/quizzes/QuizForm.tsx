import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Question } from '../../data/types';
import { safeUrl } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import UploadField from '../../ui/UploadField';
import { useSubjects } from '../useSubjects';

type Draft = Question & { correct: number; key: number };
let nextKey = 0;
const blank = (): Draft => ({ text: '', imageUrl: '', options: ['', ''], correct: 0, key: ++nextKey });

export default function QuizForm({ subjectId: initial, onClose }: { subjectId: string; onClose(): void }) {
  const store = useStore();
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const subjects = useSubjects();
  const [title, setTitle] = useState('');
  const [subjectId, setSubject] = useState(initial);
  const [kind, setKind] = useState<'mcq' | 'pdf'>('mcq');
  const [pdfUrl, setPdf] = useState('');
  const [questions, setQuestions] = useState<Draft[]>(() => [blank()]);
  const [uploads, setUploads] = useState(0);
  const busy = (b: boolean) => setUploads((n) => n + (b ? 1 : -1));
  const patch = (key: number, change: Partial<Draft>) => setQuestions((all) => all.map((q) => (q.key === key ? { ...q, ...change } : q)));

  const save = async () => {
    const mcq = kind === 'mcq';
    if (!title.trim() || (mcq && questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim())))) { toast('quizInvalid', true); return; }
    if (!mcq && !safeUrl(pdfUrl)) { toast('errUrl', true); return; }
    const id = store.newId();
    const quiz = {
      title: title.trim(), subjectId, kind, pdfUrl: mcq ? '' : safeUrl(pdfUrl), published: false, createdAt: NOW,
      questions: mcq ? questions.map((q) => ({ text: q.text.trim(), imageUrl: q.imageUrl, options: q.options.map((o) => o.trim()) })) : [],
    };
    // الأسئلة ومفتاح الإجابة يُكتبان معاً أو لا يُكتب شيء.
    if (await run(() => store.setMany([[`quizzes/${id}`, quiz], [`quizzes/${id}/private/key`, { answers: mcq ? questions.map((q) => q.correct) : [] }]]), 'savedDraft')) onClose();
  };

  return (
    <Dialog title={t('newQuiz')} onClose={onClose}>
      <Form onSubmit={save} submitLabel={t('save')} disabled={uploads > 0}>
        <Field label={t('title')}><input required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="two">
          <Field label={t('subject')}><select value={subjectId} onChange={(e) => setSubject(e.target.value)}><option value="">{t('general')}</option>{subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}</select></Field>
          <Field label={t('quizType')}><select value={kind} onChange={(e) => setKind(e.target.value as 'mcq' | 'pdf')}><option value="mcq">{t('mcq')}</option><option value="pdf">{t('pdf')}</option></select></Field>
        </div>
        {kind === 'pdf' ? (
          <>
            <Field label={t('link')}><input type="url" dir="ltr" placeholder="https://" value={pdfUrl} onChange={(e) => setPdf(e.target.value)} /></Field>
            <UploadField label={t('orUpload')} accept="application/pdf" onBusy={busy} onUploaded={setPdf} />
          </>
        ) : (
          <>
            {questions.map((q, n) => (
              <fieldset key={q.key}>
                <legend>{t('question')} {n + 1}</legend>
                <textarea rows={2} maxLength={1000} aria-label={`${t('question')} ${n + 1}`} value={q.text} onChange={(e) => patch(q.key, { text: e.target.value })} />
                <UploadField label={`${t('image')} (${t('optional')})`} accept="image/*" onBusy={busy} onUploaded={(url) => patch(q.key, { imageUrl: url })} />
                {q.imageUrl && <img src={q.imageUrl} alt={t('image')} className="thumb" />}
                <p className="muted">{t('pickCorrect')}</p>
                {q.options.map((o, i) => (
                  <div key={i} className="option-edit">
                    <input type="radio" name={`correct-${q.key}`} checked={q.correct === i} onChange={() => patch(q.key, { correct: i })} aria-label={`${t('correct')}: ${t('option')} ${i + 1}`} />
                    <input maxLength={300} aria-label={`${t('option')} ${i + 1}`} placeholder={`${t('option')} ${i + 1}`} value={o}
                      onChange={(e) => patch(q.key, { options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} />
                    {q.options.length > 2 && <button type="button" className="icon-btn" aria-label={t('removeOption')}
                      onClick={() => patch(q.key, { options: q.options.filter((_, j) => j !== i), correct: q.correct === i ? 0 : q.correct - (q.correct > i ? 1 : 0) })}><Trash2 size={16} /></button>}
                  </div>
                ))}
                <div className="actions">
                  {q.options.length < 6 && <button type="button" className="text-btn" onClick={() => patch(q.key, { options: [...q.options, ''] })}>{t('addOption')}</button>}
                  {questions.length > 1 && <button type="button" className="text-btn danger" onClick={() => setQuestions(questions.filter((x) => x.key !== q.key))}>{t('removeQuestion')}</button>}
                </div>
              </fieldset>
            ))}
            {questions.length < 50 && <button type="button" className="btn" onClick={() => setQuestions([...questions, blank()])}><Plus size={16} aria-hidden />{t('addQuestion')}</button>}
          </>
        )}
      </Form>
    </Dialog>
  );
}
