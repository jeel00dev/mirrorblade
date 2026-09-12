export const ECONOMY = {
  scorePerShard: 260,
  minimumRunShards: 8,
  maximumBaseRunShards: 120,
  newBestBonus: 12,
  dailyMilestoneReward: 30,
  achievementRewardDefault: 20,
  /** Small bonuses for run events so strong runs feel rewarded without inflating the economy. */
  perOverdrive: 4,
  perClutch: 6,
} as const;

export interface RunPayoutInput {
  score: number;
  isNewBest: boolean;
  overdrives: number;
  clutches: number;
}

export function calculateRunShards(input: RunPayoutInput): number {
  if (input.score <= 0) return 0;
  const base = Math.min(
    ECONOMY.maximumBaseRunShards,
    Math.max(ECONOMY.minimumRunShards, Math.floor(input.score / ECONOMY.scorePerShard) + 8),
  );
  const events = Math.min(30, input.overdrives * ECONOMY.perOverdrive + input.clutches * ECONOMY.perClutch);
  return base + events + (input.isNewBest ? ECONOMY.newBestBonus : 0);
}
