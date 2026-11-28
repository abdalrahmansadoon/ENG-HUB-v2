import { BookOpen, ClipboardList, History, Layers, ListChecks, Megaphone, MessagesSquare, NotebookPen, FileText, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../data/context';
import type { Key } from '../../lib/i18n';
import { remember, search, searchTypes, type Entry, type SearchType } from '../../lib/search';
import { Dialog } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSearchEntries } from './useSearchEntries';

const typeKeys: Record<SearchType, Key> = {
  task: 'tasks', subject: 'subjects', item: 'srContent', quiz: 'quizzes', announcement: 'announcements', note: 'notes', card: 'flashcards', chat: 'srRooms',
};
const icons: Record<SearchType, typeof Search> = {
  task: ListChecks, subject: BookOpen, item: FileText, quiz: ClipboardList, announcement: Megaphone, note: NotebookPen, card: Layers, chat: MessagesSquare,
};
const PER_TYPE = 4;
type Option = { id: string } & ({ entry: Entry; more?: undefined; all?: undefined } | { entry?: undefined; more: SearchType; all: number });

export default function SearchDialog({ onClose }: { onClose(): void }) {
  const { user } = useSession();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const { entries, loading, failed, subjects } = useSearchEntries();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<SearchType | ''>('');
  const [subject, setSubject] = useState('');
  const [active, setActive] = useState(0);
  const key = `enghub.search.v1:${user.uid}`;
  const [recent, setRecent] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(saved) ? saved.filter((x) => typeof x === 'string') : []; } catch { return []; }
  });
  const keep = (list: string[]) => { setRecent(list); try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* التخزين غير متاح */ } };
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);

  // النتائج مجمعة حسب النوع، وترتيب المجموعات حسب أفضل نتيجة فيها.
  const { groups, flat, total } = useMemo(() => {
    const found = search(entries, query, { type, subject });
    const order = [...new Set(found.map((e) => e.type))];
    const groups = order.map((kind) => {
      const all = found.filter((e) => e.type === kind);
      const shown = type ? all.slice(0, 30) : all.slice(0, PER_TYPE);
      // «عرض الكل» خيار في القائمة نفسها حتى تصل إليه لوحة المفاتيح.
      const options: Option[] = shown.map((entry) => ({ id: `found-${entry.type}-${entry.id}`, entry }));
      if (!type && all.length > shown.length) options.push({ id: `found-more-${kind}`, more: kind, all: all.length });
      return { kind, options };
    });
    return { groups, flat: groups.flatMap((g) => g.options), total: found.length };
  }, [entries, query, type, subject]);
  const current = Math.min(active, Math.max(flat.length - 1, 0));
  useEffect(() => { if (flat[current]) document.getElementById(flat[current].id)?.scrollIntoView({ block: 'nearest' }); }, [current, flat]);

  const open = (option: Option) => {
    if (!option.entry) { setType(option.more); setActive(0); input.current?.focus(); return; }
    const { to } = option.entry;
    keep(remember(recent, query));
    onClose();
    // بعد إغلاق النافذة وإعادة التركيز إلى ما فتحها.
    setTimeout(() => navigate(to), 0);
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length) setActive((current + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length);
    }
    if (e.key === 'Enter') { e.preventDefault(); if (flat[current]) open(flat[current]); }
  };
  const searching = query.trim().length > 0;

  return (
    <Dialog title={t('search')} onClose={onClose} className="search-dialog">
      <label className="search"><Search size={18} aria-hidden />
        <input ref={input} type="search" role="combobox" aria-expanded={flat.length > 0} aria-controls="search-results" aria-autocomplete="list"
          aria-activedescendant={flat[current]?.id} aria-label={t('searchAll')} placeholder={t('searchAll')}
          value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={keys} />
      </label>
      <div className="filters">
        <select aria-label={t('resultType')} value={type} onChange={(e) => { setType(e.target.value as SearchType | ''); setActive(0); }}>
          <option value="">{t('allTypes')}</option>
          {searchTypes.map((k) => <option key={k} value={k}>{t(typeKeys[k])}</option>)}
        </select>
        <select aria-label={t('subject')} value={subject} onChange={(e) => { setSubject(e.target.value); setActive(0); }}>
          <option value="">{t('allSubjects')}</option>
          {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
        </select>
      </div>
      <p className="muted" role="status">{loading ? t('loading') : searching ? `${t('found')}: ${total}` : t('searchHint')}</p>
      {failed && <p className="notice">{t('searchPartial')}</p>}
      {!searching && recent.length > 0 && (
        <section className="group">
          <div className="group-head"><h3>{t('recentSearches')}</h3><button type="button" className="text-btn" onClick={() => keep([])}>{t('clearRecent')}</button></div>
          <ul className="recent">{recent.map((x) => (
            <li key={x}>
              <button type="button" className="btn small" onClick={() => { setQuery(x); input.current?.focus(); }}><History size={16} aria-hidden />{x}</button>
              <button type="button" className="icon-btn plain" aria-label={`${t('delete')}: ${x}`} onClick={() => keep(recent.filter((y) => y !== x))}><X size={16} aria-hidden /></button>
            </li>
          ))}</ul>
        </section>
      )}
      {searching && !loading && !flat.length && <p className="empty">{t('noMatches')}</p>}
      <div id="search-results" role="listbox" aria-label={t('results')} className="results">
        {groups.map((g) => (
          <div key={g.kind} role="group" aria-label={t(typeKeys[g.kind])}>
            <p className="result-head" aria-hidden="true">{t(typeKeys[g.kind])}</p>
            {g.options.map((o) => {
              const selected = flat[current] === o;
              const props = { id: o.id, role: 'option', 'aria-selected': selected, onClick: () => open(o), onMouseMove: () => { if (!selected) setActive(flat.indexOf(o)); } };
              const e = o.entry;
              if (!e) return <div key={o.id} {...props} className="result more"><span>{t('showAll')} (<bdi>{o.all}</bdi>)</span></div>;
              const Icon = icons[e.type];
              return (
                <div key={o.id} {...props} className="result">
                  <span className={`tile small tone-${subjects.tone(e.subjectId)}`}><Icon size={18} aria-hidden /></span>
                  <span className="row-main"><strong dir="auto">{e.title}</strong><span className="meta">{e.type !== 'subject' && <span>{subjects.nameOf(e.subjectId)}</span>}</span></span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
