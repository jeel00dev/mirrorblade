export const ECONOMY = {
  dailyMilestoneReward: 30,
  achievementRewardDefault: 20,
} as const;

export interface ClearShardReward {
  /** Completed rows plus completed columns. */
  lines: number;
  /** Single 1×, Double 2×, Triple 3×, and the actual line count for Max. */
  multiplier: number;
  total: number;
}

/** Normal-play currency is the completed line count multiplied by its clear tier: 1, 4, 9, 16… */
export function clearShardReward(lineCount: number): ClearShardReward {
  const lines = Number.isFinite(lineCount) ? Math.max(0, Math.floor(lineCount)) : 0;
  return { lines, multiplier: lines, total: lines * lines };
}
