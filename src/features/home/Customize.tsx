import { ArrowDown, ArrowUp } from 'lucide-react';
import { defaultLayout, moveSection, type HomeLayout, type HomeSection } from '../../lib/home';
import type { Key } from '../../lib/i18n';
import { Dialog } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';

export const sectionTitles: Record<HomeSection, Key> = {
  today: 'todayTasks', activity: 'activity', progress: 'subjectProgress', upcoming: 'deadlines', updates: 'updates', shortcuts: 'shortcuts',
};

export default function Customize({ layout, onChange, onClose }: { layout: HomeLayout; onChange(l: HomeLayout): void; onClose(): void }) {
  const { t } = usePrefs();
  const toggle = (id: HomeSection, show: boolean) =>
    onChange({ ...layout, hidden: show ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id] });
  return (
    <Dialog title={t('customize')} onClose={onClose}>
      <p className="muted">{t('customizeHint')}</p>
      <ol className="card order-list">
        {layout.order.map((id, i) => (
          <li key={id}>
            <label className="check"><input type="checkbox" checked={!layout.hidden.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />{t(sectionTitles[id])}</label>
            <button type="button" className="icon-btn plain" disabled={i === 0} aria-label={`${t('moveUp')}: ${t(sectionTitles[id])}`} onClick={() => onChange(moveSection(layout, id, -1))}><ArrowUp size={18} aria-hidden /></button>
            <button type="button" className="icon-btn plain" disabled={i === layout.order.length - 1} aria-label={`${t('moveDown')}: ${t(sectionTitles[id])}`} onClick={() => onChange(moveSection(layout, id, 1))}><ArrowDown size={18} aria-hidden /></button>
          </li>
        ))}
      </ol>
      <button type="button" className="btn" onClick={() => onChange(defaultLayout())}>{t('resetLayout')}</button>
    </Dialog>
  );
}
