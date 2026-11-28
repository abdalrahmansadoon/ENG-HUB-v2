import { NotebookPen, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatShort } from '../../lib/dates';
import { splitMath } from '../../lib/math';
import { normalize } from '../../lib/search';
import { Empty, PageHead, Status } from '../../ui/kit';
import NeedsRules from '../../ui/NeedsRules';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';
import { useNotes } from './useNotes';

function List() {
  const { t, lang } = usePrefs();
  const notes = useNotes();
  const subjects = useSubjects();
  const [params, setParams] = useSearchParams();
  const [text, setText] = useState('');
  const subject = params.get('subject') ?? '';
  const tag = params.get('tag') ?? '';
  // المعادلات لا تُقرأ بصيغتها المكتوبة، فنشير إليها فقط.
  const preview = (body: string) => splitMath(body).map((p) => (p.type === 'text' ? p.value : `[${t('equation')}]`)).join('').slice(0, 180);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const words = normalize(text).split(' ').filter(Boolean);
  const found = notes.data.filter((n) => (!subject || n.subjectId === (subject === 'general' ? '' : subject))
    && (!tag || n.tags.includes(tag))
    && words.every((w) => normalize(`${n.title} ${n.body} ${n.tags.join(' ')}`).includes(w)));
  const tags = [...new Set(notes.data.flatMap((n) => n.tags))].sort();
  const used = subjects.data.filter((s) => notes.data.some((n) => n.subjectId === s.id));

  if (notes.loading || notes.error) return <Status loading={notes.loading} error={notes.error} />;
  if (!notes.data.length) return <Empty title={t('noNotes')}><span>{t('noNotesHint')}</span><Link className="btn primary" to="/notes/new">{t('newNote')}</Link></Empty>;
  return (
    <>
      <div className="filter-bar">
        <label className="search"><Search size={18} aria-hidden /><input type="search" aria-label={t('searchNotes')} placeholder={t('searchNotes')} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <div className="filters">
          <select aria-label={t('subject')} value={subject} onChange={(e) => set('subject', e.target.value)}>
            <option value="">{t('allSubjects')}</option>
            <option value="general">{t('general')}</option>
            {used.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
          </select>
          {tags.length > 0 && <select aria-label={t('tag')} value={tag} onChange={(e) => set('tag', e.target.value)}>
            <option value="">{t('allTags')}</option>
            {tags.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>}
        </div>
      </div>
      <p className="sr" role="status">{t('found')}: {found.length}</p>
      {!found.length ? <Empty title={t('noMatches')} /> : (
        <ul className="note-grid">{found.map((n) => (
          <li key={n.id}>
            <Link to={`/notes/${n.id}`} className={`card note-card tone-${subjects.tone(n.subjectId)}`}>
              <strong dir="auto">{n.title || t('untitled')}</strong>
              <p dir="auto">{preview(n.body) || (n.images.length ? t('imagesOnly') : '')}</p>
              <span className="meta"><span className="subject-dot">{subjects.nameOf(n.subjectId)}</span><span>{formatShort(n.updatedAt, lang)}</span></span>
              {n.tags.length > 0 && <span className="tag-list">{n.tags.map((x) => <span key={x} className="tag">{x}</span>)}</span>}
            </Link>
          </li>
        ))}</ul>
      )}
    </>
  );
}

export default function NotesPage() {
  const { t } = usePrefs();
  return (
    <>
      <PageHead title={t('notes')}><p><NotebookPen size={16} aria-hidden /> {t('privateNote')}</p></PageHead>
      <NeedsRules><List /><Link to="/notes/new" className="btn primary fab"><Plus size={20} aria-hidden />{t('newNote')}</Link></NeedsRules>
    </>
  );
}
