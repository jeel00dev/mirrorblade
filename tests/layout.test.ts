import { describe, expect, it } from 'vitest';
import { createPiece } from '../src/game/Piece';
import { calculatePiecePreviewLayout } from '../src/render/PiecePreviewLayout';
import { computeLayout, rectsOverlap } from '../src/render/Layout';

const line = (length: number, vertical = false) => Array.from({ length }, (_, index) => vertical
  ? { row: index, col: 0 }
  : { row: 0, col: index });

describe('responsive tray layout', () => {
  it('fits 1×1 through 1×5 and their rotations inside the configured card allowance', () => {
    for (const width of [72, 104, 160, 240]) {
      for (const height of [78, 96, 116, 132]) {
        for (let length = 1; length <= 5; length += 1) {
          for (const vertical of [false, true]) {
            const piece = createPiece('line', line(length, vertical), 'coral', 1);
            const fit = calculatePiecePreviewLayout(piece, width, height, { padding: 8, interactionAllowance: 4, maximumPreviewScale: 42 });
            expect(fit.offsetX).toBeGreaterThanOrEqual(12 - 0.001);
            expect(fit.offsetY).toBeGreaterThanOrEqual(12 - 0.001);
            expect(fit.offsetX + fit.boundingWidth).toBeLessThanOrEqual(width - 12 + 0.001);
            expect(fit.offsetY + fit.boundingHeight).toBeLessThanOrEqual(height - 12 + 0.001);
          }
        }
      }
    }
  });

  it('normalizes and centers irregular fragment bounds instead of retaining parent coordinates', () => {
    const offsetFragment = { cells: [{ row: 4, col: 6 }, { row: 5, col: 6 }, { row: 5, col: 7 }, { row: 6, col: 6 }] };
    const normalizedFragment = { cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }] };
    expect(calculatePiecePreviewLayout(offsetFragment, 180, 116)).toEqual(calculatePiecePreviewLayout(normalizedFragment, 180, 116));
  });

  it('allocates count-driven columns and bounded tray geometry at every target shape', () => {
    const viewports = [
      [1920, 1080], [1600, 900], [1366, 768], [1280, 720], [1024, 768],
      [1024, 1366], [834, 1194], [768, 1024], [430, 932], [412, 915], [390, 844], [375, 812], [360, 800], [320, 568],
      [932, 430], [844, 390], [812, 375], [800, 360], [568, 320], [900, 500], [700, 900], [500, 700],
    ] as const;
    for (const [width, height] of viewports) {
      for (const count of [1, 2, 3, 4, 5, 6, 7, 8, 12]) {
        const layout = computeLayout(width, height, count);
        expect(layout.cell, `${width}×${height}, ${count}`).toBeGreaterThan(18);
        expect(layout.trayColumns).toBeGreaterThanOrEqual(1);
        expect(layout.trayColumns).toBeLessThanOrEqual(3);
        expect(layout.trayHeight).toBeGreaterThanOrEqual(64);
        expect(layout.trayRowHeight).toBeGreaterThanOrEqual(59);
        expect(layout.bladeSize).toBeGreaterThanOrEqual(76);
      }
    }
  });

  it('uses strict edge intersection for layout collision checks', () => {
    expect(rectsOverlap({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(false);
    expect(rectsOverlap({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 9, top: 9, right: 20, bottom: 20 })).toBe(true);
  });
});
