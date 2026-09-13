import { useEffect, useId, useRef, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { ImportReset } from './ExportImport';
import { pageButton, panelButton, panelToggle } from './controlStyles';
import { ThemeToggle } from './ThemeToggle';
import { SOUNDS, useFocusSound, type SoundChoice } from '../hooks/useFocusSound';

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
  // Owned here, not in FocusSound: the AudioContext must outlive the panel being closed,
  // and the summary needs `playing` to show that something is still running.
  const sound = useFocusSound();

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
    // max-h + overflow: the header is sticky, so a panel taller than the viewport (it is
    // ~680px on a phone) could never be scrolled to its bottom — Import and Reset were
    // unreachable at 375×667. Capped to the viewport, it scrolls inside itself instead.
    <details ref={ref} className="relative">
      <summary className={`${pageButton} inline-block cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        Settings
        {sound.playing && <><span aria-hidden="true"> ♪</span><span className="sr-only">, focus sound playing</span></>}
      </summary>
      <div className="absolute right-0 z-10 mt-2 max-h-[calc(100dvh-4rem)] w-72 space-y-4 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <section>
          <p className="mb-2 text-sm font-medium">Theme</p>
          <ThemeToggle />
        </section>

        <section className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-sm font-medium">Drilling</p>
          <Toggle
            label="Strict mode"
            description="Reveals the answer on its own once the round's target time runs out."
            checked={strictMode}
            onToggle={setStrictMode}
          />
          <Toggle
            label="Shortcuts"
            description="Single keys while drilling: Space to reveal, N to skip, B for back, 1/2/3 to rate."
            checked={shortcuts}
            onToggle={setShortcuts}
          />
        </section>

        <section className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-sm font-medium">Focus sound</p>
          <FocusSound {...sound} />
        </section>

        <section className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-sm font-medium">Your data</p>
          <ImportReset state={state} dispatch={dispatch} />
        </section>
      </div>
    </details>
  );
}

// A native checkbox: on/off is legible from the control itself, not from whether a
// border happens to be emerald.
function Toggle({
  label, description, checked, onToggle,
}: { label: string; description: string; checked: boolean; onToggle: (v: boolean) => void }) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className="flex items-start gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        aria-describedby={descriptionId}
        className="mt-1"
      />
      <div>
        <label htmlFor={id} className="text-sm">{label}</label>
        <p id={descriptionId} className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

const SOUND_LABELS: Record<SoundChoice, string> = { off: 'Off', white: 'White', pink: 'Pink', brown: 'Brown' };
const CHOICES: readonly SoundChoice[] = ['off', ...SOUNDS];

// Same segmented shape as the theme picker. The remembered sound reads as selected on a
// fresh load but is silent until Play — browsers block audio before a gesture anyway.
function FocusSound({ supported, sound, volume, playing, setSound, setVolume, play, pause }: ReturnType<typeof useFocusSound>) {
  const volumeId = useId();

  if (!supported) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Not supported in this browser.</p>;
  }

  return (
    <>
      <div role="group" aria-label="Focus sound" className="flex gap-1">
        {CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSound(c)}
            aria-pressed={sound === c}
            className={panelToggle(sound === c)}
          >
            {SOUND_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={playing ? pause : play}
          disabled={sound === 'off'}
          className={`${panelButton} disabled:opacity-50`}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <label htmlFor={volumeId} className="sr-only">Volume</label>
        <input
          id={volumeId}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          disabled={sound === 'off'}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Steady noise generated in the browser, looped while you drill. Nothing is downloaded.
      </p>
    </>
  );
}
