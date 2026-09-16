import { transform } from 'sucrase';

// The pad is the whole file: no imports, React's exports as globals. The classic JSX
// runtime emits `React.createElement`, which resolves to the `React` parameter the sandbox
// passes to `new Function('React', '__render', compiled)`. The harness is appended AFTER
// the user's code so Sucrase's line numbers in error messages match what the pad shows.
export function compile(code: string, preview?: string): string {
  const src = preview ? `${code}\n;__render(${preview});` : code;
  const { code: js } = transform(src, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: true });
  return `Object.assign(globalThis, React);\n${js}`;
}

// One line per console call. Strings as typed; objects as JSON so `console.log(map)`
// shows something; cycles and functions fall back to String(). Errors are name + message
// on purpose — a stack into `new Function` code is noise nobody can act on.
export function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      try {
        const json = JSON.stringify(a);
        return json === undefined ? String(a) : json;
      } catch {
        return String(a);
      }
    })
    .join(' ');
}
