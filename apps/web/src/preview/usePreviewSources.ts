import { useEffect, useMemo, useRef, useState } from "react";

import type { LocalImage } from "../types";
import type { PreviewSource } from "./canvasRenderer";

const MAX_PREVIEW_EDGE = 2048;

type PreviewResource = PreviewSource & { close: () => void };

export const previewSourceServices = {
  async create(image: LocalImage): Promise<PreviewResource> {
    const scale = Math.min(1, MAX_PREVIEW_EDGE / image.width, MAX_PREVIEW_EDGE / image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(image.file, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: "high",
          imageOrientation: "from-image",
        });
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
      } catch {
        // Safari and older Chromium builds may reject one of the resize options; use the decoded local URL.
      }
    }

    const element = new Image();
    element.src = image.objectUrl;
    await element.decode();
    return { source: element, width: element.naturalWidth, height: element.naturalHeight, close: () => undefined };
  },
};

export function usePreviewSources(images: LocalImage[]) {
  const resourcesRef = useRef(new Map<string, PreviewResource>());
  const [revision, setRevision] = useState(0);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const signature = images.map((image) => `${image.id}:${image.objectUrl}`).join("|");

  useEffect(() => {
    let cancelled = false;
    const activeIds = new Set(images.map((image) => image.id));
    setFailedIds((current) => new Set([...current].filter((id) => activeIds.has(id))));
    for (const [id, resource] of resourcesRef.current) {
      if (!activeIds.has(id)) {
        resource.close();
        resourcesRef.current.delete(id);
      }
    }

    for (const image of images) {
      if (resourcesRef.current.has(image.id)) continue;
      void previewSourceServices.create(image).then((resource) => {
        if (cancelled || !activeIds.has(image.id)) {
          resource.close();
          return;
        }
        resourcesRef.current.set(image.id, resource);
        setFailedIds((current) => {
          const next = new Set(current);
          next.delete(image.id);
          return next;
        });
        setRevision((value) => value + 1);
      }).catch(() => {
        if (!cancelled) {
          setFailedIds((current) => new Set(current).add(image.id));
          setRevision((value) => value + 1);
        }
      });
    }
    setRevision((value) => value + 1);
    return () => {
      cancelled = true;
    };
  }, [images, signature]);

  useEffect(
    () => () => {
      for (const resource of resourcesRef.current.values()) resource.close();
      resourcesRef.current.clear();
    },
    [],
  );

  const sources = useMemo(
    () => images.map((image) => resourcesRef.current.get(image.id)),
    [images, revision],
  );
  return {
    sources,
    loading: sources.some((source, index) => !source && !failedIds.has(images[index].id)),
    error: images.some((image) => failedIds.has(image.id)),
  };
}
