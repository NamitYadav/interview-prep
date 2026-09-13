/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/interview-prep/',
  plugins: [react(), tailwindcss()],
  // One bundle on purpose (see README › Stack); the >500 KB warning was noise on every build.
  build: { chunkSizeWarningLimit: 1000 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Vitest blanks CSS imports by default; static.test.ts reads index.css as text.
    css: { include: [/index\.css/] },
  },
});
