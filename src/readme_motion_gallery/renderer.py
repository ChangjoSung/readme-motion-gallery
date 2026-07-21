"""Deterministic GIF renderer for README Motion Gallery."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps, UnidentifiedImageError

from .config import GalleryConfig, ImageSpec, LayoutConfig
from .errors import RenderError
from .layouts import CardPlacement, calculate_placements


@dataclass(frozen=True)
class RenderResult:
    output_path: Path
    width: int
    height: int
    frames: int
    duration_ms: int
    size_bytes: int
    colors: int


def _rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def _make_card(
    source: ImageSpec,
    placement: CardPlacement,
    layout: LayoutConfig,
    background: tuple[int, int, int],
) -> Image.Image:
    size = (placement.width, placement.height)
    try:
        with Image.open(source.path) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            if layout.preserve_aspect_ratio:
                resized = ImageOps.contain(image, size, Image.Resampling.LANCZOS)
                screenshot = Image.new("RGB", size, background)
                offset = ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2)
                screenshot.paste(resized, offset)
            else:
                screenshot = ImageOps.fit(image, size, Image.Resampling.LANCZOS)
    except (OSError, UnidentifiedImageError) as exc:
        raise RenderError(f"Could not decode image {source.path}: {exc}") from exc

    padding = 14 if layout.shadow else max(2, layout.border_width)
    patch_size = (size[0] + padding * 2, size[1] + padding * 2)
    patch = Image.new("RGBA", patch_size, (0, 0, 0, 0))

    if layout.shadow:
        shadow = Image.new("RGBA", patch_size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle(
            (padding + 4, padding + 7, padding + size[0] + 3, padding + size[1] + 6),
            radius=layout.border_radius + 2,
            fill=(0, 0, 0, 190),
        )
        patch.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(9)))

    mask = _rounded_mask(size, layout.border_radius)
    patch.paste(screenshot, (padding, padding), mask)
    if layout.border_width:
        ImageDraw.Draw(patch).rounded_rectangle(
            (padding, padding, padding + size[0] - 1, padding + size[1] - 1),
            radius=layout.border_radius,
            outline=layout.border_color + (255,),
            width=layout.border_width,
        )
    return patch


def _scan_color(border: tuple[int, int, int]) -> tuple[int, int, int, int]:
    return tuple(min(255, round(channel * 1.8 + 24)) for channel in border) + (245,)  # type: ignore[return-value]


def _composite_patch(
    base: Image.Image,
    patch: Image.Image,
    placement: CardPlacement,
    fraction: float,
    layout: LayoutConfig,
    scan_line: bool,
) -> None:
    padding = (patch.width - placement.width) // 2
    reveal_width = max(1, round(patch.width * fraction))
    visible = patch.crop((0, 0, reveal_width, patch.height))
    paste_at = (placement.x - padding, placement.y - padding)
    base.alpha_composite(visible, paste_at)

    if scan_line and fraction < 1.0:
        line_x = paste_at[0] + reveal_width - 1
        line_top = placement.y + 4
        line_bottom = placement.y + placement.height - 5
        draw = ImageDraw.Draw(base)
        draw.line((line_x - 2, line_top, line_x - 2, line_bottom), fill=(104, 65, 35, 130), width=5)
        draw.line(
            (line_x, line_top, line_x, line_bottom),
            fill=_scan_color(layout.border_color),
            width=2,
        )


def _split_duration(total_ms: int, frames: int) -> list[int]:
    base = total_ms // frames
    remainder = total_ms % frames
    return [base + (1 if index < remainder else 0) for index in range(frames)]


def _build_frames(
    config: GalleryConfig,
    cards: list[Image.Image],
    placements: tuple[CardPlacement, ...],
) -> tuple[list[Image.Image], list[int], list[Image.Image]]:
    size = (config.canvas.width, config.canvas.height)
    empty = Image.new("RGBA", size, config.canvas.background + (255,))
    stable = empty.copy()
    frames: list[Image.Image] = []
    durations: list[int] = []
    stable_states: list[Image.Image] = []

    if config.animation.initial_hold_ms:
        frames.append(empty.convert("RGB"))
        durations.append(config.animation.initial_hold_ms)

    step_durations = _split_duration(
        config.animation.transition_ms,
        config.animation.frames_per_transition,
    )

    for card_index, (card, placement) in enumerate(zip(cards, placements, strict=True)):
        if config.animation.reveal_mode == "replace":
            stable = empty.copy()

        for step_index in range(config.animation.frames_per_transition):
            fraction = (step_index + 1) / config.animation.frames_per_transition
            frame = stable.copy()
            _composite_patch(
                frame,
                card,
                placement,
                fraction,
                config.layout,
                config.animation.scan_line,
            )
            frames.append(frame.convert("RGB"))
            duration = step_durations[step_index]
            if step_index == config.animation.frames_per_transition - 1:
                is_last_card = card_index == len(cards) - 1
                duration += config.animation.final_hold_ms if is_last_card else config.animation.hold_ms
            durations.append(duration)

        _composite_patch(stable, card, placement, 1.0, config.layout, False)
        stable_states.append(stable.convert("RGB"))

    return frames, durations, stable_states


def _palette_from_states(states: list[Image.Image], colors: int) -> Image.Image:
    columns = min(4, len(states))
    rows = (len(states) + columns - 1) // columns
    sample_width = 512
    sample_height = 512
    tile_width = sample_width // columns
    tile_height = sample_height // rows
    sample = Image.new("RGB", (sample_width, sample_height), states[-1].getpixel((0, 0)))
    for index, state in enumerate(states):
        tile = ImageOps.fit(state, (tile_width, tile_height), Image.Resampling.LANCZOS)
        sample.paste(tile, ((index % columns) * tile_width, (index // columns) * tile_height))
    return sample.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def _save_candidate(
    frames: list[Image.Image],
    durations: list[int],
    stable_states: list[Image.Image],
    output: Path,
    colors: int,
    loop: bool,
) -> None:
    palette = _palette_from_states(stable_states, colors)
    paletted = [
        frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG)
        for frame in frames
    ]
    options: dict[str, object] = {
        "format": "GIF",
        "save_all": True,
        "append_images": paletted[1:],
        "duration": durations,
        "optimize": True,
        "disposal": 1,
    }
    if loop:
        options["loop"] = 0
    paletted[0].save(output, **options)


def _color_candidates(start: int) -> tuple[int, ...]:
    fallbacks = (192, 160, 128, 96, 64, 48, 32)
    return tuple(dict.fromkeys([start, *(color for color in fallbacks if color < start)]))


def render_gallery(config: GalleryConfig, output_path: str | Path | None = None) -> RenderResult:
    """Render a validated gallery configuration to an optimized GIF."""

    output = Path(output_path).resolve() if output_path is not None else config.output.path
    if output.suffix.lower() != ".gif":
        raise RenderError("Output path must end in .gif.")

    placements = calculate_placements(len(config.images), config.canvas, config.layout)
    cards = [
        _make_card(image, placement, config.layout, config.canvas.background)
        for image, placement in zip(config.images, placements, strict=True)
    ]
    frames, durations, stable_states = _build_frames(config, cards, placements)
    if not frames:
        raise RenderError("Animation produced no frames.")

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_name(f".{output.name}.tmp")
    limit_bytes = round(config.output.max_size_mb * 1024 * 1024)
    smallest_size: int | None = None

    try:
        for colors in _color_candidates(config.output.colors):
            _save_candidate(frames, durations, stable_states, temporary, colors, config.animation.loop)
            candidate_size = temporary.stat().st_size
            smallest_size = candidate_size
            if candidate_size <= limit_bytes:
                os.replace(temporary, output)
                return RenderResult(
                    output_path=output,
                    width=config.canvas.width,
                    height=config.canvas.height,
                    frames=len(frames),
                    duration_ms=sum(durations),
                    size_bytes=candidate_size,
                    colors=colors,
                )
    finally:
        temporary.unlink(missing_ok=True)

    actual_mb = (smallest_size or 0) / (1024 * 1024)
    raise RenderError(
        f"Could not meet max_size_mb={config.output.max_size_mb:g}; smallest result was {actual_mb:.2f} MB. "
        "Reduce the canvas size, image count, or frames_per_transition."
    )
