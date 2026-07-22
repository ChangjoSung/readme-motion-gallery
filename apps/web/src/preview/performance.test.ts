import { defaultConfig } from "../state/editorState";
import { calculatePlacements } from "./layout";
import { getPreviewFrameState } from "./timeline";

describe("preview calculation performance budget", () => {
  it("calculates 1,000 ten-image layout and timeline states within 250 ms", () => {
    const startedAt = performance.now();
    for (let index = 0; index < 1_000; index += 1) {
      calculatePlacements(10, defaultConfig.canvas, defaultConfig.layout);
      getPreviewFrameState(10, defaultConfig.animation, index % 6_830);
    }
    expect(performance.now() - startedAt).toBeLessThan(250);
  });
});
