import { useState } from 'react';
import { useBackend } from '../data/context';
import { upload, uploadsReady, type UploadKind } from '../lib/cloudinary';
import { useFeedback } from './feedback';
import { Field } from './kit';
import { usePrefs } from './prefs';

export default function UploadField({ label, accept, only, onUploaded, onBusy }: { label: string; accept?: string; only?: UploadKind; onUploaded(url: string, fileName: string): void; onBusy?(busy: boolean): void }) {
  const { demo } = useBackend();
  const { t } = usePrefs();
  const { run } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  if (demo || !uploadsReady) return <p className="muted">{t('errUploadConfig')}</p>;
  return (
    <Field label={busy ? `${t('uploading')} ${percent}%` : label}>
      <input type="file" accept={accept} disabled={busy} onChange={async (e) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        setBusy(true); setPercent(0); onBusy?.(true);
        await run(async () => onUploaded(await upload(file, setPercent, only), file.name));
        setBusy(false); onBusy?.(false); input.value = '';
      }} />
      {busy && <progress max={100} value={percent} />}
    </Field>
  );
}
