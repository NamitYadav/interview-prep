// Pad code must not run with the app's origin. A same-origin worker has no localStorage, but
// it can open Cache Storage, where a planted page would be served by the service worker. A
// worker started from a blob inside an opaque-origin frame has an opaque origin too, so
// `caches` and `indexedDB` throw there. The page fetches the bundled script (precached, so
// Run still works offline) and hands it to a srcdoc frame that only starts the worker and
// relays messages over a MessagePort. Removing the frame ends the worker with it, so a
// `while (true)` still stops.
//
// Dev serves the worker as an ES module with imports a blob cannot resolve, and jsdom has
// no frames to speak of, so dev and tests use a plain Worker.

export interface PadWorker {
  onmessage: ((e: MessageEvent<unknown>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage(msg: unknown): void;
  terminate(): void;
}

const ERROR = '__padWorkerError';

const HOST = `<script>
onmessage = (e) => {
  const port = e.ports[0];
  const worker = new Worker(URL.createObjectURL(new Blob([e.data], { type: 'text/javascript' })));
  worker.onmessage = (m) => port.postMessage(m.data);
  worker.onerror = (err) => { err.preventDefault(); port.postMessage('${ERROR}'); };
  port.onmessage = (m) => worker.postMessage(m.data);
};
</script>`;

const sources = new Map<string, Promise<string>>();

export function startPadWorker(url: string): PadWorker {
  if (import.meta.env.DEV) return new Worker(url, { type: 'module' });

  const { port1, port2 } = new MessageChannel();
  const frame = document.createElement('iframe');
  frame.sandbox.add('allow-scripts');
  frame.hidden = true;
  frame.srcdoc = HOST;

  const handle: PadWorker = {
    onmessage: null,
    onerror: null,
    // Queued in the channel until the frame starts its end of it.
    postMessage: (msg) => port1.postMessage(msg),
    terminate: () => {
      frame.remove();
      port1.close();
    },
  };
  const fail = () => handle.onerror?.(new ErrorEvent('error'));
  port1.onmessage = (e) => (e.data === ERROR ? fail() : handle.onmessage?.(e));

  let source = sources.get(url);
  if (!source) {
    source = fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))));
    sources.set(url, source);
    source.catch(() => sources.delete(url));
  }
  frame.onload = () => {
    source.then(
      (text) => frame.contentWindow?.postMessage(text, '*', [port2]),
      fail,
    );
  };
  document.body.append(frame);
  return handle;
}
