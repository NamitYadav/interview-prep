import { useEffect, useId, useRef, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { ImportReset } from './ExportImport';
import { panelButton, panelToggle } from './controlStyles';
import { ThemeToggle } from './ThemeToggle';

// One disclosure in place of five permanent controls. The header sits outside the route
// switch, so everything in it followed the user into every drill; theme alone took three
// slots for a setting picked once. Both drill toggles already advertise their state where
// it matters — strict mode puts a countdown on the question card, shortcuts render their
// key hints on Reveal/Skip/Back and the rating buttons — so the header copies said
// nothing the drill itself doesn't.
//
// <details> rather than a hand-built menu: the open/close state, the button semantics and
// the screen-reader announcement all come from the element.
export function Settings({
  state, dispatch, strictMode, setStrictMode, shortcuts, setShortcuts,
}: {
  state: Persisted;
  dispatch: Dispatch<Action>;
  strictMode: boolean;
  setStrictMode: (v: boolean) => void;
  shortcuts: boolean;
  setShortcuts: (v: boolean) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // The one thing <details> has no native answer for: it stays open over the page while
  // you click around behind it. Escape hands focus back to the summary rather than
  // dropping it on <body>.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && e.target instanceof Node && !el.contains(e.target)) el.open = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key !== 'Escape' || !el?.open) return;
      el.open = false;
      el.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className={`${panelButton} inline-block cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        Settings
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-72 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <section>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Theme</p>
          <ThemeToggle />
        </section>

        <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Drilling</p>
          <Toggle
            label="Strict mode"
            description="Reveals the answer on its own once the round's target time runs out."
            pressed={strictMode}
            onToggle={setStrictMode}
          />
          <Toggle
            label="Shortcuts"
            description="Single keys while drilling: Space to reveal, N to skip, B for back, 1/2/3 to rate."
            pressed={shortcuts}
            onToggle={setShortcuts}
          />
        </section>

        <section className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Your data</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Export lives on the home screen, next to the backup reminder.</p>
          <ImportReset state={state} dispatch={dispatch} />
        </section>
      </div>
    </details>
  );
}

function Toggle({
  label, description, pressed, onToggle,
}: { label: string; description: string; pressed: boolean; onToggle: (v: boolean) => void }) {
  const descriptionId = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(!pressed)}
        aria-pressed={pressed}
        aria-describedby={descriptionId}
        className={panelToggle(pressed)}
      >
        {label}
      </button>
      <p id={descriptionId} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}
