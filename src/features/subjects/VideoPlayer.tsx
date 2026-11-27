// مشغل الفيديو معزول في هذا الملف ليسهل استبداله بمشغلك الخاص.
import { useState } from 'react';
import type { Media } from '../../lib/video';
import { usePrefs } from '../../ui/prefs';

export default function VideoPlayer({ media, title }: { media: Exclude<Media, { type: 'link' }>; title: string }) {
  const { t } = usePrefs();
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="card pad">{t('videoError')}</p>;
  return (
    <div className="player">
      {media.type === 'embed'
        ? <iframe src={media.src} title={title} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
        : <video src={media.src} controls playsInline preload="metadata" onError={() => setFailed(true)} />}
    </div>
  );
}
