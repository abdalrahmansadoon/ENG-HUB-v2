import { ClipboardList, FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCollection, useSession } from '../../data/context';
import type { Quiz } from '../../data/types';
import { Empty, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import QuizForm from './QuizForm';

export default function QuizzesPage() {
  const { isAdmin } = useSession();
  const { t } = usePrefs();
  const subjects = useSubjects();
  const quizzes = useCollection<Quiz>('quizzes', isAdmin ? {} : { where: ['published', '==', true] });
  const [params, setParams] = useSearchParams();
  const filter = params.get('subject') ?? '';
  const [adding, setAdding] = useState(false);
  const shown = quizzes.data.filter((q) => !filter || q.subjectId === filter).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <>
      <PageHead title={t('quizzes')}>{isAdmin && <button className="btn tonal small" onClick={() => setAdding(true)}><Plus size={18} aria-hidden />{t('newQuiz')}</button>}</PageHead>
      <div className="filters">
        <select aria-label={t('subject')} value={filter} onChange={(e) => setParams(e.target.value ? { subject: e.target.value } : {}, { replace: true })}>
          <option value="">{t('allSubjects')}</option>
          {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
        </select>
      </div>
      <Status loading={quizzes.loading} error={quizzes.error} />
      {!quizzes.loading && !quizzes.error && !shown.length && <Empty title={t('noQuizzes')} />}
      {shown.length > 0 && <ul className="card">
        {shown.map((q) => (
          <li key={q.id}>
            <Link to={`/quizzes/${q.id}`} className="row link">
              <span className={`tile tone-${subjects.tone(q.subjectId)}`}>{q.kind === 'pdf' ? <FileText size={22} aria-hidden /> : <ClipboardList size={22} aria-hidden />}</span>
              <span className="row-main"><strong>{q.title}</strong>
                <span className="meta"><span>{subjects.nameOf(q.subjectId)}</span><span>{q.kind === 'pdf' ? t('pdf') : <>{t('questions')}: <bdi>{q.questions.length}</bdi></>}</span></span>
              </span>
              {isAdmin && <span className={`tag ${q.published ? 'done' : ''}`}>{t(q.published ? 'published' : 'draft')}</span>}
            </Link>
          </li>
        ))}
      </ul>}
      {adding && <QuizForm subjectId={filter} onClose={() => setAdding(false)} />}
    </>
  );
}
