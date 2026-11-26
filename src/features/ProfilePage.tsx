import { useState } from 'react';
import { useBackend, useSession } from '../data/context';
import { useFeedback } from '../ui/feedback';
import { Field, Form, PageHead } from '../ui/kit';
import { usePrefs, type Theme } from '../ui/prefs';
import type { Lang } from '../lib/i18n';

export default function ProfilePage() {
  const { auth, store, demo } = useBackend();
  const { user, name, photoURL, isAdmin } = useSession();
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const { run } = useFeedback();
  const [value, setValue] = useState(name);
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  return (
    <>
      <PageHead title={t('profile')}>{isAdmin && <span className="tag done">{t('admin')}</span>}</PageHead>
      <section className="sheet pad">
        <Form submitLabel={t('save')} disabled={!value.trim() || value.trim() === name}
          onSubmit={() => run(() => store.set(`profiles/${user.uid}`, { name: value.trim(), photoURL }), 'saved')}>
          <Field label={t('name')}><input required maxLength={60} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        </Form>
        <p className="muted" dir="ltr">{user.email}</p>
        {!user.emailVerified && <div className="notice"><p>{t('verifyNote')}</p><button className="btn" onClick={() => run(() => auth.verifyEmail(), 'sent')}>{t('sendVerify')}</button></div>}
      </section>
      <section className="sheet pad">
        <div className="two">
          <Field label={t('language')}><select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="ar">العربية</option><option value="en">English</option></select></Field>
          <Field label={t('theme')}><select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}><option value="system">{t('themeSystem')}</option><option value="light">{t('themeLight')}</option><option value="dark">{t('themeDark')}</option></select></Field>
        </div>
        <h2>{t('notifications')}</h2>
        {!supported ? <p className="muted">{t('notificationsNone')}</p>
          : permission === 'granted' ? <p className="muted">{t('notificationsOn')}</p>
          : permission === 'denied' ? <p className="muted">{t('notificationsBlocked')}</p>
          : <button className="btn" onClick={() => run(async () => setPermission(await Notification.requestPermission()))}>{t('enableNotifications')}</button>}
      </section>
      <div className="actions">
        {demo && <button className="btn" onClick={() => run(() => auth.signIn(isAdmin ? 'student@demo.local' : 'admin@demo.local', ''))}>{t(isAdmin ? 'asStudent' : 'asAdmin')}</button>}
        <button className="btn danger" onClick={() => run(() => auth.signOut())}>{t('signOut')}</button>
      </div>
    </>
  );
}
