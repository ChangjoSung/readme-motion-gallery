import {
  MAX_FILE_BYTES,
  MAX_IMAGE_COUNT,
  MAX_TOTAL_BYTES,
  type ImageServices,
  prepareLocalImages,
} from "./localImages";
import type { LocalImage } from "../types";

function services(): ImageServices {
  let id = 0;
  return {
    createObjectURL: vi.fn((file) => `blob:${file.name}`),
    revokeObjectURL: vi.fn(),
    decodeImage: vi.fn(async () => ({ width: 1280, height: 720 })),
    createId: vi.fn(() => `image-${++id}`),
  };
}

function existingImage(index: number): LocalImage {
  const file = new File(["x"], `old-${index}.png`, { type: "image/png" });
  return { id: `old-${index}`, file, objectUrl: `blob:old-${index}`, width: 1, height: 1, generatedPath: `screenshots/${index}.png` };
}

describe("local image preparation", () => {
  it("decodes accepted files and creates deterministic mapping paths", async () => {
    const runtime = services();
    const files = [
      new File(["png"], "alpha.png", { type: "image/png" }),
      new File(["jpeg"], "beta.jpeg", { type: "image/jpeg" }),
    ];
    const result = await prepareLocalImages(files, [], runtime);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.images.map((image) => image.generatedPath)).toEqual(["screenshots/01.png", "screenshots/02.jpg"]);
    expect(runtime.decodeImage).toHaveBeenCalledTimes(2);
  });

  it("rejects unsupported, oversized, and excess-count inputs before decoding", async () => {
    const runtime = services();
    const unsupported = await prepareLocalImages([new File(["gif"], "clip.gif", { type: "image/gif" })], [], runtime);
    expect(unsupported).toEqual({ ok: false, message: "clip.gif is not a PNG or JPEG image." });

    const oversized = new File([new Uint8Array(1)], "huge.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: MAX_FILE_BYTES + 1 });
    expect(await prepareLocalImages([oversized], [], runtime)).toEqual({ ok: false, message: "huge.png is larger than 25 MiB." });

    const tooMany = await prepareLocalImages(
      [new File(["x"], "new.png", { type: "image/png" })],
      Array.from({ length: MAX_IMAGE_COUNT }, (_, index) => existingImage(index)),
      runtime,
    );
    expect(tooMany).toEqual({ ok: false, message: "Choose no more than 10 images." });
    expect(runtime.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects an aggregate selection larger than 100 MiB", async () => {
    const runtime = services();
    const file = new File(["x"], "aggregate.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 25 * 1024 * 1024 });
    const existing = Array.from({ length: 4 }, (_, index) => existingImage(index));
    for (const image of existing) Object.defineProperty(image.file, "size", { value: MAX_TOTAL_BYTES / 5 });
    const result = await prepareLocalImages([file], existing, runtime);
    expect(result).toEqual({ ok: false, message: "The selected images exceed the 100 MiB session limit." });
    expect(runtime.createObjectURL).not.toHaveBeenCalled();
  });

  it("revokes every newly-created URL if decoding fails", async () => {
    const runtime = services();
    vi.mocked(runtime.decodeImage)
      .mockResolvedValueOnce({ width: 100, height: 100 })
      .mockRejectedValueOnce(new Error("decode failed"));
    const result = await prepareLocalImages(
      [
        new File(["a"], "one.png", { type: "image/png" }),
        new File(["b"], "two.png", { type: "image/png" }),
      ],
      [],
      runtime,
    );
    expect(result).toEqual({ ok: false, message: "two.png could not be decoded as an image." });
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith("blob:one.png");
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith("blob:two.png");
  });
});
