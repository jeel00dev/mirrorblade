import { describe, expect, it } from 'vitest';
import { BoardState } from '../src/game/BoardState';
import { BladeCutter } from '../src/game/BladeCutter';
import { MoveAnalyzer } from '../src/game/MoveAnalyzer';
import { createPiece } from '../src/game/Piece';
import { PieceGenerator } from '../src/game/PieceGenerator';
import { PlacementSystem } from '../src/game/PlacementSystem';
import { SeededRandom } from '../src/game/SeededRandom';
import { dailySeed, utcDateKey } from '../src/game/DailyMode';

describe('seeded generation and game over', () => {
  it('produces a deterministic sequence', () => {
    const first = new PieceGenerator(new SeededRandom(1234)).nextBatch(new BoardState(), 0);
    const second = new PieceGenerator(new SeededRandom(1234)).nextBatch(new BoardState(), 0);
    expect(first.map((piece) => [piece.definitionId, piece.tone])).toEqual(second.map((piece) => [piece.definitionId, piece.tone]));
  });

  it('keeps the Daily Mirror seed stable for a UTC calendar date', () => {
    expect(dailySeed('2026-09-11')).toBe(dailySeed('2026-09-11'));
    expect(dailySeed('2026-09-11')).not.toBe(dailySeed('2026-09-12'));
    expect(utcDateKey(new Date(Date.UTC(2026, 8, 11, 23, 59)))).toBe('2026-09-11');
    expect(utcDateKey(new Date(Date.UTC(2026, 8, 12, 0, 1)))).toBe('2026-09-12');
  });

  it('daily sequences do not depend on the board or the score', () => {
    const emptyBoard = new BoardState();
    const crowded = new BoardState();
    const cells = [];
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 9; col += 1) cells.push({ row, col });
    crowded.occupy(cells, { tone: 'cyan', pieceId: 'fill' });
    const a = new PieceGenerator(new SeededRandom(dailySeed('2026-09-11')), { mode: 'daily' });
    const b = new PieceGenerator(new SeededRandom(dailySeed('2026-09-11')), { mode: 'daily' });
    const sequenceA = [a.nextBatch(emptyBoard, 0), a.nextBatch(emptyBoard, 0), a.nextBatch(emptyBoard, 0)].flat();
    const sequenceB = [b.nextBatch(crowded, 9000), b.nextBatch(crowded, 9000), b.nextBatch(crowded, 9000)].flat();
    expect(sequenceA.map((p) => [p.definitionId, p.tone])).toEqual(sequenceB.map((p) => [p.definitionId, p.tone]));
  });

  it('endless does not emit a fully impossible batch when a library shape fits in some orientation', () => {
    const board = new BoardState();
    const cells = [];
    for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) if (!(row === 4 && col === 4)) cells.push({ row, col });
    board.occupy(cells, { tone: 'cyan', pieceId: 'fill' });
    const batch = new PieceGenerator(new SeededRandom(99)).nextBatch(board, 9000);
    const analyzer = new MoveAnalyzer(board);
    expect(batch.some((piece) => analyzer.fitsAnyOrientation(piece))).toBe(true);
  });

  it('does not end while a normal move exists', () => {
    const board = new BoardState();
    const piece = createPiece('single', [{ row: 0, col: 0 }], 'cyan', 1);
    expect(new MoveAnalyzer(board).analyze([piece], 0).gameOver).toBe(false);
  });

  it('does not end when cutting remains possible', () => {
    const board = new BoardState();
    const cells = [];
    for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) cells.push({ row, col });
    board.occupy(cells, { tone: 'cyan', pieceId: 'fill' });
    const piece = createPiece('domino', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 'coral', 1);
    expect(new BladeCutter().validCuts(piece)).not.toHaveLength(0);
    expect(new MoveAnalyzer(board).analyze([piece], 1)).toEqual({ canPlace: false, canCut: true, gameOver: false, legalOptions: 0 });
  });

  it('ends with no move and no usable blade action', () => {
    const board = new BoardState();
    const cells = [];
    for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) cells.push({ row, col });
    board.occupy(cells, { tone: 'cyan', pieceId: 'fill' });
    const fragment = createPiece('fragment', [{ row: 0, col: 0 }], 'violet', 1, 1, 'parent');
    expect(new MoveAnalyzer(board).analyze([fragment], 3).gameOver).toBe(true);
    expect(new PlacementSystem(board).canPlace(fragment)).toBe(false);
  });
});
