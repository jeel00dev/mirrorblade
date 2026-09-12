# MIRRORBLADE V2 audit

Baseline: 11 September 2026. This document was written before V2 implementation.

## Evidence

Inspected all application modules, configurations, six unit-test files, two E2E files, packaging and README. Ran the application with Chromium and the SDK unavailable (local fallback), populated the board with all four materials, resized without reloading, captured and visually reviewed seven viewports in `docs/qa/v1/`. Baseline lint, 30 unit tests and production build pass. Build: 620 KB uncompressed, approximately 161 KB gzip. These checks establish correctness of existing covered behavior, not product readiness.

| Viewport | Grid width | Findings |
| --- | ---: | --- |
| 1920 × 1080 | 690 | Board capped too early; tiny tray surrounded by empty space |
| 1366 × 768 | 626 | Strong board size, weak right-side hierarchy |
| 1280 × 720 | 578 | Excess right-side vertical separation |
| 768 × 1024 | 580 | Tray disproportionately small; permanent micro-labels |
| 1024 × 768 | 604 | **Board clipped off left edge** despite no document overflow |
| 390 × 844 | 344 | Fits, but dim materials and sparse interactions |
| 844 × 390 | 344 | Gear overlaps board frame; very small tray cells; label clipped |

No page exceptions in these baseline captures. Existing automated tests do not detect the tablet clipping, material mismatch, or tiny pieces.

## What works / should be kept

- Pure TypeScript 9×9 board, `8-column` reflection and union-before-validation. Center cells count once. Atomic occupancy validation.
- Connected polyomino library; deterministic seeded RNG; simultaneous row/column clearing and deduplicated intersections.
- Grid-seam cutting, connected fragments, one cut generation, charge decrement on success, dynamic tray and complete-batch refill.
- Basic score/chain, local progression, cosmetic ownership, save recovery, safe SDK absence, Basic Launch ads disabled.
- Orthographic rendering, shared block materials, instanced recessed tiles, Pointer Events, reduced-motion setting, modest payload.

## What is broken

1. **Material compositing:** `.scene-canvas` is below `.game-layout`; the translucent `.board-shell` background therefore paints over WebGL blocks. `diagnostic-overlay-removed.png` demonstrates the cause with no material changes. Correct sRGB output is already set. Strong lighting and ACES additionally desaturate the exposed colors.
2. **Corner geometry:** RoundedBox radius is constrained by shallow Z thickness. A nominal large radius becomes nearly square. Rounded 2D outline extrusion must decouple planar corner radius and bevel depth.
3. **Tablet layout:** 1024×768 grid exceeds its allocated track, clipped by viewport. Scroll-width assertion alone misses this.
4. **Navigation transactions:** controls remain reachable while RESOLVING/CUTTING, but transitions to lobby are forbidden; animation timers can subsequently overwrite navigation state.
5. **Daily sequence:** board-fit retries and score-dependent weights consume RNG differently. Same seed does not guarantee the same piece sequence for different players. Calendar date is local rather than shared UTC.
6. **Play time:** wall-clock accounting includes pause/menu/hidden time.
7. **Input:** tap immediately starts drag; no rotation threshold; pointer-up can use stale pointer-move preview. Lost capture handling does not explicitly suspend future timed play.
8. **SDK boundary:** synchronous ad throws are not settled; initialization can wait indefinitely; enabled data module assumed. Optional features need defensive lifecycle handling.

## What looks unfinished / generic

Flat dark blade with no reflection environment; default leaf silhouette. Block tops lack rounded resin depth. Empty squares dominate. A tiny unconditional SYMMETRY CHAIN label and MIRROR AXIS annotation resemble debugging UI. Menu hierarchy is a stack of generic cards inside one overlay. Shop thumbnails do not demonstrate actual effects or sound themes. No standalone Home/Daily/Achievements/How to Play/Pause; Settings doubles as pause. No master volume, high contrast or screen-shake control. Collection cannot revert a category to its default.

## What should be redesigned

Entire presentation layer: material/geometry pipeline, HUD composition, screen shell, navigation, icon family, shop/collection preview, home hero, settings controls, results, motion and audio language. Keep the palette identities and deterministic grid mechanic. Add requested rotation, earned blades and emotional states as explicit rule systems, not renderer booleans.

## What should be refactored

- Extract run transactions and timed skill systems from the ~690-line Game coordinator.
- Separate navigation from active interaction phases; one authoritative time gate for menu, ads, visibility, context loss and interrupted pointers.
- Rotation-aware move analysis; fixed daily sequence separate from Endless adaptive fairness.
- Version-2 validated save schema preserving existing ownership/currency; old high scores retained separately because V2 scoring differs.
- Real bounded particle pool; stop redundant hidden rendering; reusable preview scene rather than additional permanent renderers.
- Semantic, focus-managed screens with one custom SVG family; common material tokens for tray and board.

## QA gaps to close

Existing 30 unit tests cover V1 fundamentals but no rotation/energy/timed modes. Existing seven E2E cases use mouse even at mobile dimensions, mostly empty boards and bounds-only assertions. Add real touch events, populated visual color assertions, all screen captures, lifecycle/ad/hidden-tab tests, repeated restarts, deterministic simulation and explicit negative-edge bounds checks. Software-rendered CI results must not be presented as real-device 60 FPS certification.
