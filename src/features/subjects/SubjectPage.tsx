import { Check, ClipboardList, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import type { Item, ItemCategory, Progress, Subject } from '../../data/types';
import { itemKind } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { SubjectIcon } from '../../ui/icons';
import { BackLink, Empty, Meter, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { toneOf } from '../../ui/tone';
import { useSubjects } from '../useSubjects';
import ItemForm from './ItemForm';
import { KindIcon } from './KindIcon';
import SubjectForm from './SubjectForm';
import { categories } from './terms';

export default function SubjectPage() {
  const { subjectId = '' } = useParams();
  const subject = useDoc<Subject>(`subjects/${subjectId}`);
  const { t } = usePrefs();
  if (subject.loading || !subject.data) {
    return <><BackLink to="/subjects" />{subject.loading ? <Status loading /> : <Empty page title={t('notFound')} />}</>;
  }
  return <SubjectView key={subjectId} subject={subject.data} />;
}

function SubjectView({ subject }: { subject: Subject }) {
  const store = useStore();
  const navigate = useNavigate();
  const { user, isAdmin } = useSession();
  const { t } = usePrefs();
  const { run, confirm } = useFeedback();
  const { label } = useSubjects();
  const items = useCollection<Item>('items', { where: ['subjectId', '==', subject.id] });
  const progress = useCollection<Progress>(`users/${user.uid}/progress`);
  const [params, setParams] = useSearchParams();
  const tab: ItemCategory = categories.find((c) => c === params.get('tab')) ?? 'lectures';
  const [form, setForm] = useState<'item' | 'subject' | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const studied = new Set(progress.data.map((p) => p.id));
  const needle = search?.trim().toLocaleLowerCase() ?? '';
  const shown = items.data
    .filter((i) => (needle ? `${i.title} ${i.group}`.toLocaleLowerCase().includes(needle) : i.category === tab))
    .sort((a, b) => a.createdAt - b.createdAt);
  const groups = [...new Set(shown.map((i) => i.group))].sort();
  // «التالية» هي أول محتوى لم يُذاكر بترتيب العرض.
  const next = needle || progress.loading ? undefined : groups.flatMap((g) => shown.filter((i) => i.group === g)).find((i) => !studied.has(i.id));
  const back = `/subjects?year=${subject.year}&term=${subject.term}`;
  const itemPath = (id: string) => `/subjects/${subject.id}/items/${id}`;

  const remove = async () => {
    if (!(await confirm('confirmSubject'))) return;
    const ok = await run(async () => {
      for (const i of items.data) await store.remove(`items/${i.id}`);
      await store.remove(`subjects/${subject.id}`);
    }, 'deleted');
    if (ok) navigate(back);
  };

  return (
    <>
      <div className="topbar">
        <BackLink to={back} />
        <div className="tools">
          <button className="icon-btn" aria-label={t('searchSubject')} aria-pressed={search !== null} onClick={() => setSearch(search === null ? '' : null)}><Search size={18} aria-hidden /></button>
          {isAdmin && <>
            <button className="icon-btn" aria-label={t('editSubject')} onClick={() => setForm('subject')}><Pencil size={18} aria-hidden /></button>
            <button className="icon-btn danger" aria-label={t('delete')} onClick={remove} disabled={items.loading}><Trash2 size={18} aria-hidden /></button>
          </>}
        </div>
      </div>
      <div className="split cols">
      <div>
      <header className={`subject-head sheet tone-${toneOf(subject.order)}`}>
        <div className="subject-title"><span className="tile large"><SubjectIcon name={subject.icon} size={28} /></span><h1>{label(subject)}</h1></div>
        {items.data.length > 0 && <Meter value={items.data.filter((i) => studied.has(i.id)).length} total={items.data.length} label={t('progress')} />}
      </header>
      {search === null ? (
        <nav className="segmented" aria-label={t('section')}>
          {categories.map((c) => (
            <button key={c} aria-current={tab === c ? 'page' : undefined} onClick={() => setParams({ tab: c }, { replace: true })}>
              {t(c === 'exams' ? 'examsShort' : c)}
            </button>
          ))}
        </nav>
      ) : (
        <label className="search">
          <Search size={20} aria-hidden />
          <input type="search" autoFocus aria-label={t('searchSubject')} placeholder={t('searchSubject')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      )}
      <Status loading={items.loading} error={items.error} />
      {!items.loading && !items.error && !shown.length && <Empty title={t(needle ? 'noMatches' : 'noItems')} />}
      {groups.map((g) => (
        <section key={g} className="group">
          {g && <h2>{g}</h2>}
          <ul className="card">
            {shown.filter((i) => i.group === g).map((i) => {
              const kind = itemKind(i.url);
              return (
                <li key={i.id}>
                  <Link to={itemPath(i.id)} className="row link">
                    <span className={i === next ? 'tile solid' : 'tile'}><KindIcon kind={kind} /></span>
                    <span className="row-main">
                      <strong>{i.title}</strong>
                      <span className="meta">
                        {i === next ? <span className="item-sub next">{t('next')}</span> : <span>{t(`kind_${kind}`)}</span>}
                        {needle && <span>{t(i.category)}</span>}
                      </span>
                    </span>
                    {studied.has(i.id) && <span className="studied-mark" role="img" aria-label={t('studied')}><Check size={22} strokeWidth={2.5} aria-hidden /></span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {isAdmin && <button className="btn dashed block" onClick={() => setForm('item')}><Plus size={18} aria-hidden />{t('addItem')}</button>}
      </div>
      <div>
      {next && <Link to={itemPath(next.id)} className="btn primary block"><Play size={18} aria-hidden />{t('continueWith')}: {next.title}</Link>}
      <Link to={`/quizzes?subject=${subject.id}`} className="btn block"><ClipboardList size={18} aria-hidden />{t('subjectQuizzes')}</Link>
      </div>
      </div>
      {form === 'item' && <ItemForm subjectId={subject.id} category={tab} onClose={() => setForm(null)} />}
      {form === 'subject' && <SubjectForm subject={subject} year={subject.year} term={subject.term} order={subject.order} onClose={() => setForm(null)} />}
    </>
  );
}
