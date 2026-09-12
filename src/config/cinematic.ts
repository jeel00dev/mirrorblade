/**
 * Katana game-over cinematic — every timing and physical constant in one place (ms unless noted).
 * Research and the event timeline: docs/game-over-animation-research.md.
 */
export const CINEMATIC = {
  /** Freeze / anticipation before the katana appears. */
  anticipationMs: 140,
  /** Katana travel from outside the board to the entry corner. */
  enterMs: 190,
  /** Slash travel from the entry corner to the exit corner, excluding the hit-stop. */
  slashMs: 180,
  /** Katana freezes at the mirror axis for this long. */
  hitStopMs: 70,
  /** Katana travel from the exit corner to off-screen. */
  exitMs: 240,
  /** Cut line afterimage fade. */
  cutLineFadeMs: 400,
  /** Board recoil after the impact. */
  recoilMs: 180,
  /** Forward pop before a block detaches (mean; ±popVariance). */
  popMs: 240,
  popVariance: 0.1,
  /** Pop scale for ordinary blocks and for blocks within `nearCutCells` of the line. */
  popScale: 1.1,
  popScaleNear: 1.17,
  nearCutCells: 1.1,
  /** Block release stagger along the slash diagonal, plus per-block jitter. */
  staggerMs: 120,
  delayJitterMs: 30,
  /** Connected cells of one piece share motion for this long after they detach. */
  cohesionMs: 140,
  cohesionBlendMs: 120,
  /** Fall dynamics in cells per second (squared for gravity). */
  gravityCells: 38,
  driftCells: 0.4,
  kickCells: 0.6,
  /** Angular velocity in degrees per second. */
  spinMinDeg: 35,
  spinMaxDeg: 125,
  /** Blocks are released at most this many ms after the impact; the board is considered settled afterwards. */
  fallMs: 770,
  /** Settle → results overlay, results → layer cleanup. */
  settleToResultsMs: 200,
  resultsTailMs: 400,
  /** Katana size relative to the board diagonal (desktop / phone). */
  katanaScale: 0.7,
  katanaScalePhone: 0.56,
  phoneMaxWidth: 640,
  /** Reduced-motion variant timings. */
  reduced: { flashMs: 120, fadeMs: 320, settleMs: 620, resultsMs: 720, endMs: 900 },
} as const;
