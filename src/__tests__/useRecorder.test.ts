import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecorder } from '../hooks/useRecorder';

let recorderSeq = 0;

class MockMediaRecorder {
  id = ++recorderSeq;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: MediaStream) {}
  start() {
    this.state = 'recording';
  }
  // Real MediaRecorder fires these asynchronously. A synchronous mock cannot observe
  // the orderings the run guards exist for, and even a microtask lands too early to
  // reproduce "stop #1 arrives after recording #2 started" — so tests that care about
  // that ordering set `manual` and release the handler themselves.
  static manual = false;
  static pending: (() => void)[] = [];

  stop() {
    this.state = 'inactive';
    const fire = () => {
      this.ondataavailable?.({ data: new Blob([`chunk-${this.id}`]) });
      this.onstop?.();
    };
    if (MockMediaRecorder.manual) MockMediaRecorder.pending.push(fire);
    else queueMicrotask(fire);
  }
}

function flushStops() {
  const queued = MockMediaRecorder.pending;
  MockMediaRecorder.pending = [];
  for (const fire of queued) fire();
}

function mockTrack() {
  return { stop: vi.fn() };
}

function setup({ supported = true, permissionDenied = false } = {}) {
  const tracks = [mockTrack()];
  const getUserMedia = vi.fn().mockImplementation(() =>
    permissionDenied
      ? Promise.reject(new Error('Permission denied'))
      : Promise.resolve({ getTracks: () => tracks } as unknown as MediaStream),
  );
  vi.stubGlobal('MediaRecorder', supported ? MockMediaRecorder : undefined);
  vi.stubGlobal('navigator', { mediaDevices: supported ? { getUserMedia } : undefined });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });
  return { getUserMedia, tracks };
}

afterEach(() => {
  vi.unstubAllGlobals();
  MockMediaRecorder.manual = false;
  MockMediaRecorder.pending = [];
});

describe('useRecorder', () => {
  test('reports unsupported when MediaRecorder/getUserMedia are unavailable', () => {
    setup({ supported: false });
    const { result } = renderHook(() => useRecorder());
    expect(result.current.supported).toBe(false);
  });

  test('toggling on requests the mic; toggling off produces a url', async () => {
    setup();
    const { result } = renderHook(() => useRecorder());
    expect(result.current.supported).toBe(true);

    await act(async () => result.current.toggle());
    expect(result.current.recording).toBe(true);
    expect(result.current.url).toBeNull();

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.url).toBe('blob:mock-url'));
    expect(result.current.recording).toBe(false);
  });

  test('a denied mic permission fails silently, staying not-recording with no url', async () => {
    setup({ permissionDenied: true });
    const { result } = renderHook(() => useRecorder());
    await act(async () => result.current.toggle());
    expect(result.current.recording).toBe(false);
    expect(result.current.url).toBeNull();
  });

  test('unmount stops any open media tracks', async () => {
    const { tracks } = setup();
    const { result, unmount } = renderHook(() => useRecorder());
    await act(async () => result.current.toggle());
    unmount();
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });

  // The bug this replaced hold-to-record for: start() awaited getUserMedia while the
  // release read a still-null recorderRef, no-opped, and then the await resolved and
  // opened a recording nothing would ever stop — leaving the mic live for the session.
  test('stopping while the permission prompt is still up never opens the mic', async () => {
    const tracks = [mockTrack()];
    let resolveMedia: (s: MediaStream) => void = () => {};
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((res) => { resolveMedia = res; }));
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });

    const { result } = renderHook(() => useRecorder());
    act(() => result.current.toggle());          // starts, awaiting the prompt
    act(() => result.current.toggle());          // user taps again before it resolves
    await act(async () => {
      resolveMedia({ getTracks: () => tracks } as unknown as MediaStream);
    });

    expect(result.current.recording).toBe(false);
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });

  test('unmounting while the permission prompt is up also releases the mic', async () => {
    const tracks = [mockTrack()];
    let resolveMedia: (s: MediaStream) => void = () => {};
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((res) => { resolveMedia = res; }));
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });

    const { result, unmount } = renderHook(() => useRecorder());
    act(() => result.current.toggle());
    unmount();
    await act(async () => {
      resolveMedia({ getTracks: () => tracks } as unknown as MediaStream);
    });
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });

  // onstop is async, so a stop landing after the next recording has started used to
  // clear streamRef for the run that replaced it — unmount then stopped no tracks and
  // the mic stayed live for the session.
  test('a stop landing during the next recording does not release the new one', async () => {
    const s1 = [mockTrack()];
    const s2 = [mockTrack()];
    const streams = [s1, s2];
    let call = 0;
    const getUserMedia = vi.fn(() =>
      Promise.resolve({ getTracks: () => streams[call++]! } as unknown as MediaStream),
    );
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });

    MockMediaRecorder.manual = true;
    const { result, unmount } = renderHook(() => useRecorder());
    await act(async () => result.current.toggle());   // recording 1
    act(() => result.current.toggle());               // stop 1 — onstop held back
    await act(async () => result.current.toggle());   // recording 2 starts
    expect(result.current.recording).toBe(true);

    // Now stop #1's handler finally lands, mid-recording-#2.
    await act(async () => { flushStops(); });

    expect(result.current.recording).toBe(true);
    unmount();
    for (const t of s1) expect(t.stop).toHaveBeenCalled();
    for (const t of s2) expect(t.stop).toHaveBeenCalled();
  });

  // An abandoned permission prompt rejecting later must not cancel a recording the
  // user has since successfully started.
  test('a late permission rejection does not cancel a newer recording', async () => {
    const tracks = [mockTrack()];
    let rejectFirst: (e: Error) => void = () => {};
    let call = 0;
    const getUserMedia = vi.fn(() => {
      if (call++ === 0) return new Promise<MediaStream>((_, rej) => { rejectFirst = rej; });
      return Promise.resolve({ getTracks: () => tracks } as unknown as MediaStream);
    });
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() });

    const { result } = renderHook(() => useRecorder());
    act(() => result.current.toggle());               // start 1, prompt pending
    act(() => result.current.toggle());               // user gives up
    await act(async () => result.current.toggle());   // start 2, succeeds
    expect(result.current.recording).toBe(true);

    await act(async () => {
      rejectFirst(new Error('Permission denied'));
      await Promise.resolve();
    });

    // Intent must still be "recording", so the next click stops rather than starting a third.
    act(() => result.current.toggle());
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(result.current.recording).toBe(false);
  });
});
