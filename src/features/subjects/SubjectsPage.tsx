import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCollection, useSession, useStore } from '../../data/context';
import { defaultSubjects } from '../../data/subjects';
import type { Item, Progress } from '../../data/types';
import { useFeedback } from '../../ui/feedback';
import { SubjectIcon } from '../../ui/icons';
import { Dimension, Empty, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import SubjectForm from './SubjectForm';
import { terms, years } from './terms';

export default function SubjectsPage() {
  const store = useStore();
  const { user, isAdmin } = useSession();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const subjects = useSubjects();
  const items = useCollection<Item>('items');
  const progress = useCollection<Progress>(`users/${user.uid}/progress`);
  const [params, setParams] = useSearchParams();
  const year = params.get('year') ?? 'prep';
  const term = params.get('term') ?? '1';
  const [adding, setAdding] = useState(false);
  const shown = subjects.data.filter((s) => s.year === year && s.term === term);
  const studied = new Set(progress.data.map((p) => p.id));
  const select = (key: string, value: string) => setParams({ year, term, [key]: value }, { replace: true });

  return (
    <>
      <PageHead title={t('subjects')}>
        {isAdmin && <button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} aria-hidden />{t('addSubject')}</button>}
      </PageHead>
      <div className="filters">
        <select aria-label={t('year')} value={year} onChange={(e) => select('year', e.target.value)}>{years.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}</select>
        <select aria-label={t('term')} value={term} onChange={(e) => select('term', e.target.value)}>{terms.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}</select>
      </div>
      <Status loading={subjects.loading} error={subjects.error ?? items.error} />
      {!subjects.loading && !subjects.error && !shown.length && (
        <Empty title={t('noSubjects')}>
          {isAdmin && year === 'prep' && term === '1' && <button className="btn primary"
            onClick={() => run(() => store.setMany(defaultSubjects.map(({ id, ...s }) => [`subjects/${id}`, s])), 'saved')}>{t('addDefaults')}</button>}
        </Empty>
      )}
      <ul className="drawers">
        {shown.map((s) => {
          const own = items.data.filter((i) => i.subjectId === s.id);
          return (
            <li key={s.id}>
              <Link to={`/subjects/${s.id}`} className="drawer">
                <span className="drawer-icon"><SubjectIcon name={s.icon} size={26} /></span>
                <strong>{subjects.label(s)}</strong>
                {own.length
                  ? <Dimension value={own.filter((i) => studied.has(i.id)).length} total={own.length} label={t('progress')} />
                  : <span className="drawer-note">{t('noItems')}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      {adding && <SubjectForm year={year} term={term} order={Math.max(0, ...subjects.data.map((s) => s.order)) + 1} onClose={() => setAdding(false)} />}
    </>
  );
}
