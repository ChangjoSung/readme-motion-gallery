from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def _fenced_code_blocks(markdown: str) -> list[str]:
    return re.findall(r"```[^\n]*\n.*?```", markdown, flags=re.DOTALL)


def test_readmes_link_to_each_language() -> None:
    english = _read("README.md")
    korean = _read("README.ko.md")

    language_switcher = "[English](README.md) | [한국어](README.ko.md)"
    assert language_switcher in english
    assert language_switcher in korean


def test_readme_code_examples_stay_in_sync() -> None:
    english_blocks = _fenced_code_blocks(_read("README.md"))
    korean_blocks = _fenced_code_blocks(_read("README.ko.md"))

    assert english_blocks
    assert korean_blocks == english_blocks
