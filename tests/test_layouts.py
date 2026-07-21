from readme_motion_gallery.config import CanvasConfig, LayoutConfig
from readme_motion_gallery.layouts import calculate_placements


def test_grid_placements_stay_inside_canvas() -> None:
    canvas = CanvasConfig(width=1280, height=720)
    layout = LayoutConfig(type="grid", margin=32, gap=24)

    placements = calculate_placements(10, canvas, layout)

    assert len(placements) == 10
    for placement in placements:
        assert placement.x >= layout.margin
        assert placement.y >= layout.margin
        assert placement.x + placement.width <= canvas.width - layout.margin
        assert placement.y + placement.height <= canvas.height - layout.margin


def test_staggered_four_image_order_is_column_first() -> None:
    canvas = CanvasConfig(width=1280, height=720)
    layout = LayoutConfig(type="staggered", margin=32, gap=24)

    first, second, third, fourth = calculate_placements(4, canvas, layout)

    assert first.x < third.x
    assert second.x < fourth.x
    assert first.y < second.y
    assert third.y < fourth.y
