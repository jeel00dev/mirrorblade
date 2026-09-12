/** Motion durations (ms). Everything animated picks one of these four; see design-system.md §Motion. */
export const MOTION = {
  fast: 140,
  standard: 220,
  reward: 480,
  major: 800,
  /** Board transaction lock while a clear animation resolves. */
  clearResolveMs: 360,
  placeResolveMs: 150,
  cutResolveMs: 260,
  reducedMotionMs: 60,
} as const;
