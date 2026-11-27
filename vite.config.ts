import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { serviceWorkerSource } from './sw.template';

/** يولّد sw.js بقائمة ملفات النسخة، فيعمل التطبيق دون اتصال بعد أول زيارة. */
function serviceWorker(): Plugin {
  const fixed = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
  return {
    name: 'enghub-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      // من الخطوط نخزن مقطعي العربية واللاتينية فقط.
      const built = Object.keys(bundle).filter((f) => /\.(js|css)$/.test(f) || /-(arabic|latin)-\d+-normal-[\w-]+\.woff2$/.test(f));
      const files = ['./', './index.html', ...[...fixed, ...built].map((f) => `./${f}`)];
      const hash = createHash('sha256');
      for (const name of built.sort()) hash.update(name);
      for (const name of fixed) hash.update(readFileSync(`public/${name}`));
      hash.update(readFileSync('index.html'));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(hash.digest('hex').slice(0, 12), files) });
    },
  };
}

// base './' + HashRouter: يعمل على GitHub Pages مهما كان اسم المستودع.
export default defineConfig({ base: './', plugins: [react(), serviceWorker()] });
