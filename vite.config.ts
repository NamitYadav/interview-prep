/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/interview-prep/',
  plugins: [react(), tailwindcss()],
  // One bundle on purpose (see README › Stack); the size warning was noise on every build.
  // 1500 leaves headroom for the bank to grow as much again as it did between 1000 and here.
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Vitest blanks CSS imports by default; static.test.ts reads index.css as text.
    css: { include: [/index\.css/] },
  },
});
