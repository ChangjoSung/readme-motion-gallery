from __future__ import annotations

import copy
import json
from dataclasses import asdict
from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator, ValidationError

from readme_motion_gallery.config import AnimationConfig, CanvasConfig, LayoutConfig, OutputConfig
from readme_motion_gallery.layouts import calculate_placements

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schema" / "gallery-config-v1.schema.json"
PARITY_PATH = ROOT / "schema" / "preview-parity-v1.json"


def _load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def _color_hex(value: tuple[int, int, int]) -> str:
    return "#" + "".join(f"{channel:02x}" for channel in value)


def _leaf_fields(schema: dict[str, object]) -> dict[str, dict[str, object]]:
    fields: dict[str, dict[str, object]] = {}

    def visit(prefix: str, node: dict[str, object]) -> None:
        properties = node.get("properties")
        if node.get("type") == "object" and isinstance(properties, dict):
            for name, child in properties.items():
                assert isinstance(child, dict)
                visit(f"{prefix}.{name}" if prefix else name, child)
            return
        fields[prefix] = node

    visit("", schema)
    return fields


def test_schema_is_valid_and_classifies_every_python_option() -> None:
    schema = _load_json(SCHEMA_PATH)
    Draft202012Validator.check_schema(schema)

    fields = _leaf_fields(schema)
    assert len(fields) == 26
    assert set(fields) == {
        "version",
        "canvas.width",
        "canvas.height",
        "canvas.background",
        "images",
        "layout.type",
        "layout.margin",
        "layout.gap",
        "layout.card_aspect_ratio",
        "layout.preserve_aspect_ratio",
        "layout.border_radius",
        "layout.border_width",
        "layout.border_color",
        "layout.shadow",
        "animation.transition",
        "animation.reveal_mode",
        "animation.transition_ms",
        "animation.hold_ms",
        "animation.initial_hold_ms",
        "animation.final_hold_ms",
        "animation.frames_per_transition",
        "animation.scan_line",
        "animation.loop",
        "output.path",
        "output.max_size_mb",
        "output.colors",
    }
    for field, definition in fields.items():
        metadata = definition.get("x-rmg-editor")
        assert isinstance(metadata, dict), f"{field} has no editor classification"
        assert metadata["classification"] in {"included", "deferred", "unsupported"}
        assert metadata["preview"] in {"exact", "structural", "visual", "export-only"}


def test_schema_defaults_match_python_defaults() -> None:
    schema = _load_json(SCHEMA_PATH)
    properties = schema["properties"]
    assert isinstance(properties, dict)

    canvas = CanvasConfig()
    canvas_schema = properties["canvas"]["properties"]
    assert canvas_schema["width"]["default"] == canvas.width
    assert canvas_schema["height"]["default"] == canvas.height
    assert canvas_schema["background"]["default"] == _color_hex(canvas.background)

    layout = LayoutConfig()
    layout_schema = properties["layout"]["properties"]
    for field in (
        "type",
        "margin",
        "gap",
        "card_aspect_ratio",
        "preserve_aspect_ratio",
        "border_radius",
        "border_width",
        "shadow",
    ):
        assert layout_schema[field]["default"] == getattr(layout, field)
    assert layout_schema["border_color"]["default"] == _color_hex(layout.border_color)

    animation = AnimationConfig()
    animation_schema = properties["animation"]["properties"]
    for field in asdict(animation):
        assert animation_schema[field]["default"] == getattr(animation, field)

    output = OutputConfig(path=Path("assets/readme-gallery.gif"))
    output_schema = properties["output"]["properties"]
    assert output_schema["path"]["default"] == output.path.as_posix()
    assert output_schema["max_size_mb"]["default"] == output.max_size_mb
    assert output_schema["colors"]["default"] == output.colors


def test_schema_accepts_the_documented_example() -> None:
    schema = _load_json(SCHEMA_PATH)
    example = yaml.safe_load((ROOT / "examples" / "basic" / "gallery.yml").read_text(encoding="utf-8"))

    Draft202012Validator(schema).validate(example)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda config: config.update({"unknown": True}),
        lambda config: config["canvas"].update({"width": 319}),
        lambda config: config.update({"images": []}),
        lambda config: config["layout"].update({"border_color": "brown"}),
        lambda config: config["animation"].update({"transition": "fade"}),
        lambda config: config["output"].update({"path": "gallery.png"}),
    ],
)
def test_schema_rejects_contract_violations(mutation) -> None:  # type: ignore[no-untyped-def]
    schema = _load_json(SCHEMA_PATH)
    base = yaml.safe_load((ROOT / "examples" / "basic" / "gallery.yml").read_text(encoding="utf-8"))
    invalid = copy.deepcopy(base)
    mutation(invalid)

    with pytest.raises(ValidationError):
        Draft202012Validator(schema).validate(invalid)


def test_preview_parity_fixtures_match_python_layout_and_timing() -> None:
    fixture = _load_json(PARITY_PATH)
    tolerances = fixture["tolerances"]
    assert tolerances == {
        "placement_px": 0,
        "timing_ms": 0,
        "reveal_edge_px": 1,
        "rounded_edge_px": 2,
        "solid_color_pixel_mismatch_ratio": 0.01,
    }

    cases = fixture["cases"]
    assert isinstance(cases, list)
    for case in cases:
        canvas = CanvasConfig(**case["canvas"])
        layout = LayoutConfig(**case["layout"])
        animation = case["animation"]
        expected = case["expected"]
        count = case["image_count"]

        placements = [asdict(item) for item in calculate_placements(count, canvas, layout)]
        assert placements == expected["placements"], case["id"]

        frame_count = count * animation["frames_per_transition"]
        if animation["initial_hold_ms"] > 0:
            frame_count += 1
        duration_ms = (
            animation["initial_hold_ms"]
            + count * animation["transition_ms"]
            + (count - 1) * animation["hold_ms"]
            + animation["final_hold_ms"]
        )
        visible_counts = (
            list(range(1, count + 1))
            if animation["reveal_mode"] == "cumulative"
            else [1] * count
        )

        assert frame_count == expected["frame_count"], case["id"]
        assert duration_ms == expected["duration_ms"], case["id"]
        assert visible_counts == expected["visible_card_counts_after_reveal"], case["id"]
