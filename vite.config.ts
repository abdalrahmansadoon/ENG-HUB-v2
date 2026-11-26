import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base './' + HashRouter: يعمل على GitHub Pages مهما كان اسم المستودع.
export default defineConfig({ base: './', plugins: [react()] });
