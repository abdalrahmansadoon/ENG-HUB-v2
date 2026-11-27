import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePrefs } from './prefs';

export function Dialog({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) {
  const { t } = usePrefs();
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const el = ref.current!;
    const opener = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => { el.close(); opener?.focus?.(); };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby={id} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <header className="dialog-head">
        <h2 id={id}>{title}</h2>
        <button type="button" className="icon-btn plain" onClick={onClose} aria-label={t('close')}><X size={20} /></button>
      </header>
      {children}
    </dialog>
  );
}

/** نموذج يمنع الإرسال المزدوج. */
export function Form({ onSubmit, submitLabel, children, disabled }: { onSubmit(): Promise<unknown>; submitLabel: string; children: ReactNode; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    try { await onSubmit(); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="form">
      {children}
      <button className="btn primary" disabled={busy || disabled} aria-busy={busy}>{submitLabel}</button>
    </form>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}{hint && <small> ({hint})</small>}</span>{children}</label>;
}

export function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const { t } = usePrefs();
  const ratio = total ? Math.min(value / total, 1) : 0;
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value}>
      <div className="meter-track"><i style={{ width: `${ratio * 100}%` }} /></div>
      <span className="meter-value"><bdi>{value}</bdi> {t('of')} <bdi>{total}</bdi></span>
    </div>
  );
}

/** صورة العضو، أو أول حرف من اسمه. */
export function Avatar({ name, url, size, tone }: { name: string; url?: string; size?: 'small' | 'large'; tone?: number }) {
  return (
    <span className={`avatar ${size ?? ''} ${tone ? `tone-${tone}` : ''}`} aria-hidden="true">
      {url ? <img src={url} alt="" referrerPolicy="no-referrer" /> : [...name.trim()][0] ?? '?'}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><p>{title}</p>{children}</div>;
}

export function Status({ loading, error }: { loading?: boolean; error?: Error | null }) {
  const { t } = usePrefs();
  if (error) return <Empty title={t('errLoad')}><button className="btn" onClick={() => location.reload()}>{t('retry')}</button></Empty>;
  if (loading) return <div className="loading" role="status"><span className="sr">{t('loading')}</span><i /><i /><i /></div>;
  return null;
}

/** شاشة الانتظار قبل ظهور هيكل التطبيق. */
export function Splash() {
  const { t } = usePrefs();
  return <div className="splash" role="status"><img src="./icon.svg" alt="" width="72" height="72" /><span className="sr">{t('loading')}</span></div>;
}

export function BackLink({ to }: { to: string }) {
  const { t, lang } = usePrefs();
  const Icon = lang === 'ar' ? ArrowRight : ArrowLeft;
  return <Link to={to} className="back" aria-label={t('back')}><Icon size={20} aria-hidden /></Link>;
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="page-head"><h1>{title}</h1>{children}</header>;
}
