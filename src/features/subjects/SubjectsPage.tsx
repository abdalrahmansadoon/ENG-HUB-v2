import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCollection, useSession, useStore } from '../../data/context';
import { defaultSubjects } from '../../data/subjects';
import type { Item, Progress } from '../../data/types';
import { itemKind } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { SubjectIcon } from '../../ui/icons';
import { Empty, Meter, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { toneOf } from '../../ui/tone';
import { useSubjects } from '../useSubjects';
import { KindIcon } from './KindIcon';
import SubjectForm from './SubjectForm';
import { rememberTerm, savedTerm, terms, years } from './terms';

export default function SubjectsPage() {
  const store = useStore();
  const { user, isAdmin } = useSession();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const subjects = useSubjects();
  const items = useCollection<Item>('items');
  const progress = useCollection<Progress>(`users/${user.uid}/progress`);
  const [params, setParams] = useSearchParams();
  const [savedYear, savedTermId] = savedTerm();
  const year = params.get('year') ?? savedYear;
  const term = params.get('term') ?? savedTermId;
  const [adding, setAdding] = useState(false);
  const shown = subjects.data.filter((s) => s.year === year && s.term === term);
  const studied = new Set(progress.data.map((p) => p.id));
  const [search, setSearch] = useState('');
  const needle = search.trim().toLocaleLowerCase();
  const matches = needle
    ? items.data.filter((i) => `${i.title} ${i.group}`.toLocaleLowerCase().includes(needle) && subjects.data.some((s) => s.id === i.subjectId))
    : [];
  const select = (key: 'year' | 'term', value: string) => {
    const next = { year, term, [key]: value };
    rememberTerm(next.year, next.term);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHead title={t('subjects')}>
        {isAdmin && <button className="btn tonal small" onClick={() => setAdding(true)}><Plus size={18} aria-hidden />{t('addSubject')}</button>}
      </PageHead>
      <label className="search">
        <Search size={20} aria-hidden />
        <input type="search" aria-label={t('searchContent')} placeholder={t('searchContent')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {needle ? (
        <>
          <Status loading={items.loading} error={items.error} />
          {!items.loading && !matches.length && <Empty title={t('noMatches')} />}
          {matches.length > 0 && <ul className="card">{matches.map((i) => (
            <li key={i.id}>
              <Link to={`/subjects/${i.subjectId}/items/${i.id}`} className="row link">
                <span className={`tile tone-${subjects.tone(i.subjectId)}`}><KindIcon kind={itemKind(i.url)} /></span>
                <span className="row-main"><strong>{i.title}</strong>
                  <span className="meta"><span>{subjects.nameOf(i.subjectId)}</span><span>{t(i.category)}</span>{i.group && <span>{i.group}</span>}</span></span>
              </Link>
            </li>
          ))}</ul>}
        </>
      ) : (
        <>
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
          {shown.length > 0 && <ul className="subjects">
            {shown.map((s) => {
              const own = items.data.filter((i) => i.subjectId === s.id);
              return (
                <li key={s.id}>
                  <Link to={`/subjects/${s.id}`} className={`card subject-card tone-${toneOf(s.order)}`}>
                    <span className="tile"><SubjectIcon name={s.icon} size={24} /></span>
                    <strong>{subjects.label(s)}</strong>
                    {own.length
                      ? <Meter value={own.filter((i) => studied.has(i.id)).length} total={own.length} label={`${t('progress')}: ${subjects.label(s)}`} />
                      : <span className="note">{t('noItems')}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>}
        </>
      )}
      {adding && <SubjectForm year={year} term={term} order={Math.max(0, ...subjects.data.map((s) => s.order)) + 1} onClose={() => setAdding(false)} />}
    </>
  );
}
