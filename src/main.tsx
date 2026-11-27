import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BackendContext } from './data/context';
import type { Backend } from './data/store';
import { firebaseConfig } from './lib/config';
import { translate } from './lib/i18n';
import './styles/app.css';
import { FeedbackProvider } from './ui/feedback';
import { PrefsProvider } from './ui/prefs';

const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="empty"><p>{translate(lang(), 'errGeneric')}</p><button className="btn" onClick={() => location.reload()}>{translate(lang(), 'retry')}</button></div>;
  }
}

const root = createRoot(document.getElementById('root')!);

async function start() {
  // يُحمّل Firebase فقط عند الحاجة إليه.
  const backend: Backend = firebaseConfig
    ? (await import('./data/firebase')).createFirebaseBackend(firebaseConfig)
    : (await import('./data/demo')).createDemoBackend();
  root.render(
    <StrictMode>
      <Boundary>
        <BackendContext.Provider value={backend}>
          <PrefsProvider><FeedbackProvider><App /></FeedbackProvider></PrefsProvider>
        </BackendContext.Provider>
      </Boundary>
    </StrictMode>,
  );
}
start().catch((e) => { console.error(e); root.render(<p className="empty">{translate(lang(), 'errGeneric')}</p>); });
