/** Refraction Overdrive — skill-earned 2× score state. */
export const OVERDRIVE = {
  /** Consecutive clearing moves (Symmetry Chain) that ignite Overdrive. */
  chainTrigger: 3,
  /** A Perfect Clear ignites it immediately. */
  perfectClearTriggers: true,
  durationMs: 10_000,
  finalWarningMs: 3_000,
  /** After it ends the chain must break and rebuild before it can re-arm. */
  rearmRequiresChainReset: true,
} as const;

/** Fracture State — pressure phase when the board is dense and the player has stalled. */
export const FRACTURE = {
  minPlacements: 8,
  occupancyThreshold: 0.66,
  stallMoves: 5,
  /** Never trigger when the player has more than this many legal (piece × orientation × anchor) options — they are not actually stuck. */
  maxLegalOptions: 30,
  warningMs: 3_000,
  placementWindowMs: 8_000,
  /** A cut also resets the placement window so the blade remains a rescue tool. */
  cutResetsWindow: true,
  /** Moves after an escape before Fracture can re-arm. */
  cooldownMoves: 6,
} as const;

/** Clutch — clearing a line with almost no time left. */
export const CLUTCH = {
  thresholdMs: 1_000,
} as const;

/** Ordinary placement pressure — score progression shortens the decision window, never below ten seconds. */
export const PLACEMENT_DEADLINE = {
  startMs: 30_000,
  minMs: 10_000,
  finalWarningMs: 5_000,
} as const;
