import parityFixture from "../../../../schema/preview-parity-v1.json";
import { defaultConfig } from "../state/editorState";
import type { GalleryConfigV1 } from "../types";
import { calculatePlacements, roundHalfEven } from "./layout";

describe("Python-compatible preview layout", () => {
  it("uses Python round-half-to-even behavior", () => {
    expect([0.5, 1.5, 2.5, 3.5, -0.5, -1.5, -2.5].map(roundHalfEven)).toEqual([0, 2, 2, 4, 0, -2, -2]);
  });

  it.each(parityFixture.cases)("matches every placement in $id", (fixture) => {
    const placements = calculatePlacements(
      fixture.image_count,
      { ...defaultConfig.canvas, ...fixture.canvas },
      { ...defaultConfig.layout, ...fixture.layout } as GalleryConfigV1["layout"],
    );
    expect(placements).toEqual(fixture.expected.placements);
  });
});
