import { PRECISION } from '../config/difficulty';
import { BOARD_SIZE, MIRROR_COLUMN } from '../config/gameplay';
import type { BoardState } from './BoardState';
import { cellKey, type GridCell } from './Piece';
import type { SeededRandom } from './SeededRandom';

export interface PrecisionTarget {
  readonly cells: readonly [GridCell, GridCell];
  movesLeft: number;
}

/**
 * Precision Cells: a mirrored pair of empty cells in a nearly complete line glows for a few moves.
 * Clearing a line through both pays a bonus; ignoring them costs nothing.
 */
export class PrecisionCells {
  private active: PrecisionTarget | null = null;
  private movesUntilSpawn: number = PRECISION.interval;
  private stats = { spawned: 0, hit: 0 };

  public current(): PrecisionTarget | null {
    return this.active;
  }

  public summary(): { spawned: number; hit: number } {
    return { ...this.stats };
  }

  /** Called once per move before evaluation. Returns a new target when one spawns. */
  public tick(board: BoardState, level: number, random: SeededRandom): PrecisionTarget | null {
    if (this.active || level < PRECISION.minLevel) return null;
    this.movesUntilSpawn -= 1;
    if (this.movesUntilSpawn > 0) return null;
    this.movesUntilSpawn = PRECISION.interval + random.integer(PRECISION.jitter * 2 + 1) - PRECISION.jitter;
    const candidates = this.candidates(board);
    if (candidates.length === 0) return null;
    const cell = random.pick(candidates);
    this.active = { cells: [cell, { row: cell.row, col: BOARD_SIZE - 1 - cell.col }], movesLeft: PRECISION.lifetimeMoves };
    this.stats.spawned += 1;
    return this.active;
  }

  /** Called after each committed placement with the cells that cleared. */
  public onMove(clearedCells: readonly GridCell[]): 'hit' | 'expired' | null {
    const target = this.active;
    if (!target) return null;
    const cleared = new Set(clearedCells.map(cellKey));
    if (target.cells.every((cell) => cleared.has(cellKey(cell)))) {
      this.active = null;
      this.stats.hit += 1;
      return 'hit';
    }
    target.movesLeft -= 1;
    if (target.movesLeft <= 0) {
      this.active = null;
      return 'expired';
    }
    return null;
  }

  public reset(): void {
    this.active = null;
    this.movesUntilSpawn = PRECISION.interval;
    this.stats = { spawned: 0, hit: 0 };
  }

  /** Empty, non-axis cells lying in a row or column that is already mostly full (so the clear is plausible), whose mirror is also empty. */
  private candidates(board: BoardState): GridCell[] {
    const result: GridCell[] = [];
    const rowFill = Array.from({ length: BOARD_SIZE }, (_, row) => Array.from({ length: BOARD_SIZE }, (_, col) => board.get(row, col)).filter(Boolean).length);
    const colFill = Array.from({ length: BOARD_SIZE }, (_, col) => Array.from({ length: BOARD_SIZE }, (_, row) => board.get(row, col)).filter(Boolean).length);
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < MIRROR_COLUMN; col += 1) {
        const mirror = BOARD_SIZE - 1 - col;
        if (!board.isEmpty(row, col) || !board.isEmpty(row, mirror)) continue;
        const plausible = rowFill[row]! >= PRECISION.minLineFill || colFill[col]! >= PRECISION.minLineFill;
        if (plausible) result.push({ row, col });
      }
    }
    return result;
  }
}
