import type { LocalImage } from "../types";

export const MAX_IMAGE_COUNT = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

type ImageDimensions = { width: number; height: number };

export type ImageServices = {
  createObjectURL: (file: File) => string;
  revokeObjectURL: (url: string) => void;
  decodeImage: (url: string) => Promise<ImageDimensions>;
  createId: () => string;
};

export type PrepareImagesResult =
  | { ok: true; images: LocalImage[] }
  | { ok: false; message: string };

export const browserImageServices: ImageServices = {
  createObjectURL: (file) => URL.createObjectURL(file),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createId: () => crypto.randomUUID(),
  decodeImage: async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  },
};

function extensionFor(file: File): ".png" | ".jpg" | null {
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  return null;
}

export function renumberImages(images: LocalImage[]): LocalImage[] {
  return images.map((image, index) => ({
    ...image,
    generatedPath: `screenshots/${String(index + 1).padStart(2, "0")}${extensionFor(image.file)}`,
  }));
}

export async function prepareLocalImages(
  files: File[],
  existing: LocalImage[],
  services: ImageServices = browserImageServices,
): Promise<PrepareImagesResult> {
  if (files.length === 0) return { ok: true, images: [] };
  if (existing.length + files.length > MAX_IMAGE_COUNT) {
    return { ok: false, message: `Choose no more than ${MAX_IMAGE_COUNT} images.` };
  }

  const invalidType = files.find((file) => extensionFor(file) === null);
  if (invalidType) {
    return { ok: false, message: `${invalidType.name} is not a PNG or JPEG image.` };
  }
  const oversized = files.find((file) => file.size > MAX_FILE_BYTES);
  if (oversized) {
    return { ok: false, message: `${oversized.name} is larger than 25 MiB.` };
  }
  const totalBytes = [...existing.map((image) => image.file), ...files].reduce(
    (total, file) => total + file.size,
    0,
  );
  if (totalBytes > MAX_TOTAL_BYTES) {
    return { ok: false, message: "The selected images exceed the 100 MiB session limit." };
  }

  const created: LocalImage[] = [];
  try {
    for (const file of files) {
      const objectUrl = services.createObjectURL(file);
      try {
        const dimensions = await services.decodeImage(objectUrl);
        if (dimensions.width < 1 || dimensions.height < 1) throw new Error("empty image");
        created.push({
          id: services.createId(),
          file,
          objectUrl,
          width: dimensions.width,
          height: dimensions.height,
          generatedPath: "",
        });
      } catch {
        services.revokeObjectURL(objectUrl);
        throw new Error(`${file.name} could not be decoded as an image.`);
      }
    }
  } catch (error) {
    for (const image of created) services.revokeObjectURL(image.objectUrl);
    return { ok: false, message: error instanceof Error ? error.message : "Image decoding failed." };
  }

  return { ok: true, images: renumberImages(created) };
}

export function moveImage(images: LocalImage[], fromIndex: number, toIndex: number): LocalImage[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) {
    return images;
  }
  const next = [...images];
  const [image] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, image);
  return renumberImages(next);
}

export function removeImage(images: LocalImage[], id: string): LocalImage[] {
  return renumberImages(images.filter((image) => image.id !== id));
}
