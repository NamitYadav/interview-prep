/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ponytail: a hand-rolled precache service worker instead of vite-plugin-pwa. Everything
// the app needs is a static file the build already knows about, so the whole worker is
// "cache these files on install, serve from cache, drop the previous version's cache".
// The cache name is a hash of the file list, so any changed (content-hashed) asset means a
// byte-different sw.js, which the browser installs as a new version. Upgrade path:
// vite-plugin-pwa, if this ever needs runtime caching or an update prompt.
//
// The code-runner iframe has an opaque origin and is not a client of this worker, so
// Run still needs the network — the app itself does not.
const swSource = (base: string, files: string[]) => `const CACHE = 'interview-prep-${createHash('sha1').update(files.join('\n')).digest('hex').slice(0, 12)}';
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify([base, ...files.map((f) => base + f)])};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  // Hash routing: every navigation is the one page.
  const key = e.request.mode === 'navigate' ? BASE : url.pathname;
  e.respondWith(caches.match(key).then((hit) => hit ?? fetch(e.request)));
});
`;

const listPublic = (dir: string, root = dir): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? listPublic(join(dir, d.name), root) : d.name === '.DS_Store' ? [] : [relative(root, join(dir, d.name))],
  );

const serviceWorker = (): Plugin => {
  let base = '/';
  return {
    name: 'interview-prep:service-worker',
    apply: 'build',
    configResolved(c) { base = c.base; },
    generateBundle(_, bundle) {
      const files = [...Object.keys(bundle), ...listPublic('public')].filter((f) => f !== 'sw.js').sort();
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(base, files) });
    },
  };
};

// The code-runner iframe is `sandbox="allow-scripts"` with no allow-same-origin, so its
// origin is opaque and its module-script requests arrive with `Origin: null`, which needs
// a CORS answer. GitHub Pages sends `Access-Control-Allow-Origin: *` on every asset; the
// dev and preview servers must allow 'null' too, which Vite's localhost-only default
// does not. Any sandboxed frame on any page also has origin 'null' — acceptable for a
// personal tool's dev server, and only while it is running.
const sandboxCors = { origin: [/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/, 'null'] };

export default defineConfig({
  base: '/interview-prep/',
  plugins: [react(), tailwindcss(), serviceWorker()],
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
