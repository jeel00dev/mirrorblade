# V3 change log

## 2026-09-12 — Five-piece Japanese katana collection (`ui/shop`)

The five shop recolors now have distinct original katana construction: Shoshin, Kage, Shiosai, Raimei and Akatsuki, ordered 01–05. Each has a different guard, hamon, material composition and ornament, with physical crossing silk wraps and generated steel/samé/silk texture detail. Existing saved IDs and shard prices are preserved.

Home, catalog and gameplay carry the complete equipped design through the shared renderer. Home/catalog play individual signature flourishes followed by still holds; pause, replay, reduced motion and fittings close-up are supported. Browsing an unowned blade restores the equipped object on exit. The shop retains the obsidian UI, adds matching larger thumbnails and leaves unaffordable artwork fully visible. Catalog previews reset gameplay charge state (V3-005).

Research was written before implementation in `research-2026-09-12-katana-collection.md`, using museum and first-party game-development sources. `AGENTS.md` records the owner's docs-first, research-first, theme-consistency and branch-base preferences.

Main files: `src/config/{katanas,cosmetics}.ts`, `src/render/{KatanaModel,KatanaMotion,KatanaFlourish,BladeScene}.ts`, `src/ui/katanaArtwork.ts`, `src/ui/screens/{HomeScreen,ShopScreen}.ts`, `src/core/Game.ts`, `src/styles/katanas.css`, `src/main.ts`, `art/asset-manifest.json`. Tests: `tests/katanas.test.ts`, `e2e/katanas.spec.ts`; the old geometry-budget assertion now uses the researched 15k cap.

Validation: 85 unit tests and 25 Playwright tests pass. Each model is below 15,000 triangles (10,612–14,740), batched into no more than eight material meshes. Repeated design changes retain stable geometry/texture resource counts. Five blades × Home/Shop/gameplay × seven viewports plus five fittings close-ups are captured in `qa/katana-collection`; named desktop/phone loop videos and effect captures are included there. Full regression captures and final check results are recorded in `qa/katana-collection/README.md`. Real-device frame rate and player purchase preference remain unmeasured.

## 2026-09-11 18:30 IST — V3 research and plan

Files: `docs/v3-research.md`, `docs/katana-research.md`, `docs/third-party-assets.md`, `docs/reference/v3-*.png`, `docs/IMPLEMENTATION_STATUS.md` (V3 sections).

Reason: the owner's V3 brief — keep the V2 identity, add a real difficulty curve with a ceiling, rebuild combo presentation, replace the blade with a katana, fix the four-sided block bevel, add subtle ambience and stronger consistent depth. Research documented before implementation as required.

Validation: n/a (documentation).

## 2026-09-12 01:10 IST — V3 implementation

Files (new): `src/config/difficulty.ts`, `src/game/{DifficultyDirector,Contracts,PrecisionCells}.ts`, `src/render/{KatanaModel,Ambience}.ts`, `scripts/qa-shot.mjs`, `tests/difficulty.test.ts`, `docs/{v3-research,katana-research,third-party-assets,balance-report-v3}.md`, `docs/qa/v3/*`.
Files (changed): `src/config/{blade,gameplay,cosmetics}.ts`, `src/game/{BladeEnergy,PieceLibrary,PieceGenerator}.ts`, `src/core/Game.ts`, `src/render/{BladeScene,BoardView,EffectsLayer}.ts`, `src/ui/{GameplayView,Callouts,ScreenManager,Icons}.ts`, `src/ui/screens/{ShopScreen,InfoScreens}.ts`, `src/audio/AudioManager.ts`, `src/progression/{SaveData,SaveCodec,AchievementSystem}.ts`, `src/styles/*.css`, `scripts/{simulate-runs.ts,capture-screens.mjs}`, `e2e/gameplay.spec.ts`, `tests/energy.test.ts`, `package.json` (3.0.0).

Reason (by phase):
- Difficulty: a competent player could continue indefinitely. `DifficultyDirector` publishes a capped score curve; blade recharge cost rises per forge to 220; every piece carries a 1–5 rating and the director weights the draw (easy share 70 % → 20 %); Mirror Stress replaces the raw stall counter; Mirror Contracts and Precision Cells were selected from six researched candidates. Save v2 gains `highestStage`, `longestRunMoves`, `contractsCompleted`, `precisionHits`; four achievements added.
- Combo: layered feedback (anticipation prime, axis-reveal metal typography with reflection, energy streaks to the katana, score count-up, katana flash, ambience pulse, chain-depth audio).
- Blocks: four-sided bevel matching `reference/v3-3`.
- UI depth: one token family, +10–25 % rest depth, press contracts; nav items keep the reference's flat look with a faint lift.
- Katana: procedural model per `katana-research.md`; poses for dock (diagonal sway), showcase (shop) and upright (hero); slash on cut; travel + cut-line reveal Home→Play; crack line on game over.
- Ambience: Canvas 2D world layer behind every screen.
- Scrolling: themed scrollbar and scroll fade. Shop/Guide/Stats/Awards content upgrades.

Validation: lint (src, tests, e2e, scripts) 0 warnings; tsc strict; 73 unit tests; 20 Playwright tests (incl. difficulty stage / recharge tier, contract completion, precision payout, scroll fade, katana triangle budget); `npm run simulate` 150 runs × 6 policies; 112 captures at 7 viewports with 0 console errors; production build.

## 2026-09-12 01:40 IST — Home records get the shared raised treatment

Files: `src/ui/screens/HomeScreen.ts`, `src/styles/screens.css`.

Reason: owner feedback — "Best score" sat flat while "Mirror Shards" had a pill. The pill was an accidental class collision with the currency component (`.shards`); both records now use one `.record` pill with `--shadow-rest` / inner highlight, matching every other control.

Validation: lint; navigation and shop e2e; captured at 1366×768 and 390×844.

## 2026-09-12 01:50 IST — Home navigation gets the raised treatment

Files: `src/styles/components.css`, `src/styles/screens.css`.

Reason: owner feedback — nav items should carry the same surface and shadow as the other controls, not the faint lift chosen earlier. `.nav-item` now uses the shared gradient face, `--shadow-rest` / `--inner-highlight` / `--inner-edge`, hover lift and press contraction.

Validation: lint; navigation e2e; captured at 1366×768 and 390×844.

## 2026-09-12 02:05 IST — Fragments can be cut again (V3-004)

Files: `src/game/{Piece,BladeCutter}.ts`, `src/render/blocks.ts`, `src/core/Game.ts`, `src/ui/screens/InfoScreens.ts`, `README.md`, `tests/cutter.test.ts`.

Reason: owner hit a T fragment (from a Plus) that refused to cut with a red mid-line. The one-generation rule was a V1 leftover with no balance purpose now that every cut costs a blade; removed. Single blocks get a hint instead of a red line.

Validation: 74 unit; cut / rotate / tutorial / restart e2e.
