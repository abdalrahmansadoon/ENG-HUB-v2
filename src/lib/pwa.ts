import { useSyncExternalStore } from 'react';

interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let installEvent: InstallEvent | null = null;
let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

if (typeof window !== 'undefined') {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e as InstallEvent; emit(); });
  addEventListener('appinstalled', () => { installEvent = null; emit(); });
}

export const useCanInstall = () => useSyncExternalStore(subscribe, () => installEvent !== null, () => false);
export const useUpdateReady = () => useSyncExternalStore(subscribe, () => waiting !== null, () => false);

export async function install() {
  const event = installEvent;
  if (!event) return;
  installEvent = null;
  await event.prompt();
  emit();
}

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

let asked = false;
export function applyUpdate() {
  if (!waiting) return;
  asked = true;
  waiting.postMessage('skip');
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (asked) location.reload(); });
  addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      const offer = (worker: ServiceWorker | null) => {
        // أول تثبيت ليس تحديثاً.
        if (worker && navigator.serviceWorker.controller) { waiting = worker; emit(); }
      };
      offer(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(worker); });
      });
      // التطبيق المثبّت قد يبقى مفتوحاً أياماً: نتحقق عند العودة إليه.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') registration.update().catch(() => {}); });
    } catch (error) { console.warn('service worker', error); }
  });
}

/** إشعار محلي: عبر عامل الخدمة إن وُجد، لأن متصفحات أندرويد ترفض الإنشاء المباشر. */
export async function notify(title: string, options: NotificationOptions) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch { /* غير مدعوم */ }
}
