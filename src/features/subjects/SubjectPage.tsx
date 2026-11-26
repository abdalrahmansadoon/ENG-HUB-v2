import { Check, FileText, Pencil, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCollection, useDoc, useSession, useStore } from '../../data/context';
import type { Item, ItemCategory, Progress, Subject } from '../../data/types';
import { resolveMedia } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { SubjectIcon } from '../../ui/icons';
import { BackLink, Dimension, Empty, PageHead, Status } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import ItemForm from './ItemForm';
import SubjectForm from './SubjectForm';
import { categories } from './terms';

export default function SubjectPage() {
  const { subjectId = '' } = useParams();
  const subject = useDoc<Subject>(`subjects/${subjectId}`);
  const { t } = usePrefs();
  if (subject.loading || !subject.data) {
    return <><BackLink to="/subjects" />{subject.loading ? <Status loading /> : <Empty title={t('notFound')} />}</>;
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
  const studied = new Set(progress.data.map((p) => p.id));
  const shown = items.data.filter((i) => i.category === tab).sort((a, b) => a.createdAt - b.createdAt);
  const groups = [...new Set(shown.map((i) => i.group))].sort();
  const back = `/subjects?year=${subject.year}&term=${subject.term}`;

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
      <BackLink to={back} />
      <PageHead title={label(subject)}>
        {isAdmin && <div className="tools">
          <button className="btn primary" onClick={() => setForm('item')}><Plus size={18} aria-hidden />{t('addItem')}</button>
          <button className="icon-btn" aria-label={t('editSubject')} onClick={() => setForm('subject')}><Pencil size={18} /></button>
          <button className="icon-btn danger" aria-label={t('delete')} onClick={remove} disabled={items.loading}><Trash2 size={18} /></button>
        </div>}
      </PageHead>
      <div className="subject-progress"><span className="drawer-icon"><SubjectIcon name={subject.icon} /></span>
        <Dimension value={items.data.filter((i) => studied.has(i.id)).length} total={items.data.length} label={t('progress')} /></div>
      <nav className="segments" aria-label={t('section')}>
        {categories.map((c) => (
          <button key={c} aria-current={tab === c ? 'page' : undefined} onClick={() => setParams({ tab: c }, { replace: true })}>
            {t(c)} <bdi>{items.data.filter((i) => i.category === c).length}</bdi>
          </button>
        ))}
      </nav>
      <Status loading={items.loading} error={items.error} />
      {!items.loading && !items.error && !shown.length && <Empty title={t('noItems')} />}
      {groups.map((g) => (
        <section key={g} className="group">
          {g && <h2>{g}</h2>}
          <ul className="sheet list">
            {shown.filter((i) => i.group === g).map((i) => {
              const media = resolveMedia(i.url);
              const Icon = media && media.type !== 'link' ? PlayCircle : FileText;
              return (
                <li key={i.id} className="row">
                  <span className="row-icon"><Icon size={20} aria-hidden /></span>
                  <Link to={`/subjects/${subject.id}/items/${i.id}`} className="row-main"><strong>{i.title}</strong></Link>
                  {studied.has(i.id) && <span className="tag done"><Check size={14} aria-hidden />{t('studied')}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p><Link to={`/quizzes?subject=${subject.id}`} className="text-btn">{t('quizzes')}: {label(subject)}</Link></p>
      {form === 'item' && <ItemForm subjectId={subject.id} category={tab} onClose={() => setForm(null)} />}
      {form === 'subject' && <SubjectForm subject={subject} year={subject.year} term={subject.term} order={subject.order} onClose={() => setForm(null)} />}
    </>
  );
}
