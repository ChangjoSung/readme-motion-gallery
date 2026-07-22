import parityFixture from "../../../../schema/preview-parity-v1.json";
import { defaultConfig } from "../state/editorState";
import type { GalleryConfigV1 } from "../types";
import { calculateAnimationMetrics, getPreviewFrameState, revealEndTime } from "./timeline";

describe("Python-compatible preview timeline", () => {
  it.each(parityFixture.cases)("matches frame, duration, and revealed-card fixtures for $id", (fixture) => {
    const animation = { ...defaultConfig.animation, ...fixture.animation } as GalleryConfigV1["animation"];
    expect(calculateAnimationMetrics(fixture.image_count, animation)).toEqual({
      frameCount: fixture.expected.frame_count,
      durationMs: fixture.expected.duration_ms,
    });
    const visibleCounts = Array.from({ length: fixture.image_count }, (_, index) =>
      getPreviewFrameState(fixture.image_count, animation, revealEndTime(index, animation)).visibleCardCount,
    );
    expect(visibleCounts).toEqual(fixture.expected.visible_card_counts_after_reveal);
  });

  it("renders a linear left-to-right wipe between exact timing boundaries", () => {
    const animation = { ...defaultConfig.animation, initial_hold_ms: 100, transition_ms: 200, hold_ms: 50 };
    expect(getPreviewFrameState(2, animation, 100)).toMatchObject({ transitioningIndex: 0, revealFraction: 0 });
    expect(getPreviewFrameState(2, animation, 200)).toMatchObject({ transitioningIndex: 0, revealFraction: 0.5 });
    expect(getPreviewFrameState(2, animation, 300)).toMatchObject({ stableIndices: [0], revealFraction: 1 });
  });

  it("clears the previous card when replace mode begins the next transition", () => {
    const animation = {
      ...defaultConfig.animation,
      reveal_mode: "replace" as const,
      initial_hold_ms: 0,
      transition_ms: 100,
      hold_ms: 50,
    };
    expect(getPreviewFrameState(2, animation, 100).stableIndices).toEqual([0]);
    expect(getPreviewFrameState(2, animation, 150)).toMatchObject({
      stableIndices: [],
      transitioningIndex: 1,
      revealFraction: 0,
    });
  });
});
