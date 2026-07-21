class MotionGalleryError(Exception):
    """Base exception for user-facing gallery errors."""


class ConfigError(MotionGalleryError):
    """Raised when a gallery configuration is invalid."""


class RenderError(MotionGalleryError):
    """Raised when the configured gallery cannot be rendered."""
