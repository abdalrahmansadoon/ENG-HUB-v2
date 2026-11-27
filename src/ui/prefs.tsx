import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type Key, type Lang } from '../lib/i18n';
import { useMediaQuery } from './useMediaQuery';

export type Theme = 'system' | 'light' | 'dark';
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* التخزين غير متاح */ } };

interface Prefs { lang: Lang; theme: Theme; /** المظهر الظاهر فعلاً */ dark: boolean; setLang(l: Lang): void; setTheme(t: Theme): void; t(k: Key): string }
const Context = createContext<Prefs | null>(null);
export const usePrefs = () => useContext(Context)!;

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (read('enghub.lang') === 'en' ? 'en' : 'ar'));
  const [theme, setTheme] = useState<Theme>(() => (read('enghub.theme') as Theme) || 'system');
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = theme === 'system' ? systemDark : theme === 'dark';
  useEffect(() => {
    write('enghub.lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => {
    write('enghub.theme', theme);
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    // لون شريط المتصفح يتبع المظهر المختار لا مظهر الجهاز وحده.
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }, [theme, dark]);
  return <Context.Provider value={{ lang, theme, dark, setLang, setTheme, t: (k) => translate(lang, k) }}>{children}</Context.Provider>;
}
