from __future__ import annotations

from hashlib import sha256
from pathlib import Path

from PIL import Image

from readme_motion_gallery.config import load_config
from readme_motion_gallery.renderer import render_gallery

from .helpers import make_image, write_config


def _fixture(tmp_path: Path):
    make_image(tmp_path / "1.png", (180, 40, 40))
    make_image(tmp_path / "2.png", (40, 80, 190))
    return load_config(write_config(tmp_path))


def test_render_gallery_metadata(tmp_path: Path) -> None:
    config = _fixture(tmp_path)

    result = render_gallery(config)

    assert result.output_path.is_file()
    assert result.width == 640
    assert result.height == 360
    assert result.frames == 9
    assert result.duration_ms == 900
    assert result.size_bytes < 2 * 1024 * 1024
    with Image.open(result.output_path) as gif:
        assert gif.format == "GIF"
        assert gif.size == (640, 360)
        assert gif.n_frames == result.frames
        assert gif.info["loop"] == 0


def test_render_is_deterministic(tmp_path: Path) -> None:
    config = _fixture(tmp_path)
    first_path = tmp_path / "first.gif"
    second_path = tmp_path / "second.gif"

    render_gallery(config, first_path)
    render_gallery(config, second_path)

    assert sha256(first_path.read_bytes()).digest() == sha256(second_path.read_bytes()).digest()
