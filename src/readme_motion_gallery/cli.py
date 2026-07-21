"""Command line interface for README Motion Gallery."""

from __future__ import annotations

import argparse
import sys
from collections.abc import Sequence
from pathlib import Path

from . import __version__
from .config import load_config
from .errors import MotionGalleryError
from .renderer import render_gallery


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="rmg",
        description="Generate compact animated GIF galleries for GitHub READMEs.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    build = subparsers.add_parser("build", help="Build a gallery from a YAML configuration.")
    build.add_argument("--config", required=True, type=Path, help="Path to gallery.yml.")
    build.add_argument("--output", type=Path, help="Override output.path from the configuration.")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        config = load_config(args.config)
        result = render_gallery(config, args.output)
    except MotionGalleryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(f"Created {result.output_path}")
    print(
        f"{result.width}x{result.height}, {result.frames} frames, "
        f"{result.duration_ms / 1000:.2f}s, {result.size_bytes / 1024:.1f} KiB, {result.colors} colors"
    )
    return 0
