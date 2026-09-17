/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The code-runner iframe is `sandbox="allow-scripts"` with no allow-same-origin, so its
// origin is opaque and its module-script requests arrive with `Origin: null`, which needs
// a CORS answer. GitHub Pages sends `Access-Control-Allow-Origin: *` on every asset; the
// dev and preview servers must allow 'null' too, which Vite's localhost-only default
// does not. Any sandboxed frame on any page also has origin 'null' — acceptable for a
// personal tool's dev server, and only while it is running.
const sandboxCors = { origin: [/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/, 'null'] };

export default defineConfig({
  base: '/interview-prep/',
  plugins: [react(), tailwindcss()],
  build: {
    // No deliberate code-splitting (see README › Stack); the size warning was noise on
    // every build. 1500 leaves headroom for the bank to grow as much again as it did
    // between 1000 and here.
    chunkSizeWarningLimit: 1500,
    // Second page: the code-runner sandbox (src/sandbox). Rollup hoists React into a chunk
    // both pages share and keeps Sucrase in the sandbox's own chunk, so the app never
    // downloads the compiler.
    rollupOptions: { input: { main: 'index.html', sandbox: 'sandbox.html' } },
  },
  server: { cors: sandboxCors },
  preview: { cors: sandboxCors },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Vitest blanks CSS imports by default; static.test.ts reads index.css as text.
    css: { include: [/index\.css/] },
  },
});
