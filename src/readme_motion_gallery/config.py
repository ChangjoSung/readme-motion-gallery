"""Configuration parsing and validation for README Motion Gallery."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .errors import ConfigError

RGB = tuple[int, int, int]


@dataclass(frozen=True)
class CanvasConfig:
    width: int = 1280
    height: int = 720
    background: RGB = (7, 8, 12)


@dataclass(frozen=True)
class ImageSpec:
    path: Path


@dataclass(frozen=True)
class LayoutConfig:
    type: str = "staggered"
    margin: int = 32
    gap: int = 24
    card_aspect_ratio: float = 16 / 9
    preserve_aspect_ratio: bool = True
    border_radius: int = 10
    border_width: int = 2
    border_color: RGB = (116, 95, 76)
    shadow: bool = True


@dataclass(frozen=True)
class AnimationConfig:
    transition: str = "wipe"
    reveal_mode: str = "cumulative"
    transition_ms: int = 420
    hold_ms: int = 800
    initial_hold_ms: int = 450
    final_hold_ms: int = 2300
    frames_per_transition: int = 7
    scan_line: bool = True
    loop: bool = True


@dataclass(frozen=True)
class OutputConfig:
    path: Path
    max_size_mb: float = 8.0
    colors: int = 224


@dataclass(frozen=True)
class GalleryConfig:
    source_path: Path
    canvas: CanvasConfig
    images: tuple[ImageSpec, ...]
    layout: LayoutConfig
    animation: AnimationConfig
    output: OutputConfig


def _mapping(value: Any, name: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ConfigError(f"'{name}' must be a mapping.")
    return value


def _reject_unknown(mapping: dict[str, Any], allowed: set[str], name: str) -> None:
    unknown = sorted(set(mapping) - allowed)
    if unknown:
        raise ConfigError(f"Unknown key(s) in '{name}': {', '.join(unknown)}")


def _integer(value: Any, name: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ConfigError(f"'{name}' must be an integer.")
    if not minimum <= value <= maximum:
        raise ConfigError(f"'{name}' must be between {minimum} and {maximum}.")
    return value


def _number(value: Any, name: str, minimum: float, maximum: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ConfigError(f"'{name}' must be a number.")
    result = float(value)
    if not minimum <= result <= maximum:
        raise ConfigError(f"'{name}' must be between {minimum} and {maximum}.")
    return result


def _boolean(value: Any, name: str) -> bool:
    if not isinstance(value, bool):
        raise ConfigError(f"'{name}' must be true or false.")
    return value


def _color(value: Any, name: str) -> RGB:
    if not isinstance(value, str) or len(value) != 7 or not value.startswith("#"):
        raise ConfigError(f"'{name}' must be a color in #RRGGBB format.")
    try:
        return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))  # type: ignore[return-value]
    except ValueError as exc:
        raise ConfigError(f"'{name}' must be a color in #RRGGBB format.") from exc


def _path(value: Any, name: str, base_dir: Path) -> Path:
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"'{name}' must be a non-empty path.")
    result = Path(value)
    if not result.is_absolute():
        result = base_dir / result
    return result.resolve()


def _parse_canvas(data: Any) -> CanvasConfig:
    section = _mapping(data, "canvas")
    _reject_unknown(section, {"width", "height", "background"}, "canvas")
    return CanvasConfig(
        width=_integer(section.get("width", 1280), "canvas.width", 320, 1920),
        height=_integer(section.get("height", 720), "canvas.height", 180, 1080),
        background=_color(section.get("background", "#07080c"), "canvas.background"),
    )


def _parse_images(data: Any, base_dir: Path) -> tuple[ImageSpec, ...]:
    if not isinstance(data, list) or not 1 <= len(data) <= 10:
        raise ConfigError("'images' must contain between 1 and 10 entries.")

    images: list[ImageSpec] = []
    for index, raw in enumerate(data, start=1):
        if isinstance(raw, str):
            raw_path = raw
        elif isinstance(raw, dict):
            _reject_unknown(raw, {"path"}, f"images[{index}]")
            raw_path = raw.get("path")
        else:
            raise ConfigError(f"'images[{index}]' must be a path or a mapping with 'path'.")

        image_path = _path(raw_path, f"images[{index}].path", base_dir)
        if not image_path.is_file():
            raise ConfigError(f"Image does not exist: {image_path}")
        if image_path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            raise ConfigError(f"Unsupported image format for {image_path.name}; use PNG or JPEG.")
        images.append(ImageSpec(path=image_path))
    return tuple(images)


def _parse_layout(data: Any) -> LayoutConfig:
    section = _mapping(data, "layout")
    _reject_unknown(
        section,
        {
            "type",
            "margin",
            "gap",
            "card_aspect_ratio",
            "preserve_aspect_ratio",
            "border_radius",
            "border_width",
            "border_color",
            "shadow",
        },
        "layout",
    )
    layout_type = section.get("type", "staggered")
    if layout_type not in {"grid", "staggered"}:
        raise ConfigError("'layout.type' must be 'grid' or 'staggered'.")
    return LayoutConfig(
        type=layout_type,
        margin=_integer(section.get("margin", 32), "layout.margin", 0, 200),
        gap=_integer(section.get("gap", 24), "layout.gap", 0, 200),
        card_aspect_ratio=_number(
            section.get("card_aspect_ratio", 16 / 9), "layout.card_aspect_ratio", 0.5, 3.0
        ),
        preserve_aspect_ratio=_boolean(
            section.get("preserve_aspect_ratio", True), "layout.preserve_aspect_ratio"
        ),
        border_radius=_integer(section.get("border_radius", 10), "layout.border_radius", 0, 64),
        border_width=_integer(section.get("border_width", 2), "layout.border_width", 0, 12),
        border_color=_color(section.get("border_color", "#745f4c"), "layout.border_color"),
        shadow=_boolean(section.get("shadow", True), "layout.shadow"),
    )


def _parse_animation(data: Any) -> AnimationConfig:
    section = _mapping(data, "animation")
    _reject_unknown(
        section,
        {
            "transition",
            "reveal_mode",
            "transition_ms",
            "hold_ms",
            "initial_hold_ms",
            "final_hold_ms",
            "frames_per_transition",
            "scan_line",
            "loop",
        },
        "animation",
    )
    transition = section.get("transition", "wipe")
    if transition != "wipe":
        raise ConfigError("'animation.transition' currently supports only 'wipe'.")
    reveal_mode = section.get("reveal_mode", "cumulative")
    if reveal_mode not in {"cumulative", "replace"}:
        raise ConfigError("'animation.reveal_mode' must be 'cumulative' or 'replace'.")
    return AnimationConfig(
        transition=transition,
        reveal_mode=reveal_mode,
        transition_ms=_integer(section.get("transition_ms", 420), "animation.transition_ms", 100, 5000),
        hold_ms=_integer(section.get("hold_ms", 800), "animation.hold_ms", 0, 10000),
        initial_hold_ms=_integer(
            section.get("initial_hold_ms", 450), "animation.initial_hold_ms", 0, 10000
        ),
        final_hold_ms=_integer(
            section.get("final_hold_ms", 2300), "animation.final_hold_ms", 0, 30000
        ),
        frames_per_transition=_integer(
            section.get("frames_per_transition", 7), "animation.frames_per_transition", 2, 12
        ),
        scan_line=_boolean(section.get("scan_line", True), "animation.scan_line"),
        loop=_boolean(section.get("loop", True), "animation.loop"),
    )


def _parse_output(data: Any, base_dir: Path) -> OutputConfig:
    section = _mapping(data, "output")
    _reject_unknown(section, {"path", "max_size_mb", "colors"}, "output")
    output_path = _path(section.get("path", "assets/readme-gallery.gif"), "output.path", base_dir)
    if output_path.suffix.lower() != ".gif":
        raise ConfigError("'output.path' must end in .gif.")
    return OutputConfig(
        path=output_path,
        max_size_mb=_number(section.get("max_size_mb", 8.0), "output.max_size_mb", 0.1, 25.0),
        colors=_integer(section.get("colors", 224), "output.colors", 32, 256),
    )


def load_config(path: str | Path) -> GalleryConfig:
    """Load and validate a version 1 YAML gallery configuration."""

    source_path = Path(path).resolve()
    if not source_path.is_file():
        raise ConfigError(f"Configuration does not exist: {source_path}")

    try:
        raw = yaml.safe_load(source_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        raise ConfigError(f"Could not read configuration: {exc}") from exc

    root = _mapping(raw, "configuration")
    _reject_unknown(root, {"version", "canvas", "images", "layout", "animation", "output"}, "root")
    if root.get("version") != 1:
        raise ConfigError("'version' must be 1.")

    base_dir = source_path.parent
    return GalleryConfig(
        source_path=source_path,
        canvas=_parse_canvas(root.get("canvas")),
        images=_parse_images(root.get("images"), base_dir),
        layout=_parse_layout(root.get("layout")),
        animation=_parse_animation(root.get("animation")),
        output=_parse_output(root.get("output"), base_dir),
    )
