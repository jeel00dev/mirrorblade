/**
 * Difficulty Director configuration. The curve is published and fixed: difficulty is a function of score
 * (plus a bounded Mirror Stress modulation) and never of the player's specific holes or intended move.
 */
export const DIFFICULTY = {
  /** Score → level anchors; level is linearly interpolated between them and capped at the last entry. */
  curve: [
    { score: 0, level: 0 },
    { score: 2_500, level: 0.25 },
    { score: 7_500, level: 0.5 },
    { score: 15_000, level: 0.75 },
    { score: 30_000, level: 1 },
  ],
  /** Mirror Stress can push the effective level up by at most this much. */
  stressInfluence: 0.1,
  /** Score milestones celebrated during a run ("Mirror Level II…"). */
  milestones: [2_500, 7_500, 15_000, 30_000, 50_000],
  stress: {
    /** Non-clearing moves that are free before stress starts building. */
    graceMoves: 2,
    perStallMove: 0.16,
    relief: { single: 0.35, double: 0.6, tripleOrMore: 1 },
    /** Presentation thresholds. */
    warning: 0.4,
    high: 0.65,
  },
  /**
   * Piece weight multipliers by rating (rows) at level anchors 0 / 0.25 / 0.5 / 0.75 / 1 (columns).
   * Easy pieces never reach zero late so relief still arrives.
   */
  pieceWeights: {
    1: [1, 0.85, 0.6, 0.35, 0.2],
    2: [1, 1, 0.85, 0.55, 0.35],
    3: [0.55, 0.8, 1, 1, 0.9],
    4: [0.15, 0.4, 0.75, 1, 1],
    5: [0, 0.12, 0.35, 0.7, 1],
  } as Record<1 | 2 | 3 | 4 | 5, readonly number[]>,
} as const;

/** Optional Mirror Contracts. */
export const CONTRACTS = {
  minLevel: 0.25,
  /** Moves between offers (± jitter). */
  interval: 14,
  jitter: 4,
  /** Moves the offer stays available if the player never engages (the window itself is the contract length). */
  reward: { scoreBase: 150, scorePerStage: 150, energyBase: 20, energyPerStage: 5, shards: 3 },
} as const;

/** Optional Precision Cells. */
export const PRECISION = {
  minLevel: 0.4,
  interval: 10,
  jitter: 3,
  lifetimeMoves: 6,
  /** Only mark cells in lines that are at least this full, so the target is plausible. */
  minLineFill: 5,
  reward: { score: 150, energy: 12 },
} as const;
