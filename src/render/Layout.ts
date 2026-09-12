export type LayoutMode = 'portrait' | 'landscape';

export interface LayoutMetrics {
  mode: LayoutMode;
  cell: number;
  /** Maximum resting preview cell size; each piece is fitted below this cap. */
  trayCell: number;
  railWidth: number;
  rowGap: number;
  columnGap: number;
  trayColumns: number;
  trayRowHeight: number;
  trayHeight: number;
  bladeSize: number;
  width: number;
  height: number;
}

/** Board size in cells plus frame padding (0.24 cell each side) — keep in sync with board.css. */
const BOARD_CELLS_WITH_FRAME = 9 + 0.48;
const TRAY_GAP = 8;
/** When more rows exist than fit, this fraction of the next row stays visible so the scroll is self-evident. */
const PEEK_ROW = 0.3;

export interface RectEdges {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export function rectsOverlap(a: RectEdges, b: RectEdges): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function tenth(value: number): number {
  return Math.floor(value * 10) / 10;
}

/**
 * Computes gameplay geometry from the actual content box available to the game.
 * Piece count changes tray tracks/capacity, while the blade always retains its own sibling region.
 */
export function computeLayout(width: number, height: number, pieceCount = 3): LayoutMetrics {
  const safeCount = Math.max(1, Math.floor(pieceCount));
  const landscape = width >= height * 1.25;

  if (landscape) {
    const short = height < 430;
    const columnGap = width >= 1160 ? 48 : width < 620 ? 16 : 24;
    const minRail = width < 620 ? 232 : 268;
    const maxRail = width >= 1580 ? 460 : width < 700 ? 280 : 420;
    const boardSize = clamp(Math.min(height, width - minRail - columnGap, 940), 180, 940);
    const railWidth = Math.max(minRail, Math.min(maxRail, width - boardSize - columnGap));
    const cell = tenth(boardSize / BOARD_CELLS_WITH_FRAME);
    const headerHeight = short ? 48 : 64;
    const statusHeight = 36;
    const bladeSize = clamp(cell * 2.4, short ? 76 : 96, 150);
    const rowGap = short ? 6 : 16;
    const trayBudget = Math.max(64, height - headerHeight - statusHeight - bladeSize - rowGap * 3);
    const trayColumns = safeCount <= 3 ? safeCount : 2;
    const desiredRows = Math.ceil(safeCount / trayColumns);
    const visibleRows = Math.max(1, Math.min(desiredRows, height >= 650 ? 4 : 2));
    const minRow = short ? 78 : 88;
    const maxRow = height >= 650 ? 132 : 112;
    const peek = desiredRows > visibleRows ? PEEK_ROW : 0;
    const gaps = TRAY_GAP * (visibleRows - 1) + (peek ? TRAY_GAP : 0);
    const fittedRow = (trayBudget - gaps) / (visibleRows + peek);
    const trayRowHeight = clamp(fittedRow, Math.min(minRow, trayBudget), maxRow);
    const trayHeight = Math.min(trayBudget, trayRowHeight * (visibleRows + peek) + gaps);
    const trayCell = clamp(Math.min(cell * 0.66, trayRowHeight / 2.8), 14, 42);
    return {
      mode: 'landscape', cell, trayCell, railWidth: Math.round(railWidth), rowGap, columnGap,
      trayColumns, trayRowHeight: Math.floor(trayRowHeight), trayHeight: Math.floor(trayHeight),
      bladeSize: Math.floor(bladeSize), width, height,
    };
  }

  const compact = height < 650;
  const headerHeight = compact ? 52 : 64;
  const bladeSize = clamp(height * 0.14, compact ? 80 : 96, 132);
  const baseGap = compact ? 8 : 12;
  const trayColumns = safeCount <= 3 ? safeCount : width < 330 ? 2 : 3;
  const desiredRows = Math.ceil(safeCount / trayColumns);
  const visibleRowLimit = compact && height < 580 ? 1 : 2;
  const visibleRows = Math.max(1, Math.min(desiredRows, safeCount <= 3 ? 1 : visibleRowLimit));
  const minRow = compact ? 78 : 88;
  const maxRow = width >= 600 ? 116 : 104;
  const preferredRow = clamp((width / trayColumns) * 0.58, minRow, maxRow);
  const peek = desiredRows > visibleRows ? PEEK_ROW : 0;
  const gaps = TRAY_GAP * (visibleRows - 1) + (peek ? TRAY_GAP : 0);
  const desiredTrayHeight = preferredRow * (visibleRows + peek) + gaps;
  const boardByWidth = Math.min(width, 760);
  const minimumBoard = Math.min(boardByWidth, compact ? 196 : 224);
  const heightAfterFixed = height - headerHeight - bladeSize - baseGap * 3;
  let boardSize = Math.min(boardByWidth, heightAfterFixed - desiredTrayHeight);
  boardSize = Math.max(minimumBoard, boardSize);
  let trayHeight = heightAfterFixed - boardSize;
  const oneRowMinimum = Math.min(minRow, Math.max(64, heightAfterFixed - minimumBoard));
  if (trayHeight < oneRowMinimum) {
    boardSize = Math.max(minimumBoard, boardSize - (oneRowMinimum - trayHeight));
    trayHeight = heightAfterFixed - boardSize;
  }
  trayHeight = Math.max(64, Math.min(desiredTrayHeight, trayHeight));
  const fittedRow = (trayHeight - gaps) / (visibleRows + peek);
  const trayRowHeight = clamp(fittedRow, Math.min(64, fittedRow), maxRow);
  const cell = tenth(boardSize / BOARD_CELLS_WITH_FRAME);
  const trayCell = clamp(Math.min(cell * 0.68, trayRowHeight / 2.7), 14, 42);
  const used = headerHeight + boardSize + trayHeight + bladeSize + baseGap * 3;
  const rowGap = Math.floor(Math.min(24, baseGap + Math.max(0, height - used) / 4));
  return {
    mode: 'portrait', cell, trayCell, railWidth: 0, rowGap, columnGap: 0,
    trayColumns, trayRowHeight: Math.floor(trayRowHeight), trayHeight: Math.floor(trayHeight),
    bladeSize: Math.floor(bladeSize), width, height,
  };
}

export function applyLayout(root: HTMLElement, metrics: LayoutMetrics): void {
  root.style.setProperty('--cell', `${metrics.cell}px`);
  root.style.setProperty('--board-w', `${Math.round(metrics.cell * BOARD_CELLS_WITH_FRAME)}px`);
  root.style.setProperty('--tray-cell', `${metrics.trayCell}px`);
  root.style.setProperty('--rail-w', `${metrics.railWidth}px`);
  root.style.setProperty('--row-gap', `${metrics.rowGap}px`);
  root.style.setProperty('--layout-column-gap', `${metrics.columnGap}px`);
  root.style.setProperty('--tray-columns', String(metrics.trayColumns));
  root.style.setProperty('--tray-row-h', `${metrics.trayRowHeight}px`);
  root.style.setProperty('--tray-region-h', `${metrics.trayHeight}px`);
  root.style.setProperty('--blade-size', `${metrics.bladeSize}px`);
  root.dataset.layout = metrics.mode;
}
