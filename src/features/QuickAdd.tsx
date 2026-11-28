import { BookPlus, ClipboardPlus, ListPlus, Megaphone, Plus } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../data/context';
import { Dialog } from '../ui/kit';
import { usePrefs } from '../ui/prefs';
import { savedTerm } from './subjects/terms';
import { useSubjects } from './useSubjects';

const TaskForm = lazy(() => import('./tasks/TaskForm'));
const QuizForm = lazy(() => import('./quizzes/QuizForm'));
const SubjectForm = lazy(() => import('./subjects/SubjectForm'));
const AnnouncementForm = lazy(() => import('./announcements/AnnouncementForm'));

type Choice = 'menu' | 'task' | 'quiz' | 'subject' | 'announcement';

/** المادة الجديدة تُضاف آخر ترتيب الترم المختار. */
function NewSubject({ onClose }: { onClose(): void }) {
  const subjects = useSubjects();
  const [year, term] = savedTerm();
  if (subjects.loading) return null;
  return <SubjectForm year={year} term={term} order={Math.max(0, ...subjects.data.map((s) => s.order)) + 1} onClose={onClose} />;
}

/** زر الإضافة السريعة للمشرف، من أي صفحة. */
export default function QuickAdd() {
  const { t } = usePrefs();
  const { rules3 } = useSession();
  const [open, setOpen] = useState<Choice | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <button className="btn primary small" aria-label={t('quickAdd')} onClick={() => setOpen('menu')}><Plus size={20} aria-hidden /><span aria-hidden="true">{t('add')}</span></button>
      {/* النوافذ خارج الشريط العلوي حتى لا ترث تموضعه ولا دلالته. */}
      {createPortal(<>
        {open === 'menu' && (
          <Dialog title={t('quickAdd')} onClose={close}>
            <div className="menu">
              <button className="btn" onClick={() => setOpen('task')}><ListPlus size={20} aria-hidden />{t('newTask')}</button>
              <button className="btn" onClick={() => setOpen('quiz')}><ClipboardPlus size={20} aria-hidden />{t('newQuiz')}</button>
              <button className="btn" onClick={() => setOpen('subject')}><BookPlus size={20} aria-hidden />{t('addSubject')}</button>
              {rules3 && <button className="btn" onClick={() => setOpen('announcement')}><Megaphone size={20} aria-hidden />{t('newAnnouncement')}</button>}
            </div>
          </Dialog>
        )}
        <Suspense fallback={null}>
          {open === 'task' && <TaskForm onClose={close} />}
          {open === 'quiz' && <QuizForm subjectId="" onClose={close} />}
          {open === 'subject' && <NewSubject onClose={close} />}
          {open === 'announcement' && <AnnouncementForm onClose={close} />}
        </Suspense>
      </>, document.body)}
    </>
  );
}
