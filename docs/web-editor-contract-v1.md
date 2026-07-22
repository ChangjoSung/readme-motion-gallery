# Web Editor MVP contract v1

Status: accepted for the `v0.2.0` milestone

Configuration contract: [`schema/gallery-config-v1.schema.json`](../schema/gallery-config-v1.schema.json)

Preview fixtures: [`schema/preview-parity-v1.json`](../schema/preview-parity-v1.json)

## Product boundary

The editor is a client-only configuration tool. It accepts local PNG/JPEG files, shows an immediate browser
preview, and generates the four artifacts needed to run the existing renderer:

1. `gallery.yml`
2. `.github/workflows/readme-gallery.yml`
3. README Markdown
4. a local CLI command

The browser preview is not a GIF encoder. Pillow remains authoritative for image resampling, rounded-edge
anti-aliasing, shadow blur, palette generation, GIF optimization, and the `max_size_mb` decision. The MVP does
not upload files, fetch remote URLs, persist files between sessions, or expose a hosted rendering API.

## Selected stack and repository location

The web application will live in `apps/web/` in this repository and use:

- React and TypeScript for the two-pane editor UI
- Vite for development and a static production build
- React `useReducer` plus context for state; no external state store in the MVP
- Canvas 2D for the visual preview
- JSON Schema Draft 2020-12 for the shared validation contract
- Ajv 2020 for browser validation and `yaml` for deterministic YAML serialization
- Vitest and Testing Library for unit/component tests, with Playwright reserved for the release smoke test
- plain CSS with custom properties; no UI framework dependency

The result must remain a static site that can be deployed to GitHub Pages. A server framework, database,
authentication layer, and server-side file storage would add operational cost without helping the MVP.

## Editor state

The serializable state is the normalized `gallery.yml` document described by the JSON Schema. Browser-only
image state is kept separately:

```ts
type LocalImage = {
  id: string;
  file: File;
  objectUrl: string;
  width: number;
  height: number;
  generatedPath: string;
};

type EditorState = {
  config: GalleryConfigV1;
  localImages: LocalImage[];
  activeOutput: "yaml" | "workflow" | "markdown" | "cli";
  preview: { playing: boolean; revealedIndex: number };
};
```

`File` and `objectUrl` must never be serialized. Object URLs are revoked when an image is removed, replaced,
or the editor unmounts.

## Local image policy

- Accept 1-10 successfully decoded PNG or JPEG files.
- Reject files larger than 25 MiB each or 100 MiB in aggregate before decoding. These are browser safety
  limits, not new Python configuration fields.
- Keep all bytes in the browser. The UI must state that no upload occurs.
- Preserve selection/reveal order and provide reorder/remove controls.
- Generate deterministic repository paths by order: `screenshots/01.png`, `screenshots/02.jpg`, and so on.
  JPEG input keeps `.jpg`; PNG keeps `.png`. Reordering regenerates the numbered paths.
- Serialize images only in the canonical mapping form, for example `- path: screenshots/01.png`. The Python
  parser's string shorthand remains accepted for compatibility but is not emitted by the editor.
- Generated paths use `/`, are repository-relative, and contain no `..` segment. The editor never generates
  absolute paths. Python may continue to accept them for local CLI compatibility.

The MVP copies code but does not download or rename the selected image files. The output panel therefore tells
the user to add the selected files at the generated paths. A downloadable starter bundle is a separate feature.

## Configuration field matrix

Every Python version 1 option is included. “Exact” means the browser and Python must match the parity fixture;
“visual” allows the explicit raster tolerances below; “export only” is validated and generated but is enforced
only by the Python GIF renderer.

| Field | Default | Valid values | Editor control | Preview |
| --- | ---: | --- | --- | --- |
| `version` | `1` | exactly `1` | fixed/hidden | exact |
| `canvas.width` | `1280` | integer 320-1920 | number | exact |
| `canvas.height` | `720` | integer 180-1080 | number | exact |
| `canvas.background` | `#07080c` | `#RRGGBB` | color | exact |
| `images` | none | 1-10 PNG/JPEG paths | local file list | structural |
| `layout.type` | `staggered` | `grid`, `staggered` | segmented | exact |
| `layout.margin` | `32` | integer 0-200 | range + number | exact |
| `layout.gap` | `24` | integer 0-200 | range + number | exact |
| `layout.card_aspect_ratio` | `16/9` | number 0.5-3.0 | number | exact |
| `layout.preserve_aspect_ratio` | `true` | boolean | toggle | visual |
| `layout.border_radius` | `10` | integer 0-64 | range + number | visual |
| `layout.border_width` | `2` | integer 0-12 | range + number | visual |
| `layout.border_color` | `#745f4c` | `#RRGGBB` | color | visual |
| `layout.shadow` | `true` | boolean | toggle | visual |
| `animation.transition` | `wipe` | exactly `wipe` | fixed/hidden | exact |
| `animation.reveal_mode` | `cumulative` | `cumulative`, `replace` | segmented | exact |
| `animation.transition_ms` | `420` | integer 100-5000 | range + number | exact |
| `animation.hold_ms` | `800` | integer 0-10000 | range + number | exact |
| `animation.initial_hold_ms` | `450` | integer 0-10000 | range + number | exact |
| `animation.final_hold_ms` | `2300` | integer 0-30000 | range + number | exact |
| `animation.frames_per_transition` | `7` | integer 2-12 | range + number | exact |
| `animation.scan_line` | `true` | boolean | toggle | visual |
| `animation.loop` | `true` | boolean | toggle | exact |
| `output.path` | `assets/readme-gallery.gif` | non-empty `.gif` path | path | export only |
| `output.max_size_mb` | `8.0` | number 0.1-25.0 | number | export only |
| `output.colors` | `224` | integer 32-256 | range + number | export only |

There are no deferred or unsupported Python version 1 fields. Deferred behavior is limited to browser-side GIF
encoding, palette/size simulation, downloadable bundles, remote inputs, and hosted rendering.

## Generated outputs

All outputs are derived from one validated state. Invalid state disables Copy Code and shows field-level errors.

### `gallery.yml`

The editor emits every section and field in the order shown in the matrix, uses two-space indentation, quotes
hex colors and paths when needed, and always uses the image mapping form. A final newline is required.

### GitHub Actions workflow

The workflow uses `actions/checkout`, then `ChangjoSung/readme-motion-gallery@<release-tag>`, followed by an
explicit commit step. The release build supplies an immutable `RMG_ACTION_REF`; the `v0.2.0` production editor
must emit `@v0.2.0`. Development builds visibly label output as development and must not silently emit a branch
reference.

### README Markdown

The canonical output is:

```md
![README Motion Gallery](./assets/readme-gallery.gif)
```

The path is derived from `output.path` and normalized to a relative Markdown path.

### CLI command

The canonical output is:

```bash
rmg build --config gallery.yml --output assets/readme-gallery.gif
```

Arguments are shell-quoted when a user-editable output path requires it.

## Preview fidelity contract

Both runtimes consume `schema/preview-parity-v1.json`. The browser must implement Python's round-half-to-even
behavior; JavaScript `Math.round` is not a compatible substitute at half-pixel boundaries.

- Card placement, reveal order, visible-card counts, frame count, and total duration must match exactly.
- Wipe clipping may differ by at most 1 px at the moving reveal edge.
- Rounded corners, borders, and shadow boundaries may differ by at most 2 px because Canvas and Pillow use
  different rasterizers.
- Solid-color fixture renders may have at most a 1% mismatched-pixel ratio after excluding the 2 px rounded-edge
  boundary. A mismatched pixel is one whose largest RGB channel delta exceeds 8.
- Photo resampling and GIF palette colors are informative in the browser and are not release-blocking parity
  checks. The generated GIF is the final authority.

### Browser preview performance budget

- Preview-only image sources are decoded once and cached until the local image is removed or replaced.
- Sources larger than 2048 px on either edge are downsampled during `ImageBitmap` creation. Original file bytes
  remain untouched and are still used by the Python renderer workflow.
- The release-blocking deterministic budget is 1,000 combined ten-image layout and timeline calculations in
  at most 250 ms in the Vitest environment.
- Interactive Canvas rendering targets 16.7 ms median and 33.3 ms p95 per frame on a reference desktop.
  Cross-browser measurements are recorded by the release smoke test in Issue #6; they do not change the
  deterministic calculation gate above.

Timing is defined as:

```text
frame_count = image_count * frames_per_transition + (initial_hold_ms > 0 ? 1 : 0)
duration_ms = initial_hold_ms
            + image_count * transition_ms
            + (image_count - 1) * hold_ms
            + final_hold_ms
```

## Change control

- Any Python default, range, enum, or field change must update the JSON Schema and parity tests in the same PR.
- Additive configuration work requires a new schema/contract version when old clients cannot safely ignore it.
- The web editor may hide fixed fields but must serialize them.
- Issues that implement editor state, preview, code generation, or deployment must link to this contract.
