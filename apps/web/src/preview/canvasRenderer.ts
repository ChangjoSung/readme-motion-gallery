import { roundHalfEven, type CardPlacement } from "./layout";
import type { GalleryConfigV1 } from "../types";
import type { PreviewFrameState } from "./timeline";

export type PreviewSource = { source: CanvasImageSource; width: number; height: number };
export type ImageDraw = { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number };

export function calculateImageDraw(
  sourceWidth: number,
  sourceHeight: number,
  placement: CardPlacement,
  preserveAspectRatio: boolean,
): ImageDraw {
  if (preserveAspectRatio) {
    const scale = Math.min(placement.width / sourceWidth, placement.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
      sx: 0,
      sy: 0,
      sw: sourceWidth,
      sh: sourceHeight,
      dx: placement.x + (placement.width - width) / 2,
      dy: placement.y + (placement.height - height) / 2,
      dw: width,
      dh: height,
    };
  }
  const scale = Math.max(placement.width / sourceWidth, placement.height / sourceHeight);
  const cropWidth = placement.width / scale;
  const cropHeight = placement.height / scale;
  return {
    sx: (sourceWidth - cropWidth) / 2,
    sy: (sourceHeight - cropHeight) / 2,
    sw: cropWidth,
    sh: cropHeight,
    dx: placement.x,
    dy: placement.y,
    dw: placement.width,
    dh: placement.height,
  };
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function scanColor(hex: string): string {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const brightened = channels.map((channel) => Math.min(255, roundHalfEven(channel * 1.8 + 24)));
  return `rgba(${brightened.join(",")},0.96)`;
}

function drawCard(
  context: CanvasRenderingContext2D,
  source: PreviewSource,
  placement: CardPlacement,
  config: GalleryConfigV1,
  fraction: number,
  scanLine: boolean,
) {
  const { layout, canvas } = config;
  const padding = layout.shadow ? 14 : Math.max(2, layout.border_width);
  const patchX = placement.x - padding;
  const patchWidth = placement.width + padding * 2;
  const revealWidth = Math.max(1, roundHalfEven(patchWidth * fraction));

  context.save();
  if (fraction < 1) {
    context.beginPath();
    context.rect(patchX, placement.y - padding, revealWidth, placement.height + padding * 2);
    context.clip();
  }

  if (layout.shadow) {
    context.save();
    context.shadowColor = "rgba(0,0,0,0.74)";
    context.shadowBlur = 18;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 7;
    context.fillStyle = "rgba(0,0,0,0.82)";
    roundedRectPath(context, placement.x, placement.y, placement.width, placement.height, layout.border_radius + 2);
    context.fill();
    context.restore();
  }

  context.save();
  roundedRectPath(context, placement.x, placement.y, placement.width, placement.height, layout.border_radius);
  context.clip();
  context.fillStyle = canvas.background;
  context.fillRect(placement.x, placement.y, placement.width, placement.height);
  const draw = calculateImageDraw(source.width, source.height, placement, layout.preserve_aspect_ratio);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source.source, draw.sx, draw.sy, draw.sw, draw.sh, draw.dx, draw.dy, draw.dw, draw.dh);
  context.restore();

  if (layout.border_width > 0) {
    context.strokeStyle = layout.border_color;
    context.lineWidth = layout.border_width;
    roundedRectPath(context, placement.x, placement.y, placement.width, placement.height, layout.border_radius);
    context.stroke();
  }
  context.restore();

  if (scanLine && fraction < 1) {
    const lineX = patchX + revealWidth - 1;
    const lineTop = placement.y + 4;
    const lineBottom = placement.y + placement.height - 5;
    context.save();
    context.strokeStyle = "rgba(104,65,35,0.51)";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(lineX - 2, lineTop);
    context.lineTo(lineX - 2, lineBottom);
    context.stroke();
    context.strokeStyle = scanColor(layout.border_color);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(lineX, lineTop);
    context.lineTo(lineX, lineBottom);
    context.stroke();
    context.restore();
  }
}

export function renderCanvasPreview(
  context: CanvasRenderingContext2D,
  config: GalleryConfigV1,
  placements: CardPlacement[],
  sources: Array<PreviewSource | undefined>,
  frame: PreviewFrameState,
) {
  context.save();
  context.clearRect(0, 0, config.canvas.width, config.canvas.height);
  context.fillStyle = config.canvas.background;
  context.fillRect(0, 0, config.canvas.width, config.canvas.height);
  for (const index of frame.stableIndices) {
    const source = sources[index];
    if (source) drawCard(context, source, placements[index], config, 1, false);
  }
  if (frame.transitioningIndex !== null) {
    const index = frame.transitioningIndex;
    const source = sources[index];
    if (source) drawCard(context, source, placements[index], config, frame.revealFraction, config.animation.scan_line);
  }
  context.restore();
}
