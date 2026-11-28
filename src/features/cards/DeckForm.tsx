import { useState } from 'react';
import { useSession, useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Deck } from '../../data/types';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import { useSubjects } from '../useSubjects';

export default function DeckForm({ deck, onClose, onSaved }: { deck?: Deck; onClose(): void; onSaved?(id: string): void }) {
  const store = useStore();
  const { user } = useSession();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const subjects = useSubjects();
  const [name, setName] = useState(deck?.name ?? '');
  const [subjectId, setSubject] = useState(deck?.subjectId ?? '');
  return (
    <Dialog title={t(deck ? 'editDeck' : 'newDeck')} onClose={onClose}>
      <Form submitLabel={t('save')} onSubmit={async () => {
        const id = deck?.id ?? store.newId();
        const path = `users/${user.uid}/decks/${id}`;
        const data = { name: name.trim(), subjectId };
        if (await run(() => (deck ? store.update(path, data) : store.set(path, { ...data, createdAt: NOW })), 'saved')) { onClose(); onSaved?.(id); }
      }}>
        <Field label={t('deckName')}><input required maxLength={80} pattern=".*\S.*" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('subject')}>
          <select value={subjectId} onChange={(e) => setSubject(e.target.value)}>
            <option value="">{t('general')}</option>
            {subjects.data.map((s) => <option key={s.id} value={s.id}>{subjects.label(s)}</option>)}
          </select>
        </Field>
      </Form>
    </Dialog>
  );
}
