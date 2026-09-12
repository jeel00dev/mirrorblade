import { describe, expect, it } from 'vitest';
import { BoardState } from '../src/game/BoardState';
import { createPiece } from '../src/game/Piece';
import { mirrorColumn, mirroredUnion } from '../src/game/MirrorRules';
import { PlacementSystem } from '../src/game/PlacementSystem';

describe('mirror rules', () => {
  it('mirrors columns across the fixed center', () => {
    expect(mirrorColumn(0)).toBe(8);
    expect(mirrorColumn(1)).toBe(7);
    expect(mirrorColumn(4)).toBe(4);
  });

  it('collapses duplicated center cells', () => {
    expect(mirroredUnion([{ row: 2, col: 4 }])).toEqual([{ row: 2, col: 4 }]);
  });

  it('generates both original and reflected cells', () => {
    expect(mirroredUnion([{ row: 2, col: 1 }, { row: 3, col: 1 }])).toEqual([
      { row: 2, col: 1 }, { row: 2, col: 7 }, { row: 3, col: 1 }, { row: 3, col: 7 },
    ]);
  });

  it('rejects a collision on the mirrored side', () => {
    const board = new BoardState();
    board.occupy([{ row: 2, col: 7 }], { tone: 'cyan', pieceId: 'existing' });
    const system = new PlacementSystem(board);
    const piece = createPiece('single', [{ row: 0, col: 0 }], 'coral', 1);
    expect(system.preview(piece, { row: 2, col: 1 }).valid).toBe(false);
  });

  it('rejects out-of-bounds originals before commit', () => {
    const system = new PlacementSystem(new BoardState());
    const piece = createPiece('domino', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 'amber', 1);
    expect(system.preview(piece, { row: 0, col: -1 }).valid).toBe(false);
  });
});
