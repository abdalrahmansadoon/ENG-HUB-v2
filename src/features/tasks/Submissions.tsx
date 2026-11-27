import { ExternalLink, FileText } from 'lucide-react';
import type { Submission } from '../../data/types';
import { formatShort, formatTime } from '../../lib/dates';
import { safeUrl } from '../../lib/video';
import { usePrefs } from '../../ui/prefs';
import { StatusTag } from './tags';

export function useStamp() {
  const { lang } = usePrefs();
  return (ms: number) => `${formatShort(ms, lang)}، ${formatTime(ms, lang)}`;
}

/** نسخة تسليم واحدة مع نتيجة مراجعتها. */
export function SubmissionView({ submission: s }: { submission: Submission }) {
  const { t } = usePrefs();
  const stamp = useStamp();
  const link = safeUrl(s.link);
  return (
    <article className="submission">
      <p className="meta"><strong>{t('version')} <bdi>{s.version}</bdi></strong><span>{stamp(s.at)}</span>{s.verdict && <StatusTag status={s.verdict} />}</p>
      {s.text && <p className="pre" dir="auto">{s.text}</p>}
      {(s.urls.length > 0 || link) && <ul className="attach-list">
        {s.urls.map((url, i) => safeUrl(url) && (
          <li key={url}><a href={safeUrl(url)} target="_blank" rel="noopener noreferrer"><FileText size={16} aria-hidden /><bdi>{s.names[i] || t('openFile')}</bdi></a></li>
        ))}
        {link && <li><a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden /><bdi dir="ltr">{new URL(link).hostname}</bdi></a></li>}
      </ul>}
      {s.reviewNote && <p className="review-note"><strong>{t('reviewNote')}:</strong> <span className="pre" dir="auto">{s.reviewNote}</span></p>}
    </article>
  );
}
