import { Download, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend, useSession } from '../data/context';
import { useFeedback } from '../ui/feedback';
import { Avatar, Field, Form } from '../ui/kit';
import { usePrefs, type Theme } from '../ui/prefs';
import type { Lang } from '../lib/i18n';
import { install, isIos, isStandalone, useCanInstall } from '../lib/pwa';

export default function ProfilePage() {
  const { auth, store, demo } = useBackend();
  const { user, name, photoURL, isAdmin } = useSession();
  const { t, lang, setLang, theme, setTheme } = usePrefs();
  const { run } = useFeedback();
  const [value, setValue] = useState(name);
  const supported = typeof Notification !== 'undefined';
  const [permission, setPermission] = useState(supported ? Notification.permission : 'denied');
  const canInstall = useCanInstall();
  return (
    <>
      <header className="person mat">
        <Avatar name={name} url={photoURL} size="large" />
        <h1><bdi>{name}</bdi></h1>
        <p className="muted" dir="ltr">{user.email}</p>
        {isAdmin && <span className="tag accepted">{t('admin')}</span>}
      </header>
      {!user.emailVerified && <div className="notice"><p>{t('verifyNote')}</p><button className="btn small" onClick={() => run(() => auth.verifyEmail(), 'sent')}>{t('sendVerify')}</button></div>}
      <div className="profile-grid">
      <section className="card pad">
        <Form submitLabel={t('save')} disabled={!value.trim() || value.trim() === name}
          onSubmit={() => run(() => store.set(`profiles/${user.uid}`, { name: value.trim(), photoURL }), 'saved')}>
          <Field label={t('name')}><input required maxLength={60} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        </Form>
      </section>
      <section className="card pad">
        <div className="two">
          <Field label={t('language')}><select value={lang} onChange={(e) => setLang(e.target.value as Lang)}><option value="ar">العربية</option><option value="en">English</option></select></Field>
          <Field label={t('theme')}><select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}><option value="system">{t('themeSystem')}</option><option value="light">{t('themeLight')}</option><option value="dark">{t('themeDark')}</option></select></Field>
        </div>
      </section>
      <section className="card pad">
        <h2>{t('notifications')}</h2>
        {!supported ? <p className="muted">{t('notificationsNone')}</p>
          : permission === 'granted' ? <p className="muted">{t('notificationsOn')}</p>
          : permission === 'denied' ? <p className="muted">{t('notificationsBlocked')}</p>
          : <button className="btn tonal" onClick={() => run(async () => setPermission(await Notification.requestPermission()))}>{t('enableNotifications')}</button>}
        <Link className="text-btn" to="/notifications">{t('notificationSettings')}</Link>
      </section>
      <section className="card pad">
        <h2>{t('app')}</h2>
        {isStandalone() ? <p className="muted">{t('installed')}</p>
          : canInstall ? <button className="btn tonal" onClick={() => run(install)}><Download size={18} aria-hidden />{t('install')}</button>
          : <p className="muted">{t(isIos() ? 'installIos' : 'installMenu')}</p>}
      </section>
      </div>
      {demo && <button className="btn block" onClick={() => run(() => auth.signIn(isAdmin ? 'student@demo.local' : 'admin@demo.local', ''))}>{t(isAdmin ? 'asStudent' : 'asAdmin')}</button>}
      <button className="btn danger block" onClick={() => run(() => auth.signOut())}><LogOut size={18} className="flip" aria-hidden />{t('signOut')}</button>
    </>
  );
}
