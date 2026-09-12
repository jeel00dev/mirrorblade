import { normalizeCells, pieceDimensions, type GridCell } from '../game/Piece';

export interface PiecePreviewLayout {
  /** CSS pixels per piece grid cell. */
  scale: number;
  offsetX: number;
  offsetY: number;
  boundingWidth: number;
  boundingHeight: number;
  rows: number;
  cols: number;
}

export interface PiecePreviewOptions {
  padding?: number;
  interactionAllowance?: number;
  maximumPreviewScale?: number;
  minimumPreviewScale?: number;
}

/**
 * Authoritative tray-preview fit. Cells are normalized before dimensions are measured so cut/rotated
 * pieces cannot retain a parent-space offset. The returned offsets center the complete grid bounds.
 */
export function calculatePiecePreviewLayout(
  piece: { readonly cells: readonly GridCell[] },
  containerWidth: number,
  containerHeight: number,
  options: PiecePreviewOptions = {},
): PiecePreviewLayout {
  const cells = normalizeCells(piece.cells);
  const { rows, cols } = pieceDimensions({ cells });
  const padding = Math.max(0, options.padding ?? 8);
  const allowance = Math.max(0, options.interactionAllowance ?? 4);
  const maximum = Math.max(1, options.maximumPreviewScale ?? 42);
  const minimum = Math.max(1, Math.min(maximum, options.minimumPreviewScale ?? 1));
  const inset = padding + allowance;
  const usableWidth = Math.max(1, containerWidth - inset * 2);
  const usableHeight = Math.max(1, containerHeight - inset * 2);
  const scale = Math.max(minimum, Math.min(maximum, usableWidth / cols, usableHeight / rows));
  const boundingWidth = cols * scale;
  const boundingHeight = rows * scale;
  return {
    scale,
    offsetX: (containerWidth - boundingWidth) / 2,
    offsetY: (containerHeight - boundingHeight) / 2,
    boundingWidth,
    boundingHeight,
    rows,
    cols,
  };
}
