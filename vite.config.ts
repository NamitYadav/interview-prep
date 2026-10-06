/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ponytail: a hand-rolled precache service worker instead of vite-plugin-pwa. Everything
// the app needs is a static file the build already knows about, so the whole worker is
// "cache these files on install, serve from cache, drop older versions' caches".
// The cache name is a hash of every precached file's name AND content — the HTML pages and
// public/ files have no hash in their names, so a list-only hash left an index.html-only
// deploy with a byte-identical sw.js that no browser ever updated. Any change means a
// byte-different sw.js, which the browser installs as a new version. Upgrade path:
// vite-plugin-pwa, if this ever needs runtime caching or an update prompt.
//
// The code-runner iframe has an opaque origin and is not a client of this worker, so
// Run still needs the network — the app itself does not.
//
// Activate keeps the newest previous cache (cache names list in creation order): a tab
// left open across a deploy is claimed by the new worker, and its first Run asks for the
// old `worker-<hash>.js`, which is gone from the server. Fetch looks in the current cache
// first (the page itself is in both), then in any. ponytail: one deploy back only; a tab
// open across two deploys still needs a reload.
const swSource = (base: string, files: string[], hash: string) => `const CACHE = 'interview-prep-${hash}';
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify([base, ...files.map((f) => base + f)])};
self.addEventListener('install', (e) => {
  // cache: 'reload' skips the HTTP cache: Pages serves max-age=600, and a reload within ten
  // minutes of a deploy would otherwise precache the previous index.html under the new name.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  // Cache Storage is per origin, not per scope: every other app on this github.io origin
  // shares it, so only this app's own caches are candidates for deletion.
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('interview-prep-') && k !== CACHE).slice(0, -1).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  // Hash routing: a navigation that is not a precached page (sandbox.html is one) is the app.
  const find = (key) => caches.match(key, { cacheName: CACHE }).then((hit) => hit ?? caches.match(key));
  e.respondWith(find(url.pathname).then((hit) => hit ?? (e.request.mode === 'navigate' ? find(BASE) : undefined)).then((hit) => hit ?? fetch(e.request)));
});
`;

const listPublic = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name !== '.DS_Store')
    .map((d) => relative(dir, join(d.parentPath, d.name)));

const serviceWorker = (): Plugin => {
  let base = '/';
  return {
    name: 'interview-prep:service-worker',
    apply: 'build',
    // After Vite's HTML plugin, so index.html and sandbox.html are in the bundle to hash.
    enforce: 'post',
    configResolved(c) { base = c.base; },
    generateBundle(_, bundle) {
      const content = new Map<string, string | Uint8Array>();
      for (const [name, item] of Object.entries(bundle)) content.set(name, item.type === 'chunk' ? item.code : item.source);
      for (const name of listPublic('public')) content.set(name, readFileSync(join('public', name)));
      content.delete('sw.js');
      const files = [...content.keys()].sort();
      const hash = createHash('sha1');
      for (const f of files) hash.update(f).update(content.get(f)!);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(base, files, hash.digest('hex').slice(0, 12)) });
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
