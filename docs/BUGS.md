# MIRRORBLADE V2 bug tracker

## V3-005 — Catalog blade can inherit a depleted gameplay appearance

Severity: medium (presentation). Status: FIXED 2026-09-12. Identified during inspection of the old shared scene: catalog preview changed the skin and mount but retained the gameplay charge/hover/Fracture state, so opening a blade preview from a depleted run could dull the shop object. Catalog now initializes a neutral display state, and Home/catalog material response is independent of gameplay charges. Preview disposal restores the complete equipped design. Covered by catalog/equipment tests and the collection capture pass; gameplay charge rules are unchanged.

## V2-001 — Board surface darkens rendered pieces

Severity: high. Status: FIXED 2026-09-11 (Claude). Root fix: board and tray share one CSS block component (`src/render/blocks.ts`); the WebGL board scene was removed. Test: `e2e/responsive.spec.ts` asserts identical computed block backgrounds; sampled face colours within ±4 RGB of the reference. Reproduction: place any colored shape; compare to tray. Expected: same recognizable resin color. Actual: HTML board background overlays WebGL canvas. Fix: pending stacking/material redesign. Test: `qa/v1/diagnostic-overlay-removed.png` isolates cause; V2 populated-color regression required.

## V2-002 — Tablet board clips offscreen

Severity: high. Status: FIXED 2026-09-11. `src/render/Layout.ts` computes cell size from width and height together. Test: `e2e/responsive.spec.ts` bounds at 16 viewports incl. 1024×768. Reproduction: 1024×768. Expected: entire 9×9 frame visible. Actual: left board edge outside viewport, document overflow check still passes. Fix: pending two-dimensional layout. Test: explicit bounds and screenshots.

## V2-003 — Menu transitions race move animation

Severity: high. Status: FIXED 2026-09-11. Run phase (`RunPhaseMachine`) is independent of navigation; `Game.navigate` defers while RESOLVING/CUTTING. Test: e2e 'navigation requested during a resolving placement is deferred'. Reproduction: Home/Settings immediately after dropping. Expected: transaction finishes and menu pauses. Actual: forbidden state transition possible; untracked completion timer. Fix: pending independent screen/interaction state and cancellation-safe presentation. Test: fast navigation E2E.

## V2-004 — Daily sequence depends on player decisions

Severity: medium. Status: FIXED 2026-09-11. Daily generator ramps by batch index, no board-fit substitution, UTC date key, seed suffix v2. Test: `tests/generator.test.ts` divergent boards/scores produce identical sequences. Reproduction: generate with same seed and divergent board/score. Expected: same daily sequence for everyone. Actual: occupancy retry/score weights diverge; local time changes daily seed. Fix: pending fixed UTC daily generator. Test: divergent boards/scores deterministic sequence.

## V2-005 — Lifetime play time counts pauses

Severity: medium. Status: FIXED 2026-09-11. Play time reads the gated `RunClock`. Test: `tests/modes.test.ts` clock gating; e2e hidden/pause freeze. Reproduction: leave menu open then end/flush run. Expected: active play only. Actual: wall elapsed time recorded. Fix: pending gated active clock. Test: clock pause tests.

## V2-006 — Blade lacks metallic appearance

Severity: visual medium. Status: FIXED 2026-09-11. Faceted rhombic-section blade + PMREM RoomEnvironment (`BladeScene.ts`). Verified on software GL only; real-GPU reflections still to be eyeballed on a device. Reproduction: inspect blade. Expected: broad chrome reflection bands and machined edge. Actual: dark flat leaf; metal has no environment. Fix: pending procedural studio reflection and geometry. Test: home/shop/gameplay visual review.

## V2-007 — Tap, cancellation and final pointer coordinates

Severity: medium. Status: FIXED 2026-09-11. 7px threshold separates tap-to-rotate from drag; end uses the final pointer; refused starts retry; lost capture pauses the clock. Test: e2e tap/rotate, touch drag, resize during capture. Reproduction: tap tray or release without final move; interrupt capture. Expected: tap rotates, latest release revalidates, disrupted timed input pauses. Actual: immediate drag, stale preview possible. Fix: pending threshold gesture controller. Test: pointer and real touch cases.

## V2-008 — Optional SDK can stall or leave ad state unsettled

Severity: medium. Status: FIXED 2026-09-11. 4 s init timeout, synchronous throws and 90 s ad timeout settle the promise and restore audio/clock. Unit test pending (adapter is DOM-free enough to test with a fake SDK). Reproduction: SDK init never resolves / requestAd throws synchronously. Expected: playable fallback / audio and game restored. Actual: boundary lacks deadline/throw settlement. Fix: pending adapter hardening. Test: mocked SDK lifecycle tests.

## V2-009 — `--cell` default on `.board` / `.piece` shadowed the computed layout

Severity: high (found during V2 build). Status: FIXED 2026-09-11. Reproduction: any viewport; board rendered at 40px cells regardless of layout. Expected: cell from `Layout.ts`. Actual: element-level custom property default won over the inherited value. Fix: defaults moved to `:root`. Test: responsive e2e board-size minimums.

## V2-010 — HUD status chips inflated the header and overlapped the tray

Severity: high. Status: FIXED 2026-09-11. Reproduction: 1280×720 landscape. Expected: status row between HUD and tray. Actual: `#hud-status` was a child of the header, so its grid-area resolved inside the header (118px tall) and the tray overlapped the blade. Fix: status is a sibling grid item; tray stretches in landscape; rail height budget includes 28px slack. Test: responsive e2e no-overlap assertion.

## V2-011 — Fast grab during the resolve window was refused and dropped

Severity: medium. Status: FIXED 2026-09-11. Reproduction: drop a piece, immediately grab the next one within 150 ms. Expected: the grab proceeds once the board settles. Actual: `PointerController` released the press. Fix: refused starts keep the press alive and retry on the next pointer move. Test: Fracture e2e places two pieces back to back.

## V3-001 — Hint bar overflowed narrow phones

Severity: medium. Status: FIXED 2026-09-12. Reproduction: 390×844, first Overdrive. Expected: hint fits the screen. Actual: `white-space: nowrap` pushed the Overdrive explanation past both edges. Fix: hint bar wraps, max-width 92vw, shorter copy. Test: `qa/v3/gameplay-overdrive-390x844.png` after fix.

## V3-002 — Katana unreadable as a vertical line in the dock and shop stage

Severity: medium (design). Status: FIXED 2026-09-12. Reproduction: first katana build, gameplay dock / shop preview. Expected: recognisable sword. Actual: a 4 px vertical hairline. Fix: `BladeScene` poses — diagonal tilt with limited yaw sway in the dock, steeper showcase tilt in the shop, upright only on the Home hero; camera fit accounts for the tilted bounding box. Test: `qa/v3/katana-comparison.png`, `qa/v3/shop-blades-*.png`.

## V3-003 — Simulation `pgrep` self-match

Severity: low (tooling). Status: NOTED 2026-09-12. `pgrep -f "simulate-runs"` matches the waiting shell itself; use `pgrep -f "^node .*vite-node"` or check for the report file instead.

## V3-004 — T-shaped fragment could not be cut; red mid-line implied a bad seam

Severity: high (owner-reported). Status: FIXED 2026-09-12. Reproduction: cut a Plus horizontally, drag the resulting T fragment over the katana. Expected: the T splits (it has three valid seams in every rotation). Actual: V1's "one cut generation" rule returned no seams for any fragment, and the fallback guide drew a red line through the middle, which read as "this seam is invalid". Fix: `BladeCutter` now cuts any piece with ≥ 2 cells whose halves stay connected; `cutGeneration` counts cuts instead of capping at 1; the only uncuttable piece is a single block, which now gets an explicit hint. Guide and README copy updated. Test: `tests/cutter.test.ts` (re-cut generation, Plus→T fragment in all rotations); cut / rotate / tutorial / restart e2e.
