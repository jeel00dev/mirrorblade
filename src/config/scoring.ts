export const SCORING = {
  perPlacedCell: 10,
  perLine: 100,
  /** Indexed by number of lines cleared in one move. */
  multiLineBonus: [0, 0, 60, 150, 280, 450, 650],
  chainStepBonus: 35,
  perfectMirrorBonus: 120,
  perfectClearBonus: 500,
  clutchBonus: 200,
  overdriveMultiplier: 2,
} as const;
