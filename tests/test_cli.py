from __future__ import annotations

from pathlib import Path

from readme_motion_gallery.cli import main

from .helpers import make_image, write_config


def test_cli_build(tmp_path: Path, capsys) -> None:
    make_image(tmp_path / "1.png", (180, 40, 40))
    make_image(tmp_path / "2.png", (40, 80, 190))
    config = write_config(tmp_path)
    output = tmp_path / "custom.gif"

    exit_code = main(["build", "--config", str(config), "--output", str(output)])

    assert exit_code == 0
    assert output.is_file()
    assert "Created" in capsys.readouterr().out
