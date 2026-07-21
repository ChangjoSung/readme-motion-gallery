"""Built-in card placement algorithms."""

from __future__ import annotations

import math
from dataclasses import dataclass

from .config import CanvasConfig, LayoutConfig
from .errors import ConfigError


@dataclass(frozen=True)
class CardPlacement:
    x: int
    y: int
    width: int
    height: int


def _best_grid(count: int, canvas: CanvasConfig, layout: LayoutConfig) -> tuple[int, int, int, int]:
    available_width = canvas.width - layout.margin * 2
    available_height = canvas.height - layout.margin * 2
    if available_width <= 0 or available_height <= 0:
        raise ConfigError("Layout margin leaves no usable canvas area.")

    best: tuple[float, int, int, int, int] | None = None
    for columns in range(1, count + 1):
        rows = math.ceil(count / columns)
        cell_width = (available_width - layout.gap * (columns - 1)) / columns
        cell_height = (available_height - layout.gap * (rows - 1)) / rows
        if cell_width <= 0 or cell_height <= 0:
            continue
        card_width = min(cell_width, cell_height * layout.card_aspect_ratio)
        card_height = card_width / layout.card_aspect_ratio
        score = card_width * card_height
        candidate = (score, -abs(columns - rows), columns, round(card_width), round(card_height))
        if best is None or candidate > best:
            best = candidate

    if best is None:
        raise ConfigError("Canvas is too small for the requested image count, margin, and gap.")
    _, _, columns, card_width, card_height = best
    return columns, math.ceil(count / columns), card_width, card_height


def calculate_placements(
    count: int,
    canvas: CanvasConfig,
    layout: LayoutConfig,
) -> tuple[CardPlacement, ...]:
    """Return placements in reveal order for the selected layout."""

    columns, rows, card_width, card_height = _best_grid(count, canvas, layout)
    usable_width = canvas.width - layout.margin * 2
    usable_height = canvas.height - layout.margin * 2
    cell_width = (usable_width - layout.gap * (columns - 1)) / columns
    cell_height = (usable_height - layout.gap * (rows - 1)) / rows

    placements: list[CardPlacement] = []
    for index in range(count):
        if layout.type == "staggered":
            column = index // rows
            row = index % rows
        else:
            row = index // columns
            column = index % columns

        x = layout.margin + column * (cell_width + layout.gap) + (cell_width - card_width) / 2
        y = layout.margin + row * (cell_height + layout.gap) + (cell_height - card_height) / 2

        if layout.type == "staggered" and row % 2 == 1 and column < columns - 1:
            x += min(card_width * 0.12, layout.gap + card_width * 0.06)

        x = min(max(layout.margin, x), canvas.width - layout.margin - card_width)
        y = min(max(layout.margin, y), canvas.height - layout.margin - card_height)
        placements.append(CardPlacement(round(x), round(y), card_width, card_height))

    return tuple(placements)
