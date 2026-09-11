import { useEffect, useRef, useState } from 'react';

// Hold-to-record over MediaRecorder + getUserMedia. Nothing is ever persisted or
// sent anywhere — the object URL lives only in memory for this question, and is
// revoked on unmount or before a re-record so it never leaks.
export function useRecorder() {
  const supported = typeof MediaRecorder !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);

  const revoke = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  useEffect(() => () => {
    revoke();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    if (!supported || recording) return;
    revoke();
    setUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const next = URL.createObjectURL(blob);
        urlRef.current = next;
        setUrl(next);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // Mic permission denied or unavailable — fail silently, same as "not supported".
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    setRecording(false);
  };

  return { supported, recording, url, start, stop };
}
