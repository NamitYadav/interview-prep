import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FOCUS_SOUND_KEY, FOCUS_VOLUME_KEY, fillNoise, SOUNDS, useFocusSound } from '../hooks/useFocusSound';

beforeEach(() => localStorage.clear());

// Sum of absolute adjacent-sample differences: a cheap stand-in for high-frequency energy.
// White noise is uncorrelated sample to sample; pink and brown roll off, so neighbours
// sit closer together.
const roughness = (buf: Float32Array) => {
  let sum = 0;
  for (let i = 1; i < buf.length; i++) sum += Math.abs(buf[i]! - buf[i - 1]!);
  return sum / buf.length;
};

describe('fillNoise', () => {
  const N = 44_100;

  test.each(SOUNDS)('%s stays within [-1, 1] and is not silent', (kind) => {
    const buf = fillNoise(kind, new Float32Array(N));
    let max = 0;
    for (const v of buf) max = Math.max(max, Math.abs(v));
    expect(max).toBeLessThanOrEqual(1);
    expect(max).toBeGreaterThan(0.1);
  });

  test('pink is smoother than white, brown smoother than pink', () => {
    const white = roughness(fillNoise('white', new Float32Array(N)));
    const pink = roughness(fillNoise('pink', new Float32Array(N)));
    const brown = roughness(fillNoise('brown', new Float32Array(N)));
    expect(pink).toBeLessThan(white);
    expect(brown).toBeLessThan(pink);
  });
});

// jsdom has no Web Audio. A minimal stub records what the hook does to the graph.
class FakeSource {
  buffer: AudioBuffer | null = null;
  loop = false;
  started = false;
  stopped = false;
  connect() {}
  disconnect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class FakeGain {
  gain = { value: 1 };
  connect() {}
}
class FakeContext {
  static instances: FakeContext[] = [];
  sources: FakeSource[] = [];
  gainNode = new FakeGain();
  state: 'running' | 'suspended' | 'closed' = 'running';
  sampleRate = 44_100;
  destination = {};
  constructor() { FakeContext.instances.push(this); }
  createBuffer(_ch: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data, length } as unknown as AudioBuffer;
  }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createGain() { return this.gainNode; }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  /** The one context the hook opened, and its nth source. */
  static ctx() { return FakeContext.instances[0]!; }
  static source(i = 0) { return FakeContext.ctx().sources[i]!; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}

describe('useFocusSound', () => {
  beforeEach(() => {
    FakeContext.instances = [];
    vi.stubGlobal('AudioContext', FakeContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  test('starts off at the default volume without touching audio', () => {
    const { result } = renderHook(() => useFocusSound());
    expect(result.current.sound).toBe('off');
    expect(result.current.volume).toBe(0.3);
    expect(FakeContext.instances).toHaveLength(0);
  });

  test('picking a sound creates one context and starts one looping source at the set volume', () => {
    const { result } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('pink'));
    expect(FakeContext.instances).toHaveLength(1);
    const ctx = FakeContext.ctx();
    expect(ctx.sources).toHaveLength(1);
    expect(FakeContext.source().loop).toBe(true);
    expect(FakeContext.source().started).toBe(true);
    expect(ctx.gainNode.gain.value).toBe(0.3);
  });

  test('switching sound stops the old source and starts a new one on the same context', () => {
    const { result } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('white'));
    act(() => result.current.setSound('brown'));
    expect(FakeContext.instances).toHaveLength(1);
    const first = FakeContext.source(0);
    const second = FakeContext.source(1);
    expect(first.stopped).toBe(true);
    expect(second.started).toBe(true);
    expect(second.stopped).toBe(false);
  });

  test('volume changes drive the gain node directly', () => {
    const { result } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('white'));
    act(() => result.current.setVolume(0.8));
    expect(FakeContext.ctx().gainNode.gain.value).toBe(0.8);
  });

  test('off stops the source and suspends the context', () => {
    const { result } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('white'));
    act(() => result.current.setSound('off'));
    const ctx = FakeContext.ctx();
    expect(FakeContext.source().stopped).toBe(true);
    expect(ctx.state).toBe('suspended');
  });

  test('unmount stops playback and closes the context', () => {
    const { result, unmount } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('white'));
    unmount();
    const ctx = FakeContext.ctx();
    expect(FakeContext.source().stopped).toBe(true);
    expect(ctx.state).toBe('closed');
  });

  test('sound and volume persist, but a stored sound restores as a preference and stays silent', () => {
    const { result, unmount } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('brown'));
    act(() => result.current.setVolume(0.5));
    unmount();
    expect(localStorage.getItem(FOCUS_SOUND_KEY)).toBe('brown');
    expect(localStorage.getItem(FOCUS_VOLUME_KEY)).toBe('0.5');

    FakeContext.instances = [];
    const { result: again } = renderHook(() => useFocusSound());
    expect(again.current.sound).toBe('brown');
    expect(again.current.volume).toBe(0.5);
    expect(again.current.playing).toBe(false);
    expect(FakeContext.instances).toHaveLength(0);
  });

  test('play resumes a remembered sound', () => {
    localStorage.setItem(FOCUS_SOUND_KEY, 'pink');
    const { result } = renderHook(() => useFocusSound());
    act(() => result.current.play());
    expect(result.current.playing).toBe(true);
    expect(FakeContext.source().started).toBe(true);
  });

  test('pause stops playback but keeps the sound preference', () => {
    const { result } = renderHook(() => useFocusSound());
    act(() => result.current.setSound('white'));
    act(() => result.current.pause());
    expect(result.current.playing).toBe(false);
    expect(result.current.sound).toBe('white');
    expect(FakeContext.ctx().state).toBe('suspended');
  });

  test('unsupported browsers report it and every action is a no-op', () => {
    vi.stubGlobal('AudioContext', undefined);
    const { result } = renderHook(() => useFocusSound());
    expect(result.current.supported).toBe(false);
    act(() => result.current.setSound('white'));
    expect(result.current.playing).toBe(false);
  });
});
