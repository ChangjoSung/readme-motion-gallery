from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


def make_image(path: Path, color: tuple[int, int, int], size: tuple[int, int] = (640, 360)) -> None:
    image = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(image)
    draw.rectangle((20, 20, size[0] - 21, size[1] - 21), outline=(240, 240, 240), width=3)
    image.save(path)


def write_config(directory: Path, extra: str = "") -> Path:
    config = directory / "gallery.yml"
    config.write_text(
        """\
version: 1
canvas:
  width: 640
  height: 360
  background: "#07080c"
images:
  - path: 1.png
  - path: 2.png
layout:
  type: staggered
  margin: 12
  gap: 8
  card_aspect_ratio: 1.777778
  preserve_aspect_ratio: true
  border_radius: 6
  border_width: 1
  border_color: "#745f4c"
  shadow: true
animation:
  transition: wipe
  reveal_mode: cumulative
  transition_ms: 200
  hold_ms: 100
  initial_hold_ms: 100
  final_hold_ms: 300
  frames_per_transition: 4
  scan_line: true
  loop: true
output:
  path: gallery.gif
  max_size_mb: 2
  colors: 128
"""
        + extra,
        encoding="utf-8",
    )
    return config
