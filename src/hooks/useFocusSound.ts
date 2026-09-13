import { useEffect, useRef, useState } from 'react';
import { useStoredValue } from './useStoredValue';

export const SOUNDS = ['white', 'pink', 'brown'] as const;
export type Sound = (typeof SOUNDS)[number];

/** Fills `out` with one loop of noise. Pure; seeded only by Math.random. */
export function fillNoise(kind: Sound, out: Float32Array): Float32Array {
  if (kind === 'white') {
    for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
    return out;
  }
  if (kind === 'pink') {
    // Paul Kellet's refined pink filter (musicdsp.org); the 0.11 trims it back into [-1, 1].
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < out.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return out;
  }
  // Brown: a leaky integrator over white, scaled up so it isn't whisper-quiet.
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    out[i] = last * 3.5;
  }
  return out;
}

export const FOCUS_SOUND_KEY = 'interview-prep:focus-sound';
export const FOCUS_VOLUME_KEY = 'interview-prep:focus-volume';
const DEFAULT_VOLUME = 0.3;
const LOOP_SECONDS = 2;

export type SoundChoice = Sound | 'off';

// Per-device preferences, same shape as useTheme/useStrictMode: not prep data, so they stay
// out of export/import backups.
const decodeSound = (raw: string | null): SoundChoice =>
  (SOUNDS as readonly string[]).includes(raw ?? '') ? (raw as Sound) : 'off';
const encodeSound = (v: SoundChoice): string | null => (v === 'off' ? null : v);
const decodeVolume = (raw: string | null): number => {
  const n = Number(raw);
  return raw !== null && n >= 0 && n <= 1 ? n : DEFAULT_VOLUME;
};
const encodeVolume = (v: number): string | null => (v === DEFAULT_VOLUME ? null : String(v));

// Synthesized noise through one AudioContext, created lazily on the first play so nothing
// touches audio on load. The remembered sound is a preference only: playback is session
// state and never autostarts — browsers would block it before a gesture anyway. Torn down
// on unmount with the same discipline as useRecorder.
export function useFocusSound() {
  const supported = typeof AudioContext !== 'undefined';
  const [sound, setStoredSound] = useStoredValue(FOCUS_SOUND_KEY, decodeSound, encodeSound);
  const [volume, setStoredVolume] = useStoredValue(FOCUS_VOLUME_KEY, decodeVolume, encodeVolume);
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopSource = () => {
    sourceRef.current?.stop();
    sourceRef.current?.disconnect();
    sourceRef.current = null;
  };

  useEffect(() => () => {
    stopSource();
    void ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const start = (kind: Sound) => {
    if (!supported) return;
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
    }
    gainRef.current!.gain.value = volume;
    stopSource();
    // A couple of seconds of random samples loops without an audible seam.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * LOOP_SECONDS, ctx.sampleRate);
    fillNoise(kind, buffer.getChannelData(0));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(gainRef.current!);
    src.start();
    sourceRef.current = src;
    void ctx.resume();
    setPlaying(true);
  };

  const pause = () => {
    stopSource();
    void ctxRef.current?.suspend();
    setPlaying(false);
  };

  const play = () => {
    if (sound !== 'off') start(sound);
  };

  const setSound = (kind: SoundChoice) => {
    setStoredSound(kind);
    if (kind === 'off') pause();
    else start(kind);
  };

  const setVolume = (v: number) => {
    setStoredVolume(v);
    if (gainRef.current) gainRef.current.gain.value = v;
  };

  return { supported, sound, volume, playing, setSound, setVolume, play, pause };
}
