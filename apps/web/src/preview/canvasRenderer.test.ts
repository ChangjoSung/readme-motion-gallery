import { defaultConfig } from "../state/editorState";
import { calculateImageDraw, renderCanvasPreview, type PreviewSource } from "./canvasRenderer";
import type { CardPlacement } from "./layout";

function recordingContext() {
  const calls: string[] = [];
  const context = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    clearRect: (...values: number[]) => calls.push(`clear:${values.join(",")}`),
    fillRect: (...values: number[]) => calls.push(`fillRect:${values.join(",")}`),
    beginPath: () => calls.push("begin"),
    closePath: () => calls.push("close"),
    moveTo: (...values: number[]) => calls.push(`move:${values.join(",")}`),
    lineTo: (...values: number[]) => calls.push(`line:${values.join(",")}`),
    quadraticCurveTo: (...values: number[]) => calls.push(`curve:${values.join(",")}`),
    rect: (...values: number[]) => calls.push(`rect:${values.join(",")}`),
    clip: () => calls.push("clip"),
    fill: () => calls.push("fill"),
    stroke: () => calls.push("stroke"),
    drawImage: (...values: unknown[]) => calls.push(`draw:${values.slice(1).join(",")}`),
    set fillStyle(value: string) { calls.push(`fillStyle:${value}`); },
    set strokeStyle(value: string) { calls.push(`strokeStyle:${value}`); },
    set lineWidth(value: number) { calls.push(`lineWidth:${value}`); },
    set shadowColor(value: string) { calls.push(`shadowColor:${value}`); },
    set shadowBlur(value: number) { calls.push(`shadowBlur:${value}`); },
    set shadowOffsetX(value: number) { calls.push(`shadowOffsetX:${value}`); },
    set shadowOffsetY(value: number) { calls.push(`shadowOffsetY:${value}`); },
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  };
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

describe("Canvas visual parity", () => {
  const placement: CardPlacement = { x: 100, y: 50, width: 400, height: 200 };

  it("calculates Pillow-compatible contain and cover geometry", () => {
    expect(calculateImageDraw(400, 400, placement, true)).toEqual({
      sx: 0, sy: 0, sw: 400, sh: 400, dx: 200, dy: 50, dw: 200, dh: 200,
    });
    expect(calculateImageDraw(400, 400, placement, false)).toEqual({
      sx: 0, sy: 100, sw: 400, sh: 200, dx: 100, dy: 50, dw: 400, dh: 200,
    });
  });

  it("emits rounded clip, shadow, border, image, and scan-line commands for a representative wipe", () => {
    const { context, calls } = recordingContext();
    const source: PreviewSource = { source: {} as CanvasImageSource, width: 800, height: 450 };
    renderCanvasPreview(
      context,
      { ...defaultConfig, images: [{ path: "screenshots/01.png" }] },
      [placement],
      [source],
      { stableIndices: [], transitioningIndex: 0, revealFraction: 0.5, visibleCardCount: 1 },
    );
    expect(calls).toContain("clear:0,0,1280,720");
    expect(calls).toContain("rect:86,36,214,228");
    expect(calls).toContain("shadowBlur:18");
    expect(calls).toContain("strokeStyle:#745f4c");
    expect(calls.some((call) => call.startsWith("draw:"))).toBe(true);
    expect(calls).toContain("lineWidth:5");
    expect(calls).toContain("lineWidth:2");
  });

  it("draws all cumulative stable cards but only the active replace card", () => {
    const sources = Array.from({ length: 3 }, () => ({ source: {} as CanvasImageSource, width: 16, height: 9 }));
    const placements = Array.from({ length: 3 }, (_, index) => ({ x: index * 100, y: 0, width: 90, height: 50 }));
    const cumulative = recordingContext();
    renderCanvasPreview(cumulative.context, defaultConfig, placements, sources, {
      stableIndices: [0, 1], transitioningIndex: 2, revealFraction: 0.5, visibleCardCount: 3,
    });
    expect(cumulative.calls.filter((call) => call.startsWith("draw:")).length).toBe(3);

    const replace = recordingContext();
    renderCanvasPreview(replace.context, defaultConfig, placements, sources, {
      stableIndices: [], transitioningIndex: 2, revealFraction: 0.5, visibleCardCount: 1,
    });
    expect(replace.calls.filter((call) => call.startsWith("draw:")).length).toBe(1);
  });
});
