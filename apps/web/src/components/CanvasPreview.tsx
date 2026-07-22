import { useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { useEditor } from "../state/EditorContext";
import { renderCanvasPreview } from "../preview/canvasRenderer";
import { calculatePlacements } from "../preview/layout";
import { calculateAnimationMetrics, getPreviewFrameState, revealEndTime } from "../preview/timeline";
import { usePreviewPlayback } from "../preview/usePreviewPlayback";
import { usePreviewSources } from "../preview/usePreviewSources";

function formatTime(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

export function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, setPlaying, setRevealedIndex } = useEditor();
  const { config, localImages } = state;
  const { sources, loading, error: sourceError } = usePreviewSources(localImages);
  const metrics = useMemo(
    () => calculateAnimationMetrics(localImages.length, config.animation),
    [config.animation, localImages.length],
  );
  const resetKey = localImages.map((image) => image.id).join("|");
  const { elapsedMs, seek } = usePreviewPlayback({
    durationMs: metrics.durationMs,
    playing: state.preview.playing,
    loop: config.animation.loop,
    resetKey,
    onPlayingChange: setPlaying,
  });
  const layoutResult = useMemo(() => {
    try {
      return { placements: calculatePlacements(localImages.length, config.canvas, config.layout), error: null };
    } catch (error) {
      return { placements: [], error: error instanceof Error ? error.message : "Preview layout failed." };
    }
  }, [config.canvas, config.layout, localImages.length]);
  const frame = useMemo(
    () => getPreviewFrameState(localImages.length, config.animation, elapsedMs),
    [config.animation, elapsedMs, localImages.length],
  );

  useEffect(() => {
    const index = frame.transitioningIndex ?? frame.stableIndices.at(-1) ?? 0;
    if (index !== state.preview.revealedIndex) setRevealedIndex(index);
  }, [frame.stableIndices, frame.transitioningIndex, setRevealedIndex, state.preview.revealedIndex]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || layoutResult.error) return;
    renderCanvasPreview(context, config, layoutResult.placements, sources, frame);
  }, [config, frame, layoutResult, sources]);

  const canPlay = localImages.length > 0 && !loading && !sourceError && !layoutResult.error;
  const currentIndex = Math.min(state.preview.revealedIndex, Math.max(0, localImages.length - 1));
  const jumpTo = (index: number) => {
    setPlaying(false);
    seek(revealEndTime(index, config.animation));
  };

  return (
    <>
      <div className="canvas-stage">
        <canvas
          ref={canvasRef}
          className="gallery-canvas"
          width={config.canvas.width}
          height={config.canvas.height}
          aria-label="Animated gallery browser preview"
          data-testid="preview-canvas"
        />
        {localImages.length === 0 && (
          <div className="canvas-overlay empty-preview">
            <span aria-hidden="true">▧</span>
            <strong>Your gallery starts here</strong>
            <p>Add at least one screenshot to preview the animation.</p>
          </div>
        )}
        {localImages.length > 0 && loading && <div className="canvas-overlay">Preparing local preview…</div>}
        {sourceError && <div className="canvas-overlay preview-error" role="alert">Could not prepare a local preview source.</div>}
        {layoutResult.error && <div className="canvas-overlay preview-error" role="alert">{layoutResult.error}</div>}
      </div>

      <div className="playback-controls" aria-label="Preview playback controls">
        <button type="button" onClick={() => setPlaying(!state.preview.playing)} disabled={!canPlay}>
          {state.preview.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => { setPlaying(false); seek(0); }} disabled={localImages.length === 0}>
          Restart
        </button>
        <button type="button" aria-label="Previous screenshot" onClick={() => jumpTo(currentIndex - 1)} disabled={currentIndex <= 0}>
          ←
        </button>
        <button type="button" aria-label="Next screenshot" onClick={() => jumpTo(currentIndex + 1)} disabled={currentIndex >= localImages.length - 1}>
          →
        </button>
        <output aria-live="polite">{formatTime(elapsedMs)} / {formatTime(metrics.durationMs)}</output>
      </div>
      <input
        className="timeline-scrubber"
        aria-label="Preview timeline"
        type="range"
        min={0}
        max={Math.max(0, metrics.durationMs)}
        step={1}
        value={Math.min(elapsedMs, metrics.durationMs)}
        disabled={metrics.durationMs === 0}
        onChange={(event) => { setPlaying(false); seek(Number(event.target.value)); }}
      />
      <div className="preview-meta">
        <span>{config.canvas.width} × {config.canvas.height}</span>
        <span>{config.layout.type}</span>
        <span>{config.animation.reveal_mode}</span>
        <span>{metrics.frameCount} GIF frames</span>
        <span>{frame.visibleCardCount} visible</span>
      </div>
    </>
  );
}
