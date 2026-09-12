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

function wholeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function scoreMultiplier(value: number | undefined): number {
  return value === undefined ? 1 : Math.max(1, wholeNonNegative(value));
}

export function placementScore(uniquePlacedCells: number): number {
  return wholeNonNegative(uniquePlacedCells) * SCORING.perPlacedCell;
}

export function lineScore(lineCount: number): { lines: number; simultaneous: number; total: number } {
  const count = wholeNonNegative(lineCount);
  const lines = count * SCORING.perLine;
  const simultaneous = (count * (count - 1) / 2) * SCORING.simultaneousLinePairBonus;
  return { lines, simultaneous, total: lines + simultaneous };
}

export class ScoreSystem {
  private score = 0;

  public addMove(uniquePlacedCells: number, event: SkillEvent, options: { multiplier?: number; clutch?: boolean } = {}): ScoreBreakdown {
    const multiplier = scoreMultiplier(options.multiplier);
    const placement = placementScore(uniquePlacedCells);
    const clear = lineScore(event.lineCount);
    const lines = clear.lines;
    const multiLine = clear.simultaneous;
    const chainDepth = wholeNonNegative(event.chain);
    const chain = event.lineCount > 0 && chainDepth > 1 ? (chainDepth - 1) * SCORING.chainStepBonus : 0;
    const perfectMirror = event.perfectMirror ? SCORING.perfectMirrorBonus : 0;
    const perfectClear = event.perfectClear ? SCORING.perfectClearBonus : 0;
    const clutch = options.clutch ? SCORING.clutchBonus : 0;
    const raw = placement + lines + multiLine + chain + perfectMirror + perfectClear + clutch;
    const total = raw * multiplier;
    this.score += total;
    return { placement, lines, multiLine, chain, perfectMirror, perfectClear, clutch, multiplier, total };
  }

  /** Adds a named fixed reward (for example a contract) through the same multiplier boundary as move score. */
  public addBonus(amount: number, multiplier = 1): number {
    const total = wholeNonNegative(amount) * scoreMultiplier(multiplier);
    this.score += total;
    return total;
  }

  /** Test/debug setup without reaching into the private score field. */
  public set(value: number): void {
    this.score = wholeNonNegative(value);
  }

  public current(): number {
    return this.score;
  }

  public reset(): void {
    this.score = 0;
  }
}
