# README Motion Gallery

Generate compact, deterministic animated GIF galleries for GitHub profile and repository READMEs.

README Motion Gallery turns local PNG or JPEG screenshots into a single optimized GIF. It supports grid and
staggered layouts, left-to-right wipe transitions, cumulative reveals, scene replacement, fixed palettes, and
an output size budget.

## Demo

![Four screenshots appearing sequentially in a staggered layout](./docs/assets/readme-gallery-demo.gif)

> [!IMPORTANT]
> This project generates automatic animations. GitHub README images cannot provide a true pointer-position
> hover gallery.

## Quick start

Requires Python 3.10 or newer.

```bash
python -m pip install -e .
python examples/basic/create_demo_images.py
rmg build --config examples/basic/gallery.yml --output docs/assets/readme-gallery-demo.gif
```

Then embed the generated file in a README:

```md
![Project screenshots](./docs/assets/readme-gallery-demo.gif)
```

## Configuration

Paths are resolved relative to the YAML file.

```yaml
version: 1

canvas:
  width: 1280
  height: 720
  background: "#07080c"

images:
  - path: screenshots/1.png
  - path: screenshots/2.png
  - path: screenshots/3.png
  - path: screenshots/4.png

layout:
  type: staggered          # grid | staggered
  margin: 32
  gap: 24
  card_aspect_ratio: 1.777778
  preserve_aspect_ratio: true
  border_radius: 10
  border_width: 2
  border_color: "#745f4c"
  shadow: true

animation:
  transition: wipe
  reveal_mode: cumulative # cumulative | replace
  transition_ms: 420
  hold_ms: 800
  initial_hold_ms: 450
  final_hold_ms: 2300
  frames_per_transition: 7
  scan_line: true
  loop: true

output:
  path: assets/readme-gallery.gif
  max_size_mb: 5
  colors: 224
```

If the first palette exceeds `max_size_mb`, the renderer retries with fewer colors. If the 32-color result is
still too large, the build fails with a suggestion to reduce the canvas, image count, or transition frames.

## CLI

```text
rmg build --config gallery.yml
rmg build --config gallery.yml --output assets/custom.gif
rmg --version
```

## GitHub Action

The action generates a file but never commits it automatically. The consuming repository controls its own
write permissions and commit policy.

```yaml
name: Generate README gallery

on:
  workflow_dispatch:
  push:
    paths:
      - "gallery.yml"
      - "screenshots/**"

permissions:
  contents: write

jobs:
  gallery:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: ChangjoSung/readme-motion-gallery@v0.1.0
        with:
          config: gallery.yml
          output: assets/readme-gallery.gif
      - name: Commit generated gallery
        shell: bash
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add assets/readme-gallery.gif
          git diff --cached --quiet && exit 0
          git commit -m "docs: update README gallery"
          git push
```

Pin a full release SHA instead of a floating tag in security-sensitive repositories.

## Design guarantees

- Inputs stay local; version 0.1 does not fetch remote URLs.
- Source images are never modified.
- `preserve_aspect_ratio: true` uses contain behavior and never crops screenshots.
- One shared GIF palette prevents existing cards from changing color between reveals.
- Output is written atomically after the size budget is satisfied.
- Unknown configuration keys fail fast instead of being silently ignored.

## Roadmap

- More transitions and layouts
- Browser-based configuration preview
- Optional GitHub-hosted configuration discovery
- Hosted rendering API only after demand and abuse controls are validated

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

## License

MIT
