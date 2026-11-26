import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type Key, type Lang } from '../lib/i18n';

export type Theme = 'system' | 'light' | 'dark';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* التخزين غير متاح */ } };

interface Prefs { lang: Lang; theme: Theme; setLang(l: Lang): void; setTheme(t: Theme): void; t(k: Key): string }
const Context = createContext<Prefs | null>(null);
export const usePrefs = () => useContext(Context)!;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (read('enghub.lang') === 'en' ? 'en' : 'ar'));
  const [theme, setTheme] = useState<Theme>(() => (read('enghub.theme') as Theme) || 'system');
  useEffect(() => {
    write('enghub.lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => {
    write('enghub.theme', theme);
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);
  return <Context.Provider value={{ lang, theme, setLang, setTheme, t: (k) => translate(lang, k) }}>{children}</Context.Provider>;
}
