import { useEffect, useRef, useState } from 'react';

// Click-to-toggle recording over MediaRecorder + getUserMedia. Nothing is ever
// persisted or sent anywhere — the object URL lives only in memory for this question,
// and is revoked on unmount or before a re-record so it never leaks.
//
// Deliberately a toggle rather than hold-to-record. Press/release pairing created a
// race: start() awaits getUserMedia while a release reads a still-null recorderRef,
// no-ops, and then the await resolves and starts a recording nothing will ever stop —
// so a quick tap, or the first-use permission prompt, left the mic live for the whole
// session. A toggle also makes it operable by keyboard and switch users (WCAG 2.1.1).
export function useRecorder() {
  const supported = typeof MediaRecorder !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  // Bumped by every stop and by unmount, so a start() whose getUserMedia is still in
  // flight can tell it has been superseded and tear the stream down instead of opening
  // a recording no later stop will reach.
  const runIdRef = useRef(0);
  // Intent, tracked synchronously. `recording` state does not flip until getUserMedia
  // resolves, so a toggle keyed off it would fire a second start — not a stop — when
  // the user taps again while the permission prompt is still up.
  const wantRecordingRef = useRef(false);

  const revoke = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  useEffect(() => () => {
    wantRecordingRef.current = false;
    runIdRef.current++;
    const recorder = recorderRef.current;
    if (recorder) {
      // Detach first: stopping the tracks below fires onstop, which would otherwise
      // mint a fresh object URL nothing can revoke and setState on a dead hook.
      recorder.ondataavailable = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') recorder.stop();
      recorderRef.current = null;
    }
    revoke();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = async () => {
    if (!supported || wantRecordingRef.current) return;
    wantRecordingRef.current = true;
    const runId = ++runIdRef.current;
    revoke();
    setUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stopped (or unmounted) while the permission prompt was up — never open the mic.
      if (runId !== runIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      // Chunks are captured per-recording rather than shared through a ref: onstop is
      // async, so a stop-then-immediately-record leaves recording #1's onstop landing
      // partway through recording #2, where a shared array mixes their audio together.
      const chunks: Blob[] = [];
      chunksRef.current = chunks;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // onstop is async, so by the time it runs a NEW recording may already have
        // replaced this one. Publish only if this is still the current recorder —
        // keyed on the recorder itself, not runId, which stop() bumps before the
        // handler fires. Without this the late handler cleared streamRef for the run
        // that replaced it, so unmount stopped no tracks and the mic stayed live.
        if (recorderRef.current !== recorder) return;
        streamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const next = URL.createObjectURL(blob);
        urlRef.current = next;
        setUrl(next);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // Mic permission denied or unavailable — fail silently, same as "not supported".
      // Only clear intent if this run is still the current one: an abandoned prompt
      // rejecting later must not cancel a recording the user has since started.
      if (runId === runIdRef.current) wantRecordingRef.current = false;
    }
  };

  const stop = () => {
    wantRecordingRef.current = false;
    runIdRef.current++;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setRecording(false);
  };

  const toggle = () => {
    if (wantRecordingRef.current) stop();
    else void start();
  };

  return { supported, recording, url, toggle };
}
