export const SCORING = {
  perPlacedCell: 10,
  perLine: 100,
  /** Every distinct pair of lines completed by one placement earns this bonus. */
  simultaneousLinePairBonus: 100,
  chainStepBonus: 35,
  perfectMirrorBonus: 120,
  perfectClearBonus: 500,
  clutchBonus: 200,
  overdriveMultiplier: 2,
} as const;
