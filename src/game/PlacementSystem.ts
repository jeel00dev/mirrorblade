import { BOARD_SIZE } from '../config/gameplay';
import { BoardState } from './BoardState';
import { buildOriginalCells, mirroredUnion } from './MirrorRules';
import type { GridCell, Piece } from './Piece';
import { pieceDimensions } from './Piece';

export interface PlacementPreview {
  readonly valid: boolean;
  readonly original: readonly GridCell[];
  readonly mirrored: readonly GridCell[];
  readonly union: readonly GridCell[];
}

export class PlacementSystem {
  public constructor(private readonly board: BoardState) {}

  public preview(piece: Piece, anchor: GridCell): PlacementPreview {
    const original = buildOriginalCells(piece, anchor);
    const union = mirroredUnion(original);
    const originalKeys = new Set(original.map(({ row, col }) => `${row}:${col}`));
    const mirrored = union.filter(({ row, col }) => !originalKeys.has(`${row}:${col}`));
    const valid = union.every(({ row, col }) => this.board.isInside(row, col) && this.board.isEmpty(row, col));
    return { valid, original, mirrored, union };
  }

  public commit(piece: Piece, anchor: GridCell): readonly GridCell[] {
    const preview = this.preview(piece, anchor);
    if (!preview.valid) throw new Error('Invalid mirrored placement');
    this.board.occupy(preview.union, { tone: piece.tone, pieceId: piece.id });
    return preview.union;
  }

  public legalAnchors(piece: Piece): GridCell[] {
    const dimensions = pieceDimensions(piece);
    const anchors: GridCell[] = [];
    for (let row = 0; row <= BOARD_SIZE - dimensions.rows; row += 1) {
      for (let col = 0; col <= BOARD_SIZE - dimensions.cols; col += 1) {
        if (this.preview(piece, { row, col }).valid) anchors.push({ row, col });
      }
    }
    return anchors;
  }

  public canPlace(piece: Piece): boolean {
    return this.legalAnchors(piece).length > 0;
  }
}
