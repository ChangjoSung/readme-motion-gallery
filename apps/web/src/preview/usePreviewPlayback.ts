import { useCallback, useEffect, useRef, useState } from "react";

type PlaybackOptions = {
  durationMs: number;
  playing: boolean;
  loop: boolean;
  resetKey: string;
  onPlayingChange: (playing: boolean) => void;
};

export function usePreviewPlayback({ durationMs, playing, loop, resetKey, onPlayingChange }: PlaybackOptions) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);

  const seek = useCallback((value: number) => {
    const next = Math.min(Math.max(0, value), durationMs);
    elapsedRef.current = next;
    setElapsedMs(next);
  }, [durationMs]);

  useEffect(() => {
    elapsedRef.current = 0;
    setElapsedMs(0);
    onPlayingChange(false);
  }, [onPlayingChange, resetKey]);

  useEffect(() => {
    if (elapsedRef.current > durationMs) seek(durationMs);
  }, [durationMs, seek]);

  useEffect(() => {
    if (!playing || durationMs <= 0) return;
    if (elapsedRef.current >= durationMs) seek(0);
    let frameId = 0;
    let previousTimestamp: number | null = null;
    const tick = (timestamp: number) => {
      if (previousTimestamp === null) previousTimestamp = timestamp;
      const delta = timestamp - previousTimestamp;
      previousTimestamp = timestamp;
      let next = elapsedRef.current + delta;
      if (next >= durationMs) {
        if (loop) next %= durationMs;
        else {
          seek(durationMs);
          onPlayingChange(false);
          return;
        }
      }
      elapsedRef.current = next;
      setElapsedMs(next);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, loop, onPlayingChange, playing, seek]);

  return { elapsedMs, seek };
}
