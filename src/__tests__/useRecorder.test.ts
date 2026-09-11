import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecorder } from '../hooks/useRecorder';

class MockMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(public stream: MediaStream) {}
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['chunk']) });
    this.onstop?.();
  }
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
});
