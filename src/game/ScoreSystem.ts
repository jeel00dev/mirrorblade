import { SCORING } from '../config/scoring';
import type { SkillEvent } from './SkillEvents';

export interface ScoreBreakdown {
  readonly placement: number;
  readonly lines: number;
  readonly multiLine: number;
  readonly chain: number;
  readonly perfectMirror: number;
  readonly perfectClear: number;
  readonly clutch: number;
  readonly multiplier: number;
  /** Total after the multiplier — what was actually added. */
  readonly total: number;
}

export class ScoreSystem {
  private score = 0;

  public addMove(uniquePlacedCells: number, event: SkillEvent, options: { multiplier?: number; clutch?: boolean } = {}): ScoreBreakdown {
    const multiplier = options.multiplier ?? 1;
    const placement = uniquePlacedCells * SCORING.perPlacedCell;
    const lines = event.lineCount * SCORING.perLine;
    const bonusIndex = Math.min(event.lineCount, SCORING.multiLineBonus.length - 1);
    const multiLine = SCORING.multiLineBonus[bonusIndex] ?? 0;
    const chain = event.lineCount > 0 && event.chain > 1 ? (event.chain - 1) * SCORING.chainStepBonus : 0;
    const perfectMirror = event.perfectMirror ? SCORING.perfectMirrorBonus : 0;
    const perfectClear = event.perfectClear ? SCORING.perfectClearBonus : 0;
    const clutch = options.clutch ? SCORING.clutchBonus : 0;
    const raw = placement + lines + multiLine + chain + perfectMirror + perfectClear + clutch;
    const total = raw * multiplier;
    this.score += total;
    return { placement, lines, multiLine, chain, perfectMirror, perfectClear, clutch, multiplier, total };
  }

  public current(): number {
    return this.score;
  }

  public reset(): void {
    this.score = 0;
  }
}
