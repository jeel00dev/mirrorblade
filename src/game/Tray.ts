import type { CutResult } from './BladeCutter';
import { rotatePiece, type Piece } from './Piece';

export class Tray {
  private pieces: Piece[] = [];

  public list(): readonly Piece[] {
    return this.pieces;
  }

  public find(pieceId: string): Piece | null {
    return this.pieces.find((piece) => piece.id === pieceId) ?? null;
  }

  public replaceAll(pieces: readonly Piece[]): void {
    this.pieces = [...pieces];
  }

  public consume(pieceId: string): Piece | null {
    const index = this.pieces.findIndex((piece) => piece.id === pieceId);
    if (index < 0) return null;
    return this.pieces.splice(index, 1)[0] ?? null;
  }

  /** Rotates a tray piece in place (originals and cut fragments alike) and returns the new orientation. */
  public rotate(pieceId: string): Piece | null {
    const index = this.pieces.findIndex((piece) => piece.id === pieceId);
    if (index < 0) return null;
    const rotated = rotatePiece(this.pieces[index]!);
    this.pieces[index] = rotated;
    return rotated;
  }

  public replaceWithCut(pieceId: string, cut: CutResult): boolean {
    const index = this.pieces.findIndex((piece) => piece.id === pieceId);
    if (index < 0) return false;
    this.pieces.splice(index, 1, cut.a, cut.b);
    return true;
  }

  public isEmpty(): boolean {
    return this.pieces.length === 0;
  }
}
