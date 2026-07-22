import type { LocalImage } from "../types";
import { previewSourceServices } from "./usePreviewSources";

describe("large preview image handling", () => {
  it("caps the decoded preview edge at 2048 px and releases the bitmap", async () => {
    const close = vi.fn();
    const createBitmap = vi.fn(async () => ({ width: 2048, height: 1024, close }));
    vi.stubGlobal("createImageBitmap", createBitmap);
    const image: LocalImage = {
      id: "large",
      file: new File(["large"], "large.png", { type: "image/png" }),
      objectUrl: "blob:large",
      width: 8192,
      height: 4096,
      generatedPath: "screenshots/01.png",
    };
    const resource = await previewSourceServices.create(image);
    expect(createBitmap).toHaveBeenCalledWith(
      image.file,
      expect.objectContaining({ resizeWidth: 2048, resizeHeight: 1024, resizeQuality: "high" }),
    );
    resource.close();
    expect(close).toHaveBeenCalledOnce();
  });
});
