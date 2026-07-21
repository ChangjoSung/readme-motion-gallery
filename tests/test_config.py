from __future__ import annotations

from pathlib import Path

import pytest

from readme_motion_gallery.config import load_config
from readme_motion_gallery.errors import ConfigError

from .helpers import make_image, write_config


def test_load_config_resolves_paths(tmp_path: Path) -> None:
    make_image(tmp_path / "1.png", (20, 30, 40))
    make_image(tmp_path / "2.png", (50, 60, 70))

    config = load_config(write_config(tmp_path))

    assert config.canvas.width == 640
    assert config.images[0].path == (tmp_path / "1.png").resolve()
    assert config.output.path == (tmp_path / "gallery.gif").resolve()
    assert config.animation.reveal_mode == "cumulative"


def test_load_config_rejects_unknown_keys(tmp_path: Path) -> None:
    make_image(tmp_path / "1.png", (20, 30, 40))
    make_image(tmp_path / "2.png", (50, 60, 70))
    config_path = write_config(tmp_path)
    config_path.write_text(config_path.read_text(encoding="utf-8") + "surprise: true\n", encoding="utf-8")

    with pytest.raises(ConfigError, match="Unknown key"):
        load_config(config_path)


def test_load_config_rejects_missing_image(tmp_path: Path) -> None:
    make_image(tmp_path / "1.png", (20, 30, 40))

    with pytest.raises(ConfigError, match="Image does not exist"):
        load_config(write_config(tmp_path))
