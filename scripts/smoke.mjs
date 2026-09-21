// Real-browser smoke check for the parts jsdom cannot exercise: the opaque-origin sandbox
// frame (CORS on module scripts, postMessage round trip), the console-only Worker runner
// (output, and that `terminate()` really ends an infinite loop), and the built app booting.
//
// Serves `dist/` the way GitHub Pages does (every asset with `Access-Control-Allow-Origin:
// *`), adds a harness page on the same origin, opens it in a headless browser and waits for
// the harness to POST its results. Zen (Firefox) by default — it is what this Mac has and
// its engine is the one the sandbox freeze was found on; SMOKE_BROWSER points at any other
// Firefox or Chromium binary that takes `--headless <url>`.
//
// Run with `npm run smoke` (builds first). Not part of CI: the runner there has no browser
// and the point is the engine, not the assertions.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';

const BASE = '/interview-prep/';
const DIST = new URL('../dist/', import.meta.url).pathname;
const BROWSER = process.env.SMOKE_BROWSER ?? '/Applications/Zen.app/Contents/MacOS/zen';
const TIMEOUT_MS = 30_000;

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html missing — run `npm run build` first (or `npm run smoke`, which does).');
  process.exit(1);
}
if (!existsSync(BROWSER)) {
  console.error(`No browser at ${BROWSER}. Install Zen, or set SMOKE_BROWSER to a Firefox/Chromium binary.`);
  process.exit(1);
}

const workerAsset = readdirSync(join(DIST, 'assets')).find((f) => /^worker-.*\.js$/.test(f));
if (!workerAsset) {
  console.error('No worker-*.js in dist/assets — the console-only runner did not build.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

// The pad's code, as the app would send it: TS + JSX, no imports.
const FRAME_CODE = "const n: number = 1 + 1;\nconsole.log('frame', n);\nfunction App() { return <p>hi</p>; }";
const WORKER_CODE = "const xs: number[] = [1, 2];\nconsole.log('worker', xs.map((x) => x * 2));";

const harness = `<!doctype html><meta charset="utf-8"><title>smoke</title>
<iframe id="app" src="${BASE}" style="width:600px;height:400px"></iframe>
<script type="module">
const results = {};
// Listen before the sandbox frame exists: it posts \`ready\` as soon as its module runs,
// and a listener attached after waiting on anything else misses it.
const sb = document.createElement('iframe');
sb.setAttribute('sandbox', 'allow-scripts allow-forms');
const frameLines = [];
let frameDone = false;
window.addEventListener('message', (e) => {
  if (e.source !== sb.contentWindow) return;
  if (e.data?.type === 'ready') sb.contentWindow.postMessage({ type: 'run', code: ${JSON.stringify(FRAME_CODE)}, preview: '<App />' }, '*');
  if (e.data?.type === 'log' || e.data?.type === 'error') frameLines.push(e.data.text);
  if (e.data?.type === 'done') frameDone = true;
});
sb.src = '${BASE}sandbox.html';
document.body.append(sb);
const report = async () => {
  await fetch('/__smoke/report', { method: 'POST', body: JSON.stringify(results) });
};
const until = (fn, ms = 10000) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  const tick = () => { try { const v = fn(); if (v) return resolve(v); } catch {} Date.now() - t0 > ms ? reject(new Error('timed out')) : setTimeout(tick, 100); };
  tick();
});

// 1. The built app boots: React rendered Home inside a same-origin frame.
try {
  const app = document.getElementById('app');
  await until(() => app.contentDocument?.querySelector('main h1')?.textContent === 'Interview Prep');
  results.appBoots = true;
} catch (e) { results.appBoots = String(e); }

// 2. The sandbox frame: loads its module script cross-origin (origin null), says ready,
//    compiles TS + JSX and posts console output back.
try {
  await until(() => frameDone);
  results.frameRun = frameLines.length === 1 && frameLines[0] === 'frame 2' ? true : 'lines: ' + JSON.stringify(frameLines);
} catch (e) { results.frameRun = String(e); }

// 3. The worker runner: same compile, output back, and terminate() ends a spin.
try {
  const lines = [];
  const w = new Worker('${BASE}assets/${workerAsset}', { type: 'module' });
  let done = false;
  w.onmessage = (e) => { if (e.data?.type === 'log' || e.data?.type === 'error') lines.push(e.data.text); if (e.data?.type === 'done') done = true; };
  w.onerror = (e) => lines.push('onerror: ' + e.message);
  w.postMessage({ type: 'run', code: ${JSON.stringify(WORKER_CODE)} });
  await until(() => done);
  w.terminate();
  results.workerRun = lines.length === 1 && lines[0] === 'worker [2,4]' ? true : 'lines: ' + JSON.stringify(lines);

  const spin = new Worker('${BASE}assets/${workerAsset}', { type: 'module' });
  spin.postMessage({ type: 'run', code: 'while (true) {}' });
  await new Promise((r) => setTimeout(r, 300));
  spin.terminate();
  // Getting here at all is the assertion: the page's own thread was never blocked.
  results.workerTerminates = true;
} catch (e) { results.workerRun ??= String(e); results.workerTerminates = String(e); }

await report();
</script>`;

let resolveReport;
const reported = new Promise((r) => { resolveReport = r; });

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/__smoke/harness.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(harness);
  }
  if (url.pathname === '/__smoke/report' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => { res.writeHead(204).end(); resolveReport(JSON.parse(body)); });
    return;
  }
  if (!url.pathname.startsWith(BASE)) return res.writeHead(404).end();
  let rel = normalize(url.pathname.slice(BASE.length));
  if (rel === '' || rel === '.') rel = 'index.html';
  const file = join(DIST, rel);
  if (!file.startsWith(DIST) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(readFileSync(file));
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/__smoke/harness.html`;
  const profile = mkdtempSync(join(tmpdir(), 'smoke-profile-'));
  const browser = spawn(BROWSER, ['--headless', '--new-instance', '--profile', profile, url], { stdio: 'ignore' });
  const finish = (code) => {
    browser.kill();
    server.close();
    rmSync(profile, { recursive: true, force: true });
    process.exit(code);
  };
  const timer = setTimeout(() => {
    console.error(`No report from the browser within ${TIMEOUT_MS / 1000}s.`);
    finish(1);
  }, TIMEOUT_MS);
  reported.then((results) => {
    clearTimeout(timer);
    let failed = 0;
    for (const [name, value] of Object.entries(results)) {
      const ok = value === true;
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${value}`}`);
    }
    finish(failed === 0 ? 0 : 1);
  });
});
