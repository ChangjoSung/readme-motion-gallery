import { createInitialState, editorReducer } from "./editorState";
import { moveImage } from "./localImages";
import { validateConfig } from "./validation";
import type { LocalImage } from "../types";

function localImage(id: string, type = "image/png"): LocalImage {
  return {
    id,
    file: new File([id], `${id}.${type === "image/png" ? "png" : "jpg"}`, { type }),
    objectUrl: `blob:${id}`,
    width: 640,
    height: 360,
    generatedPath: "",
  };
}

describe("editor state", () => {
  it("starts with every version 1 default and an image validation error", () => {
    const state = createInitialState();
    expect(state.config).toMatchObject({
      version: 1,
      canvas: { width: 1280, height: 720, background: "#07080c" },
      layout: { type: "staggered", border_radius: 10, preserve_aspect_ratio: true },
      animation: { transition: "wipe", frames_per_transition: 7, loop: true },
      output: { path: "assets/readme-gallery.gif", max_size_mb: 8, colors: 224 },
    });
    expect(validateConfig(state.config)).toMatchObject({ valid: false, errors: { images: "must NOT have fewer than 1 items" } });
  });

  it("preserves an invalid user value and reports it without resetting the document", () => {
    const initial = createInitialState();
    const state = editorReducer(initial, { type: "set-config", path: "canvas.width", value: 319 });
    expect(state.config.canvas.width).toBe(319);
    expect(state.config.canvas.height).toBe(720);
    expect(validateConfig(state.config).errors["canvas.width"]).toBe("must be >= 320");
  });

  it("keeps uploaded images when a preset is applied", () => {
    const image = { ...localImage("hero"), generatedPath: "screenshots/01.png" };
    const withImage = editorReducer(createInitialState(), { type: "set-images", images: [image] });
    const preset = editorReducer(withImage, { type: "apply-preset", preset: "compact" });
    expect(preset.config.layout.type).toBe("grid");
    expect(preset.localImages).toEqual([image]);
    expect(preset.config.images).toEqual([{ path: "screenshots/01.png" }]);
  });

  it("renumbers generated paths after reordering mixed image formats", () => {
    const images = [localImage("first"), localImage("second", "image/jpeg")];
    const reordered = moveImage(images, 1, 0);
    expect(reordered.map((image) => image.id)).toEqual(["second", "first"]);
    expect(reordered.map((image) => image.generatedPath)).toEqual([
      "screenshots/01.jpg",
      "screenshots/02.png",
    ]);
  });
});
