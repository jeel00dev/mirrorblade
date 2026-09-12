import { DIFFICULTY } from '../config/difficulty';

export interface DirectorInput {
  score: number;
  lineCount: number;
  occupancy: number;
  legalOptions: number;
}

export interface DirectorState {
  /** Base level from the score curve, 0–1. */
  base: number;
  /** Effective level including Mirror Stress, capped at 1. */
  level: number;
  /** 1–5 for presentation ("Mirror I–V"). */
  stage: 1 | 2 | 3 | 4 | 5;
  /** Mirror Stress 0–1: builds on non-clearing moves, relieved by clears. */
  stress: number;
  /** Milestone index newly crossed by this move, or null. */
  milestone: number | null;
}

/**
 * Observes the run and publishes one difficulty level. It has a ceiling (1.0 at the top of the curve) and it
 * never reacts to the player's intended move — only to score, clears and board density.
 */
export class DifficultyDirector {
  private stress = 0;
  private stallMoves = 0;
  private reachedMilestones = new Set<number>();
  private last: DirectorState = { base: 0, level: 0, stage: 1, stress: 0, milestone: null };

  public static levelForScore(score: number): number {
    const curve = DIFFICULTY.curve;
    if (score <= curve[0]!.score) return curve[0]!.level;
    for (let index = 1; index < curve.length; index += 1) {
      const from = curve[index - 1]!;
      const to = curve[index]!;
      if (score <= to.score) {
        const t = (score - from.score) / (to.score - from.score);
        return from.level + (to.level - from.level) * t;
      }
    }
    return curve[curve.length - 1]!.level;
  }

  public static stageFor(level: number): 1 | 2 | 3 | 4 | 5 {
    return Math.max(1, Math.min(5, 1 + Math.floor(level * 4 + 1e-9))) as 1 | 2 | 3 | 4 | 5;
  }

  /** Weight multiplier for a piece rating at a level, interpolated from the config table. */
  public static pieceWeightMultiplier(rating: 1 | 2 | 3 | 4 | 5, level: number): number {
    const row = DIFFICULTY.pieceWeights[rating];
    const position = Math.max(0, Math.min(1, level)) * (row.length - 1);
    const index = Math.floor(position);
    const next = Math.min(row.length - 1, index + 1);
    const t = position - index;
    return row[index]! + (row[next]! - row[index]!) * t;
  }

  public observe(input: DirectorInput): DirectorState {
    const stress = DIFFICULTY.stress;
    if (input.lineCount > 0) {
      const relief = input.lineCount === 1 ? stress.relief.single : input.lineCount === 2 ? stress.relief.double : stress.relief.tripleOrMore;
      this.stress = Math.max(0, this.stress - relief);
      this.stallMoves = 0;
    } else {
      this.stallMoves += 1;
      if (this.stallMoves > stress.graceMoves) this.stress = Math.min(1, this.stress + stress.perStallMove);
    }
    const base = DifficultyDirector.levelForScore(input.score);
    const level = Math.min(1, base + this.stress * DIFFICULTY.stressInfluence);
    // If one move crosses several milestones, celebrate the highest.
    let milestone: number | null = null;
    DIFFICULTY.milestones.forEach((threshold, index) => {
      if (input.score >= threshold && !this.reachedMilestones.has(index)) {
        this.reachedMilestones.add(index);
        milestone = index;
      }
    });
    this.last = { base, level, stage: DifficultyDirector.stageFor(base), stress: this.stress, milestone };
    return this.last;
  }

  public state(): DirectorState {
    return this.last;
  }

  public currentStress(): number {
    return this.stress;
  }

  public stall(): number {
    return this.stallMoves;
  }

  public reset(): void {
    this.stress = 0;
    this.stallMoves = 0;
    this.reachedMilestones.clear();
    this.last = { base: 0, level: 0, stage: 1, stress: 0, milestone: null };
  }
}
