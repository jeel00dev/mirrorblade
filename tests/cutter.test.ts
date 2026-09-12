import { describe, expect, it } from 'vitest';
import { BladeCutter } from '../src/game/BladeCutter';
import { spendBlade } from '../src/game/BladeEnergy';
import { createPiece, rotatePiece } from '../src/game/Piece';
import { Tray } from '../src/game/Tray';

describe('blade cutter', () => {
  const cutter = new BladeCutter();

  it('performs a valid horizontal cut', () => {
    const piece = createPiece('line-v', [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }], 'cyan', 1);
    const result = cutter.cut(piece, { orientation: 'horizontal', seam: 1 });
    expect(result?.a.cells).toHaveLength(1);
    expect(result?.b.cells).toHaveLength(2);
  });

  it('performs a valid vertical cut', () => {
    const piece = createPiece('line-h', [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 'amber', 1);
    const result = cutter.cut(piece, { orientation: 'vertical', seam: 2 });
    expect(result?.a.cells).toHaveLength(2);
    expect(result?.b.cells).toHaveLength(1);
  });

  it('rejects an empty fragment and a disconnected fragment', () => {
    const line = createPiece('line', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 'coral', 1);
    expect(cutter.cut(line, { orientation: 'vertical', seam: 0 })).toBeNull();
    const bridge = createPiece('bridge', [
      { row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    ], 'violet', 1);
    expect(cutter.cut(bridge, { orientation: 'horizontal', seam: 1 })).toBeNull();
  });

  it('fragments can be cut again while they have a valid seam; generation counts each cut', () => {
    const line = createPiece('line3', [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], 'cyan', 1);
    const first = cutter.cut(line, { orientation: 'vertical', seam: 2 })!;
    expect(first.a.cutGeneration).toBe(1);
    expect(first.a.cells).toHaveLength(2);
    expect(cutter.validCuts(first.a)).toHaveLength(1);
    const second = cutter.cut(first.a, { orientation: 'vertical', seam: 1 })!;
    expect(second.a.cutGeneration).toBe(2);
    expect(second.a.parentId).toBe(first.a.id);
    // A single block has nothing to split.
    expect(cutter.validCuts(first.b)).toEqual([]);
    expect(cutter.validCuts(second.a)).toEqual([]);
  });

  it('a T-shaped fragment left over from a Plus can be split in every rotation', () => {
    const plus = createPiece('plus5', [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }], 'amber', 1);
    let fragment = cutter.cut(plus, { orientation: 'horizontal', seam: 2 })!.a;
    expect(fragment.cells).toHaveLength(4);
    for (let turn = 0; turn < 4; turn += 1) {
      expect(cutter.validCuts(fragment).length).toBeGreaterThanOrEqual(3);
      fragment = rotatePiece(fragment);
    }
  });

  it('spends exactly one blade per successful cut and none with an empty rack', () => {
    const piece = createPiece('line', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 'cyan', 1);
    expect(cutter.cut(piece, { orientation: 'vertical', seam: 1 })).not.toBeNull();
    expect(spendBlade({ blades: 3, energy: 0 }).rack.blades).toBe(2);
    expect(cutter.cut(piece, { orientation: 'vertical', seam: 0 })).toBeNull();
    expect(spendBlade({ blades: 0, energy: 0 }).rack.blades).toBe(0);
  });

  it('replaces one tray piece with two without prematurely refilling', () => {
    const tray = new Tray();
    const a = createPiece('a', [{ row: 0, col: 0 }], 'cyan', 1);
    const b = createPiece('b', [{ row: 0, col: 0 }, { row: 0, col: 1 }], 'coral', 1);
    const c = createPiece('c', [{ row: 0, col: 0 }], 'amber', 1);
    tray.replaceAll([a, b, c]);
    const cut = cutter.cut(b, { orientation: 'vertical', seam: 1 })!;
    expect(tray.replaceWithCut(b.id, cut)).toBe(true);
    expect(tray.list()).toHaveLength(4);
    expect(tray.list().map((piece) => piece.id)).toEqual([a.id, cut.a.id, cut.b.id, c.id]);
  });
});
