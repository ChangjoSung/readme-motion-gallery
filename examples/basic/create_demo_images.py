"""Create four synthetic screenshots for the basic example."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw

DEFAULT_OUTPUT = Path(__file__).parent / "screenshots"
PALETTES = (
    ((18, 21, 31), (75, 92, 139)),
    ((23, 18, 30), (135, 77, 125)),
    ((16, 28, 29), (57, 130, 120)),
    ((31, 18, 14), (172, 86, 42)),
)


def create_card(index: int, start: tuple[int, int, int], end: tuple[int, int, int]) -> Image.Image:
    width, height = 960, 540
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        ratio = y / (height - 1)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip(start, end, strict=True))
        for x in range(width):
            pixels[x, y] = color

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((55, 55, 310, 150), radius=16, fill=(5, 6, 10, 190), outline=(210, 210, 220))
    draw.text((82, 78), f"SCENE {index}", fill=(245, 245, 248), stroke_width=1)
    draw.rectangle((60, 450, 620, 486), fill=(8, 9, 12), outline=(190, 190, 200))
    draw.rectangle((65, 455, 65 + index * 130, 481), fill=(80 + index * 25, 185, 105))
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    for index, (start, end) in enumerate(PALETTES, start=1):
        create_card(index, start, end).save(output / f"{index}.png", optimize=True)
    print(f"Created demo images in {output}")


if __name__ == "__main__":
    main()
