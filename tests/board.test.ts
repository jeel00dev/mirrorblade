import { describe, expect, it } from 'vitest';
import { BoardState } from '../src/game/BoardState';
import { ClearResolver } from '../src/game/ClearResolver';
import { createPiece } from '../src/game/Piece';
import { PlacementSystem } from '../src/game/PlacementSystem';

const occupied = { tone: 'cyan' as const, pieceId: 'test' };

describe('placement', () => {
  it('validates and commits the entire mirrored transaction', () => {
    const board = new BoardState();
    const placement = new PlacementSystem(board);
    const piece = createPiece('domino-v', [{ row: 0, col: 0 }, { row: 1, col: 0 }], 'cyan', 1);
    expect(placement.preview(piece, { row: 2, col: 1 }).valid).toBe(true);
    expect(placement.commit(piece, { row: 2, col: 1 })).toHaveLength(4);
    expect(board.get(2, 1)?.pieceId).toBe(piece.id);
    expect(board.get(2, 7)?.pieceId).toBe(piece.id);
    expect(board.get(3, 1)?.pieceId).toBe(piece.id);
    expect(board.get(3, 7)?.pieceId).toBe(piece.id);
  });

  it('does not partially commit invalid occupancy', () => {
    const board = new BoardState();
    board.occupy([{ row: 2, col: 7 }], occupied);
    const placement = new PlacementSystem(board);
    const piece = createPiece('single', [{ row: 0, col: 0 }], 'coral', 1);
    expect(() => placement.commit(piece, { row: 2, col: 1 })).toThrow();
    expect(board.occupiedCount()).toBe(1);
  });
});

describe('simultaneous clearing', () => {
  it('detects and resolves a full row', () => {
    const board = new BoardState();
    board.occupy(Array.from({ length: 9 }, (_, col) => ({ row: 3, col })), occupied);
    const result = new ClearResolver(board).resolve();
    expect(result.rows).toEqual([3]);
    expect(result.columns).toEqual([]);
    expect(result.cells).toHaveLength(9);
    expect(board.occupiedCount()).toBe(0);
  });

  it('detects and resolves a full column', () => {
    const board = new BoardState();
    board.occupy(Array.from({ length: 9 }, (_, row) => ({ row, col: 5 })), occupied);
    const result = new ClearResolver(board).resolve();
    expect(result.columns).toEqual([5]);
    expect(result.cells).toHaveLength(9);
  });

  it('counts intersecting row and column as two lines but one cell', () => {
    const board = new BoardState();
    const cells = [
      ...Array.from({ length: 9 }, (_, col) => ({ row: 4, col })),
      ...Array.from({ length: 9 }, (_, row) => ({ row, col: 4 })),
    ];
    const unique = [...new Map(cells.map((cell) => [`${cell.row}:${cell.col}`, cell])).values()];
    board.occupy(unique, occupied);
    const result = new ClearResolver(board).resolve();
    expect(result.lineCount).toBe(2);
    expect(result.cells).toHaveLength(17);
  });

  it('resolves multiple rows and columns in one pass', () => {
    const board = new BoardState();
    const cells = [
      ...Array.from({ length: 9 }, (_, col) => ({ row: 1, col })),
      ...Array.from({ length: 9 }, (_, col) => ({ row: 7, col })),
      ...Array.from({ length: 9 }, (_, row) => ({ row, col: 2 })),
    ];
    board.occupy([...new Map(cells.map((cell) => [`${cell.row}:${cell.col}`, cell])).values()], occupied);
    const result = new ClearResolver(board).resolve();
    expect(result.rows).toEqual([1, 7]);
    expect(result.columns).toEqual([2]);
    expect(result.lineCount).toBe(3);
  });
});
