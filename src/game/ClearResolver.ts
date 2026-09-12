import { BOARD_SIZE } from '../config/gameplay';
import { BoardState } from './BoardState';
import type { GridCell } from './Piece';

export interface ClearResult {
  readonly rows: readonly number[];
  readonly columns: readonly number[];
  readonly cells: readonly GridCell[];
  readonly lineCount: number;
}

export class ClearResolver {
  public constructor(private readonly board: BoardState) {}

  public detect(): ClearResult {
    const rows = Array.from({ length: BOARD_SIZE }, (_, row) => row)
      .filter((row) => Array.from({ length: BOARD_SIZE }, (_, col) => this.board.get(row, col)).every(Boolean));
    const columns = Array.from({ length: BOARD_SIZE }, (_, col) => col)
      .filter((col) => Array.from({ length: BOARD_SIZE }, (_, row) => this.board.get(row, col)).every(Boolean));
    const unique = new Map<string, GridCell>();
    rows.forEach((row) => Array.from({ length: BOARD_SIZE }, (_, col) => unique.set(`${row}:${col}`, { row, col })));
    columns.forEach((col) => Array.from({ length: BOARD_SIZE }, (_, row) => unique.set(`${row}:${col}`, { row, col })));
    return { rows, columns, cells: [...unique.values()], lineCount: rows.length + columns.length };
  }

  public resolve(): ClearResult {
    const result = this.detect();
    this.board.clear(result.cells);
    return result;
  }
}
