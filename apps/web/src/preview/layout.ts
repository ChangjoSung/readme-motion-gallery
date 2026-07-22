import type { GalleryConfigV1 } from "../types";

export type CardPlacement = { x: number; y: number; width: number; height: number };

export class PreviewLayoutError extends Error {}

export function roundHalfEven(value: number): number {
  if (!Number.isFinite(value)) return value;
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

type GridCandidate = {
  score: number;
  balance: number;
  columns: number;
  cardWidth: number;
  cardHeight: number;
};

function candidateIsBetter(candidate: GridCandidate, best: GridCandidate): boolean {
  const left = [candidate.score, candidate.balance, candidate.columns, candidate.cardWidth, candidate.cardHeight];
  const right = [best.score, best.balance, best.columns, best.cardWidth, best.cardHeight];
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

export function calculatePlacements(
  count: number,
  canvas: GalleryConfigV1["canvas"],
  layout: GalleryConfigV1["layout"],
): CardPlacement[] {
  if (count < 1) return [];
  const availableWidth = canvas.width - layout.margin * 2;
  const availableHeight = canvas.height - layout.margin * 2;
  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new PreviewLayoutError("Layout margin leaves no usable canvas area.");
  }

  let best: GridCandidate | null = null;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const cellWidth = (availableWidth - layout.gap * (columns - 1)) / columns;
    const cellHeight = (availableHeight - layout.gap * (rows - 1)) / rows;
    if (cellWidth <= 0 || cellHeight <= 0) continue;
    const rawCardWidth = Math.min(cellWidth, cellHeight * layout.card_aspect_ratio);
    const rawCardHeight = rawCardWidth / layout.card_aspect_ratio;
    const candidate: GridCandidate = {
      score: rawCardWidth * rawCardHeight,
      balance: -Math.abs(columns - rows),
      columns,
      cardWidth: roundHalfEven(rawCardWidth),
      cardHeight: roundHalfEven(rawCardHeight),
    };
    if (!best || candidateIsBetter(candidate, best)) best = candidate;
  }

  if (!best) {
    throw new PreviewLayoutError("Canvas is too small for the image count, margin, and gap.");
  }

  const columns = best.columns;
  const rows = Math.ceil(count / columns);
  const usableWidth = canvas.width - layout.margin * 2;
  const usableHeight = canvas.height - layout.margin * 2;
  const cellWidth = (usableWidth - layout.gap * (columns - 1)) / columns;
  const cellHeight = (usableHeight - layout.gap * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = layout.type === "staggered" ? Math.floor(index / rows) : index % columns;
    const row = layout.type === "staggered" ? index % rows : Math.floor(index / columns);
    let x = layout.margin + column * (cellWidth + layout.gap) + (cellWidth - best.cardWidth) / 2;
    let y = layout.margin + row * (cellHeight + layout.gap) + (cellHeight - best.cardHeight) / 2;

    if (layout.type === "staggered" && row % 2 === 1 && column < columns - 1) {
      x += Math.min(best.cardWidth * 0.12, layout.gap + best.cardWidth * 0.06);
    }
    x = Math.min(Math.max(layout.margin, x), canvas.width - layout.margin - best.cardWidth);
    y = Math.min(Math.max(layout.margin, y), canvas.height - layout.margin - best.cardHeight);
    return {
      x: roundHalfEven(x),
      y: roundHalfEven(y),
      width: best.cardWidth,
      height: best.cardHeight,
    };
  });
}
