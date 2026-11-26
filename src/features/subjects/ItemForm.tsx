import { useState } from 'react';
import { useStore } from '../../data/context';
import { NOW } from '../../data/store';
import type { Item, ItemCategory } from '../../data/types';
import { safeUrl } from '../../lib/video';
import { useFeedback } from '../../ui/feedback';
import { Dialog, Field, Form } from '../../ui/kit';
import { usePrefs } from '../../ui/prefs';
import UploadField from '../../ui/UploadField';
import { categories } from './terms';

export default function ItemForm({ item, subjectId, category: initial, onClose }: { item?: Item; subjectId: string; category: ItemCategory; onClose(): void }) {
  const store = useStore();
  const { t } = usePrefs();
  const { run, toast } = useFeedback();
  const [title, setTitle] = useState(item?.title ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [group, setGroup] = useState(item?.group ?? '');
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? initial);
  const [uploading, setUploading] = useState(false);
  const save = async () => {
    const link = safeUrl(url);
    if (!link) { toast('errUrl', true); return; }
    const data = { title: title.trim(), url: link, group: group.trim(), category, subjectId };
    if (await run(() => (item ? store.update(`items/${item.id}`, data) : store.add('items', { ...data, createdAt: NOW })), 'saved')) onClose();
  };
  return (
    <Dialog title={t(item ? 'editItem' : 'addItem')} onClose={onClose}>
      <Form onSubmit={save} submitLabel={t('save')} disabled={uploading}>
        <Field label={t('title')}><input required maxLength={140} pattern=".*\S.*" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="two">
          <Field label={t('section')}><select value={category} onChange={(e) => setCategory(e.target.value as ItemCategory)}>{categories.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select></Field>
          <Field label={t('group')} hint={t('optional')}><input maxLength={80} value={group} onChange={(e) => setGroup(e.target.value)} /></Field>
        </div>
        <Field label={t('link')}><input required type="url" dir="ltr" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <UploadField label={t('orUpload')} onBusy={setUploading} onUploaded={(u, n) => { setUrl(u); setTitle((old) => old || n.slice(0, 140)); }} />
      </Form>
    </Dialog>
  );
}
