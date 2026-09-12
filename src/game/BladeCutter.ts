import { cellsAreConnected, createPiece, normalizeCells, pieceDimensions, type GridCell, type Piece } from './Piece';

export type CutOrientation = 'horizontal' | 'vertical';

export interface CutSpec {
  readonly orientation: CutOrientation;
  readonly seam: number;
}

export interface CutResult {
  readonly a: Piece;
  readonly b: Piece;
  readonly spec: CutSpec;
}

/** Splits pieces along grid seams. Any piece with two or more cells can be cut — fragments included — as long as both halves stay connected. */
export class BladeCutter {
  public validCuts(piece: Piece): CutSpec[] {
    if (piece.cells.length < 2) return [];
    const { rows, cols } = pieceDimensions(piece);
    const candidates: CutSpec[] = [];
    for (let seam = 1; seam < cols; seam += 1) candidates.push({ orientation: 'vertical', seam });
    for (let seam = 1; seam < rows; seam += 1) candidates.push({ orientation: 'horizontal', seam });
    return candidates.filter((spec) => this.partition(piece.cells, spec) !== null);
  }

  public cut(piece: Piece, spec: CutSpec): CutResult | null {
    const partition = this.partition(piece.cells, spec);
    if (!partition) return null;
    const generation = piece.cutGeneration + 1;
    return {
      a: createPiece(`${piece.definitionId}-a`, partition[0], piece.tone, piece.sourceSetId, generation, piece.id),
      b: createPiece(`${piece.definitionId}-b`, partition[1], piece.tone, piece.sourceSetId, generation, piece.id),
      spec,
    };
  }

  private partition(cells: readonly GridCell[], spec: CutSpec): [GridCell[], GridCell[]] | null {
    const first = cells.filter((cell) => spec.orientation === 'vertical' ? cell.col < spec.seam : cell.row < spec.seam);
    const second = cells.filter((cell) => spec.orientation === 'vertical' ? cell.col >= spec.seam : cell.row >= spec.seam);
    if (first.length === 0 || second.length === 0) return null;
    if (!cellsAreConnected(first) || !cellsAreConnected(second)) return null;
    return [normalizeCells(first), normalizeCells(second)];
  }
}
