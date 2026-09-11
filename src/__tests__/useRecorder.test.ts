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

  test('start requests the mic and begins recording; stop produces a url', async () => {
    setup();
    const { result } = renderHook(() => useRecorder());
    expect(result.current.supported).toBe(true);

    await act(() => result.current.start());
    expect(result.current.recording).toBe(true);
    expect(result.current.url).toBeNull();

    act(() => result.current.stop());
    await waitFor(() => expect(result.current.url).toBe('blob:mock-url'));
    expect(result.current.recording).toBe(false);
  });

  test('a denied mic permission fails silently, staying not-recording with no url', async () => {
    setup({ permissionDenied: true });
    const { result } = renderHook(() => useRecorder());
    await act(() => result.current.start());
    expect(result.current.recording).toBe(false);
    expect(result.current.url).toBeNull();
  });

  test('unmount stops any open media tracks', async () => {
    const { tracks } = setup();
    const { result, unmount } = renderHook(() => useRecorder());
    await act(() => result.current.start());
    unmount();
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });
});
