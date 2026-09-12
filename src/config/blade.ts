/**
 * Blade Energy: skilful clears fill a meter; a full meter forges one extra blade.
 * V3: the energy required per forge rises with every blade earned in the run and caps, so late blades are
 * harder to earn but never impossible. Gains are starting points checked by scripts/simulate-runs.ts.
 */
export const BLADE_ENERGY = {
  /** Kept for callers that only need "a full meter"; the real requirement is rechargeCost(). */
  full: 100,
  maxBlades: 5,
  /** Energy is held at the current cost while the blade rack is full; it is redeemed the moment a blade is spent. */
  bankWhileFull: true,
  recharge: {
    base: 100,
    /** Linear growth per blade forged this run. */
    step: 15,
    /** Quadratic growth per blade forged this run (n·(n−1)/2 · curve). */
    curve: 5,
    max: 220,
  },
  gains: {
    single: 6,
    double: 14,
    triple: 26,
    max: 40,
    perfectMirror: 14,
    perfectClear: 40,
    clutch: 24,
    /** Per chain link after the first, capped at chainCap. */
    chainPerLink: 2,
    chainCap: 10,
  },
} as const;
