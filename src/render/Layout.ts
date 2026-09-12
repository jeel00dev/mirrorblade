export type LayoutMode = 'portrait' | 'landscape';

export interface LayoutMetrics {
  mode: LayoutMode;
  cell: number;
  trayCell: number;
  railWidth: number;
  rowGap: number;
  trayOrientation: 'row' | 'column';
  width: number;
  height: number;
}

/** Board size in cells plus frame padding (0.24 cell each side) — keep in sync with board.css. */
const BOARD_CELLS_WITH_FRAME = 9 + 0.48;
/** Widest piece in the library. */
const MAX_PIECE_SPAN = 5;

/**
 * Computes the gameplay layout from both viewport dimensions and publishes it as CSS variables.
 * Replaces V1's nested min() chains, which could not reason about width and height together.
 */
export function computeLayout(width: number, height: number): LayoutMetrics {
  const landscape = width >= 700 && width >= height * 1.12;
  if (landscape) {
    const pad = width >= 1200 ? 28 : 16;
    const gap = width >= 1200 ? 48 : 24;
    const minRail = 268;
    const maxRail = width >= 1600 ? 460 : 420;
    const boardSize = Math.max(240, Math.min(height - pad * 2, width - minRail - gap - pad * 2, 940));
    const railWidth = Math.round(Math.min(maxRail, width - boardSize - gap - pad * 2));
    const cell = Math.floor((boardSize / BOARD_CELLS_WITH_FRAME) * 10) / 10;
    const railInner = railWidth - 8;
    // Rail budget outside the tray: HUD 64 + status 36 + blade dock (≤150) + three 16px gaps.
    const railBudget = 64 + 36 + Math.min(150, Math.max(96, cell * 2.4)) + 48 + 28;
    const columnCell = Math.floor(Math.min(cell * 0.66, railInner / (MAX_PIECE_SPAN + 0.8), (height - railBudget - pad * 2) / 3 / 3.6));
    const rowCell = Math.floor(Math.min(cell * 0.62, (railInner - 16) / 3 / (MAX_PIECE_SPAN + 0.5), (height - railBudget - pad * 2) / 3.5));
    const trayOrientation: 'row' | 'column' = columnCell >= 30 && columnCell >= rowCell ? 'column' : 'row';
    const trayCell = trayOrientation === 'column' ? columnCell : rowCell;
    return { mode: 'landscape', cell, trayCell: Math.max(14, trayCell), railWidth, rowGap: 16, trayOrientation, width, height };
  }
  const pad = width < 400 ? 12 : 16;
  const header = height < 700 ? 56 : 64;
  const minGap = 12;
  const boardMax = Math.min(width - pad * 2, 760);
  const trayHeightFor = (trayCell: number): number => trayCell * 3.4;
  const bladeHeight = Math.min(150, Math.max(96, height * 0.16));
  // First pass: board limited by width, then check the height budget.
  let cell = Math.floor((boardMax / BOARD_CELLS_WITH_FRAME) * 10) / 10;
  const slotWidth = (width - pad * 2 - 16) / 3;
  let trayCell = Math.floor(Math.min(cell * 0.62, slotWidth / (MAX_PIECE_SPAN + 0.5)));
  let total = header + cell * BOARD_CELLS_WITH_FRAME + trayHeightFor(trayCell) + bladeHeight + minGap * 3 + pad;
  if (total > height) {
    const available = height - header - trayHeightFor(trayCell) - bladeHeight - minGap * 3 - pad;
    cell = Math.floor((Math.max(200, available) / BOARD_CELLS_WITH_FRAME) * 10) / 10;
    trayCell = Math.floor(Math.min(cell * 0.62, slotWidth / (MAX_PIECE_SPAN + 0.5), trayCell));
    total = header + cell * BOARD_CELLS_WITH_FRAME + trayHeightFor(trayCell) + bladeHeight + minGap * 3 + pad;
  }
  // Spread leftover height into the gaps (capped) so tall phones do not pile everything at the top.
  const leftover = Math.max(0, height - total);
  const rowGap = Math.round(Math.min(40, minGap + leftover / 4));
  return { mode: 'portrait', cell, trayCell: Math.max(14, trayCell), railWidth: 0, rowGap, trayOrientation: 'row', width, height };
}

export function applyLayout(root: HTMLElement, metrics: LayoutMetrics): void {
  root.style.setProperty('--cell', `${metrics.cell}px`);
  root.style.setProperty('--board-w', `${Math.round(metrics.cell * BOARD_CELLS_WITH_FRAME)}px`);
  root.style.setProperty('--tray-cell', `${metrics.trayCell}px`);
  root.style.setProperty('--rail-w', `${metrics.railWidth}px`);
  root.style.setProperty('--row-gap', `${metrics.rowGap}px`);
  root.dataset.layout = metrics.mode;
  root.dataset.tray = metrics.trayOrientation;
}
