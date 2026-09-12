import { BOARD_SIZE, DAILY_DIFFICULTY, TRAY_BATCH_SIZE } from '../config/gameplay';
import { BoardState } from './BoardState';
import { DifficultyDirector } from './DifficultyDirector';
import { MoveAnalyzer } from './MoveAnalyzer';
import { PIECE_LIBRARY, type PieceDefinition } from './PieceLibrary';
import { createPiece, type BlockTone, type Piece } from './Piece';
import { SeededRandom } from './SeededRandom';

const TONES: readonly BlockTone[] = ['cyan', 'coral', 'amber', 'violet'];

export interface GeneratorOptions {
  /** Endless adapts to the board (fairness substitution) and follows the director; Daily is a fixed shared sequence. */
  readonly mode: 'endless' | 'daily';
}

export class PieceGenerator {
  private setId = 0;
  private batchIndex = 0;

  public constructor(private readonly random: SeededRandom, private readonly options: GeneratorOptions = { mode: 'endless' }) {}

  /** `level` is the Difficulty Director's level (0–1). Daily ignores it and ramps by batch index. */
  public nextBatch(board: BoardState, level: number): Piece[] {
    this.setId += 1;
    this.batchIndex += 1;
    const effectiveLevel = this.options.mode === 'daily'
      ? Math.min(1, ((this.batchIndex - 1) / DAILY_DIFFICULTY.batchesPerTier) / DAILY_DIFFICULTY.maxTier)
      : Math.max(0, Math.min(1, level));
    const pieces = Array.from({ length: TRAY_BATCH_SIZE }, () => this.createWeighted(effectiveLevel));
    if (this.options.mode === 'daily') return pieces;

    // Endless fairness: if some library shape fits (in any orientation) but none of the batch does, swap one in.
    // This is the only board-aware step and it can only ever make the tray easier.
    const analyzer = new MoveAnalyzer(board);
    if (pieces.some((piece) => analyzer.fitsAnyOrientation(piece))) return pieces;
    const fitting = PIECE_LIBRARY.filter((definition) =>
      analyzer.fitsAnyOrientation(createPiece(definition.id, definition.cells, 'cyan', this.setId)),
    );
    if (fitting.length > 0) pieces[this.random.integer(pieces.length)] = this.fromDefinition(this.random.pick(fitting));
    return pieces;
  }

  private createWeighted(level: number): Piece {
    const weights = PIECE_LIBRARY.map((definition) => definition.weight * DifficultyDirector.pieceWeightMultiplier(definition.rating, level));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = this.random.next() * total;
    for (let index = 0; index < PIECE_LIBRARY.length; index += 1) {
      roll -= weights[index]!;
      if (roll <= 0) return this.fromDefinition(PIECE_LIBRARY[index]!);
    }
    return this.fromDefinition(PIECE_LIBRARY[PIECE_LIBRARY.length - 1]!);
  }

  private fromDefinition(definition: PieceDefinition): Piece {
    return createPiece(definition.id, definition.cells, this.random.pick(TONES), this.setId);
  }
}

/** Share of the weighted distribution taken by pieces rated ≤ 2 at a level — used by tests and the balance report. */
export function easyShareAt(level: number): number {
  const weights = PIECE_LIBRARY.map((definition) => definition.weight * DifficultyDirector.pieceWeightMultiplier(definition.rating, level));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const easy = PIECE_LIBRARY.reduce((sum, definition, index) => sum + (definition.rating <= 2 ? weights[index]! : 0), 0);
  return total > 0 ? easy / total : 0;
}

export function averageRatingAt(level: number): number {
  const weights = PIECE_LIBRARY.map((definition) => definition.weight * DifficultyDirector.pieceWeightMultiplier(definition.rating, level));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return PIECE_LIBRARY.reduce((sum, definition, index) => sum + definition.rating * weights[index]!, 0) / total;
}

export function occupancyRatio(board: BoardState): number {
  return board.occupiedCount() / (BOARD_SIZE * BOARD_SIZE);
}
