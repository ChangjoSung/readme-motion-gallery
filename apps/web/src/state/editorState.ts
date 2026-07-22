import type { EditorState, GalleryConfigV1, LocalImage, OutputTab } from "../types";

export const defaultConfig: GalleryConfigV1 = {
  version: 1,
  canvas: { width: 1280, height: 720, background: "#07080c" },
  images: [],
  layout: {
    type: "staggered",
    margin: 32,
    gap: 24,
    card_aspect_ratio: 16 / 9,
    preserve_aspect_ratio: true,
    border_radius: 10,
    border_width: 2,
    border_color: "#745f4c",
    shadow: true,
  },
  animation: {
    transition: "wipe",
    reveal_mode: "cumulative",
    transition_ms: 420,
    hold_ms: 800,
    initial_hold_ms: 450,
    final_hold_ms: 2300,
    frames_per_transition: 7,
    scan_line: true,
    loop: true,
  },
  output: { path: "assets/readme-gallery.gif", max_size_mb: 8, colors: 224 },
};

export const presets = {
  balanced: defaultConfig,
  compact: {
    ...defaultConfig,
    canvas: { ...defaultConfig.canvas, width: 960, height: 540 },
    layout: { ...defaultConfig.layout, type: "grid" as const, margin: 20, gap: 14, shadow: false },
    animation: { ...defaultConfig.animation, transition_ms: 280, hold_ms: 500 },
    output: { ...defaultConfig.output, colors: 160 },
  },
  cinematic: {
    ...defaultConfig,
    canvas: { ...defaultConfig.canvas, background: "#030712" },
    layout: { ...defaultConfig.layout, margin: 42, gap: 30, border_radius: 18 },
    animation: {
      ...defaultConfig.animation,
      transition_ms: 700,
      hold_ms: 1100,
      final_hold_ms: 3200,
      frames_per_transition: 10,
    },
  },
};

export type PresetName = keyof typeof presets;

export type EditorAction =
  | { type: "set-config"; path: string; value: string | number | boolean }
  | { type: "set-images"; images: LocalImage[] }
  | { type: "set-output"; output: OutputTab }
  | { type: "set-playing"; playing: boolean }
  | { type: "set-revealed-index"; index: number }
  | { type: "apply-preset"; preset: PresetName }
  | { type: "reset" };

export function createInitialState(): EditorState {
  return {
    config: structuredClone(defaultConfig),
    localImages: [],
    activeOutput: "yaml",
    preview: { playing: false, revealedIndex: 0 },
  };
}

function setConfigValue(config: GalleryConfigV1, path: string, value: string | number | boolean) {
  const next = structuredClone(config) as unknown as Record<string, unknown>;
  const segments = path.split(".");
  let cursor = next;
  for (const segment of segments.slice(0, -1)) {
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments.at(-1)!] = value;
  return next as unknown as GalleryConfigV1;
}

function syncImages(config: GalleryConfigV1, images: LocalImage[]): GalleryConfigV1 {
  return { ...config, images: images.map((image) => ({ path: image.generatedPath })) };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set-config":
      return { ...state, config: setConfigValue(state.config, action.path, action.value) };
    case "set-images":
      return {
        ...state,
        localImages: action.images,
        config: syncImages(state.config, action.images),
        preview: {
          ...state.preview,
          revealedIndex: Math.min(state.preview.revealedIndex, Math.max(0, action.images.length - 1)),
        },
      };
    case "set-output":
      return { ...state, activeOutput: action.output };
    case "set-playing":
      return { ...state, preview: { ...state.preview, playing: action.playing } };
    case "set-revealed-index":
      return { ...state, preview: { ...state.preview, revealedIndex: action.index } };
    case "apply-preset":
      return {
        ...state,
        config: syncImages(structuredClone(presets[action.preset]), state.localImages),
        preview: { playing: false, revealedIndex: 0 },
      };
    case "reset":
      return createInitialState();
  }
}
