"""README Motion Gallery public package interface."""

from .config import GalleryConfig, load_config
from .renderer import RenderResult, render_gallery

__all__ = ["GalleryConfig", "RenderResult", "load_config", "render_gallery"]
__version__ = "0.1.0"
