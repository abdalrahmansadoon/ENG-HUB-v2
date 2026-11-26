import { useState } from 'react';
import { useStore } from '../../data/context';
import type { Subject } from '../../data/types';
import { useFeedback } from '../../ui/feedback';
import { SubjectIcon, subjectIcons } from '../../ui/icons';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';

export default function SubjectForm({ subject, year, term, order, onClose }: { subject?: Subject; year: string; term: string; order: number; onClose(): void }) {
  const store = useStore();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const [name, setName] = useState(subject?.name ?? '');
  const [nameEn, setNameEn] = useState(subject?.nameEn ?? '');
  const [icon, setIcon] = useState(subject?.icon ?? 'book');
  const save = async () => {
    const data = { name: name.trim(), nameEn: nameEn.trim(), icon, order, year, term };
    if (await run(() => (subject ? store.update(`subjects/${subject.id}`, data) : store.add('subjects', data)), 'saved')) onClose();
  };
  return (
    <Dialog title={t(subject ? 'editSubject' : 'addSubject')} onClose={onClose}>
      <Form onSubmit={save} submitLabel={t('save')}>
        <Field label={t('nameAr')}><input required maxLength={80} pattern=".*\S.*" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('nameEn')} hint={t('optional')}><input maxLength={80} dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></Field>
        <fieldset>
          <legend>{t('icon')}</legend>
          <div className="icon-grid">
            {Object.keys(subjectIcons).map((key) => (
              <button type="button" key={key} className="icon-btn" aria-pressed={icon === key} aria-label={key} onClick={() => setIcon(key)}><SubjectIcon name={key} /></button>
            ))}
          </div>
        </fieldset>
      </Form>
    </Dialog>
  );
}
