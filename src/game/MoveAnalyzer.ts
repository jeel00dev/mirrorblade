import { BladeCutter } from './BladeCutter';
import { BoardState } from './BoardState';
import { distinctOrientations, type Piece } from './Piece';
import { PlacementSystem } from './PlacementSystem';

export interface MoveAnalysis {
  readonly canPlace: boolean;
  readonly canCut: boolean;
  readonly gameOver: boolean;
  /** Legal (piece × distinct orientation × anchor) placements — a measure of how cornered the player is. */
  readonly legalOptions: number;
}

export class MoveAnalyzer {
  private readonly placement: PlacementSystem;
  private readonly cutter = new BladeCutter();

  public constructor(board: BoardState) {
    this.placement = new PlacementSystem(board);
  }

  public analyze(pieces: readonly Piece[], bladeCharges: number): MoveAnalysis {
    let legalOptions = 0;
    for (const piece of pieces) {
      for (const cells of distinctOrientations(piece.cells)) {
        legalOptions += this.placement.legalAnchors({ ...piece, cells }).length;
      }
    }
    const canPlace = legalOptions > 0;
    const canCut = bladeCharges > 0 && pieces.some((piece) => this.cutter.validCuts(piece).length > 0);
    return { canPlace, canCut, gameOver: !canPlace && !canCut, legalOptions };
  }

  /** True when the piece fits somewhere in any orientation. */
  public fitsAnyOrientation(piece: Piece): boolean {
    return distinctOrientations(piece.cells).some((cells) => this.placement.canPlace({ ...piece, cells }));
  }
}
