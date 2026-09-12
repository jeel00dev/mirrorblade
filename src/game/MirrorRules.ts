import { BOARD_SIZE, MIRROR_COLUMN } from '../config/gameplay';
import type { GridCell, Piece } from './Piece';

export function mirrorColumn(col: number): number {
  return BOARD_SIZE - 1 - col;
}

export function buildOriginalCells(piece: Piece, anchor: GridCell): GridCell[] {
  return piece.cells.map((cell) => ({ row: anchor.row + cell.row, col: anchor.col + cell.col }));
}

export function mirroredUnion(cells: readonly GridCell[]): GridCell[] {
  const unique = new Map<string, GridCell>();
  for (const cell of cells) {
    unique.set(`${cell.row}:${cell.col}`, cell);
    const mirror = { row: cell.row, col: mirrorColumn(cell.col) };
    unique.set(`${mirror.row}:${mirror.col}`, mirror);
  }
  return [...unique.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

export function touchesMirrorAxis(cells: readonly GridCell[]): boolean {
  return cells.some((cell) => cell.col === MIRROR_COLUMN);
}
