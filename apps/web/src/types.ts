export type LayoutType = "grid" | "staggered";
export type RevealMode = "cumulative" | "replace";
export type OutputTab = "yaml" | "workflow" | "markdown" | "cli";

export type GalleryConfigV1 = {
  version: 1;
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  images: Array<{ path: string }>;
  layout: {
    type: LayoutType;
    margin: number;
    gap: number;
    card_aspect_ratio: number;
    preserve_aspect_ratio: boolean;
    border_radius: number;
    border_width: number;
    border_color: string;
    shadow: boolean;
  };
  animation: {
    transition: "wipe";
    reveal_mode: RevealMode;
    transition_ms: number;
    hold_ms: number;
    initial_hold_ms: number;
    final_hold_ms: number;
    frames_per_transition: number;
    scan_line: boolean;
    loop: boolean;
  };
  output: {
    path: string;
    max_size_mb: number;
    colors: number;
  };
};

export type LocalImage = {
  id: string;
  file: File;
  objectUrl: string;
  width: number;
  height: number;
  generatedPath: string;
};

export type EditorState = {
  config: GalleryConfigV1;
  localImages: LocalImage[];
  activeOutput: OutputTab;
  preview: { playing: boolean; revealedIndex: number };
};
