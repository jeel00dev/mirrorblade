import { BOARD_SIZE } from '../config/gameplay';
import type { BlockTone, GridCell } from './Piece';

export interface BoardCell {
  readonly tone: BlockTone;
  readonly pieceId: string;
}

export class BoardState {
  private readonly cells: (BoardCell | null)[][];

  public constructor(source?: readonly (readonly (BoardCell | null)[])[]) {
    this.cells = Array.from({ length: BOARD_SIZE }, (_, row) =>
      Array.from({ length: BOARD_SIZE }, (_, col) => source?.[row]?.[col] ?? null),
    );
  }

  public get(row: number, col: number): BoardCell | null {
    return this.isInside(row, col) ? this.cells[row]![col]! : null;
  }

  public isEmpty(row: number, col: number): boolean {
    return this.isInside(row, col) && this.cells[row]![col] === null;
  }

  public isInside(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  public occupy(cells: readonly GridCell[], value: BoardCell): void {
    cells.forEach(({ row, col }) => {
      if (!this.isInside(row, col)) throw new Error(`Cell outside board: ${row},${col}`);
      if (!this.isEmpty(row, col)) throw new Error(`Cell already occupied: ${row},${col}`);
    });
    cells.forEach(({ row, col }) => { this.cells[row]![col] = value; });
  }

  public clear(cells: readonly GridCell[]): void {
    cells.forEach(({ row, col }) => {
      if (this.isInside(row, col)) this.cells[row]![col] = null;
    });
  }

  public reset(): void {
    for (const row of this.cells) row.fill(null);
  }

  public occupiedCount(): number {
    return this.cells.reduce((total, row) => total + row.filter(Boolean).length, 0);
  }

  public snapshot(): (BoardCell | null)[][] {
    return this.cells.map((row) => row.map((cell) => cell ? { ...cell } : null));
  }
}
