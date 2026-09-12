import { describe, expect, it } from 'vitest';
import { BoardState } from '../src/game/BoardState';
import { BladeCutter } from '../src/game/BladeCutter';
import { MoveAnalyzer } from '../src/game/MoveAnalyzer';
import { createPiece, distinctOrientations, hasQuarterSymmetry, rotateCellsClockwise, rotatePiece, sameCells } from '../src/game/Piece';
import { PlacementSystem } from '../src/game/PlacementSystem';
import { Tray } from '../src/game/Tray';

const L = [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }];

describe('piece rotation', () => {
  it('rotates 90° clockwise and normalizes to the origin', () => {
    const once = rotateCellsClockwise(L);
    expect(once).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }]);
    expect(Math.min(...once.map((c) => c.row))).toBe(0);
    expect(Math.min(...once.map((c) => c.col))).toBe(0);
  });

  it('180° and 270° produce the expected shapes and 360° returns the original', () => {
    const piece = createPiece('l4', L, 'cyan', 1);
    const r1 = rotatePiece(piece);
    const r2 = rotatePiece(r1);
    const r3 = rotatePiece(r2);
    const r4 = rotatePiece(r3);
    expect(r2.cells).toEqual([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }]);
    expect(r3.cells).toEqual([{ row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }]);
    expect(sameCells(r4.cells, piece.cells)).toBe(true);
    expect(r4.rotation).toBe(0);
    expect(r1.id).toBe(piece.id);
    expect(r1.tone).toBe(piece.tone);
  });

  it('detects quarter symmetry so the UI can skip pointless animation', () => {
    expect(hasQuarterSymmetry({ cells: [{ row: 0, col: 0 }] })).toBe(true);
    expect(hasQuarterSymmetry({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }] })).toBe(true);
    expect(hasQuarterSymmetry({ cells: L })).toBe(false);
    expect(distinctOrientations([{ row: 0, col: 0 }, { row: 0, col: 1 }])).toHaveLength(2);
    expect(distinctOrientations(L)).toHaveLength(4);
  });

  it('rotated pieces respect collisions and mirrored placement', () => {
    const board = new BoardState();
    const placement = new PlacementSystem(board);
    const line = createPiece('line3', [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 'amber', 1);
    // Horizontal three at columns 0-2 mirrors to 6-8: eight unique cells.
    expect(placement.preview(line, { row: 0, col: 0 }).union).toHaveLength(6);
    const vertical = rotatePiece(line);
    expect(vertical.cells).toEqual([{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }]);
    // Vertical at row 7 would fall off the board.
    expect(placement.preview(vertical, { row: 7, col: 0 }).valid).toBe(false);
    board.occupy([{ row: 1, col: 8 }], { tone: 'cyan', pieceId: 'block' });
    // Column 0 mirrors to column 8 where row 1 is occupied.
    expect(placement.preview(vertical, { row: 0, col: 0 }).valid).toBe(false);
    expect(placement.preview(vertical, { row: 0, col: 1 }).valid).toBe(true);
  });

  it('rotation works on cut fragments and does not consume anything', () => {
    const tray = new Tray();
    const piece = createPiece('l4', L, 'violet', 1);
    tray.replaceAll([piece]);
    const cut = new BladeCutter().cut(piece, { orientation: 'horizontal', seam: 2 })!;
    expect(tray.replaceWithCut(piece.id, cut)).toBe(true);
    const fragment = tray.list()[1]!;
    expect(fragment.cutGeneration).toBe(1);
    const rotated = tray.rotate(fragment.id)!;
    expect(rotated.cutGeneration).toBe(1);
    expect(rotated.rotation).toBe(1);
    expect(tray.list()).toHaveLength(2);
  });

  it('move analysis counts every distinct orientation', () => {
    const board = new BoardState();
    // Fill everything except a vertical 3-slot at column 1 rows 0-2 (and its mirror column 7).
    const cells = [];
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const gap = row <= 2 && (col === 1 || col === 7);
        if (!gap) cells.push({ row, col });
      }
    }
    board.occupy(cells, { tone: 'cyan', pieceId: 'fill' });
    const horizontalThree = createPiece('line3', [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 'cyan', 1);
    expect(new PlacementSystem(board).canPlace(horizontalThree)).toBe(false);
    const analysis = new MoveAnalyzer(board).analyze([horizontalThree], 0);
    expect(analysis.canPlace).toBe(true);
    expect(analysis.legalOptions).toBe(2);
    expect(analysis.gameOver).toBe(false);
  });
});
