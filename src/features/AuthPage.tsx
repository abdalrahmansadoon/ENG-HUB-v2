import { useState } from 'react';
import { useBackend } from '../data/context';
import { useFeedback } from '../ui/feedback';
import { Field, Form } from '../ui/kit';
import { usePrefs } from '../ui/prefs';

export default function AuthPage() {
  const { auth, demo } = useBackend();
  const { t, lang, setLang } = usePrefs();
  const { run, toast } = useFeedback();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="auth">
      <div className="auth-brand">
        <img src="./icon.svg" alt="" width="64" height="64" />
        <h1 dir="ltr">ENG HUB</h1>
        <p>{t('tagline')}</p>
      </div>
      <section className="card auth-card">
        {demo ? (
          <>
            <h2>{t('demoTitle')}</h2>
            <p>{t('demoNote')}</p>
            <button className="btn primary" onClick={() => run(() => auth.signIn('admin@demo.local', ''))}>{t('asAdmin')}</button>
            <button className="btn" onClick={() => run(() => auth.signIn('student@demo.local', ''))}>{t('asStudent')}</button>
          </>
        ) : (
          <>
            <h2>{t(creating ? 'signUp' : 'signIn')}</h2>
            <Form submitLabel={t(creating ? 'signUp' : 'signIn')}
              onSubmit={() => run(() => (creating ? auth.signUp(name.trim(), email.trim(), password) : auth.signIn(email.trim(), password)))}>
              {creating && <Field label={t('name')}><input required maxLength={60} pattern=".*\S.*" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
              <Field label={t('email')}><input type="email" required dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label={t('password')}><input type="password" required minLength={6} dir="ltr" autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            </Form>
            <button className="btn block" onClick={() => run(() => auth.google())}>{t('google')}</button>
            <div className="auth-links">
              <button className="text-btn" onClick={() => setCreating(!creating)}>{t(creating ? 'haveAccount' : 'noAccount')}</button>
              {!creating && <button className="text-btn" onClick={async () => {
                if (!email.trim()) { toast('errEmail', true); return; }
                if (await run(() => auth.resetPassword(email.trim()))) toast('resetSent');
              }}>{t('forgot')}</button>}
            </div>
          </>
        )}
      </section>
      <button className="text-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} lang={lang === 'ar' ? 'en' : 'ar'}>{lang === 'ar' ? 'English' : 'العربية'}</button>
    </main>
  );
}
