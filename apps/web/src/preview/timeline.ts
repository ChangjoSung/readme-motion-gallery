import type { GalleryConfigV1 } from "../types";

type Animation = GalleryConfigV1["animation"];

export type AnimationMetrics = { frameCount: number; durationMs: number };
export type PreviewFrameState = {
  stableIndices: number[];
  transitioningIndex: number | null;
  revealFraction: number;
  visibleCardCount: number;
};

export function calculateAnimationMetrics(imageCount: number, animation: Animation): AnimationMetrics {
  if (imageCount < 1) return { frameCount: 0, durationMs: 0 };
  return {
    frameCount: imageCount * animation.frames_per_transition + (animation.initial_hold_ms > 0 ? 1 : 0),
    durationMs:
      animation.initial_hold_ms +
      imageCount * animation.transition_ms +
      (imageCount - 1) * animation.hold_ms +
      animation.final_hold_ms,
  };
}

function stableIndices(count: number, revealMode: Animation["reveal_mode"]): number[] {
  if (count < 1) return [];
  return revealMode === "cumulative" ? Array.from({ length: count }, (_, index) => index) : [count - 1];
}

export function getPreviewFrameState(imageCount: number, animation: Animation, elapsedMs: number): PreviewFrameState {
  const empty = { stableIndices: [], transitioningIndex: null, revealFraction: 0, visibleCardCount: 0 };
  if (imageCount < 1) return empty;
  const { durationMs } = calculateAnimationMetrics(imageCount, animation);
  const elapsed = Math.min(Math.max(0, elapsedMs), durationMs);
  if (elapsed < animation.initial_hold_ms) return empty;

  let cursor = animation.initial_hold_ms;
  for (let index = 0; index < imageCount; index += 1) {
    const transitionEnd = cursor + animation.transition_ms;
    if (elapsed < transitionEnd) {
      const fraction = Math.min(1, Math.max(0, (elapsed - cursor) / animation.transition_ms));
      const stable = animation.reveal_mode === "cumulative" ? stableIndices(index, "cumulative") : [];
      return {
        stableIndices: stable,
        transitioningIndex: index,
        revealFraction: fraction,
        visibleCardCount: stable.length + (fraction > 0 ? 1 : 0),
      };
    }

    cursor = transitionEnd;
    const hold = index === imageCount - 1 ? animation.final_hold_ms : animation.hold_ms;
    const revealed = stableIndices(index + 1, animation.reveal_mode);
    if (elapsed < cursor + hold || index === imageCount - 1) {
      return {
        stableIndices: revealed,
        transitioningIndex: null,
        revealFraction: 1,
        visibleCardCount: revealed.length,
      };
    }
    cursor += hold;
  }
  return empty;
}

export function revealEndTime(index: number, animation: Animation): number {
  return animation.initial_hold_ms + index * (animation.transition_ms + animation.hold_ms) + animation.transition_ms;
}
