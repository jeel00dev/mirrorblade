# V2 change log

## 2026-09-11 16:05 IST — Audit, baseline and research

Files: `docs/v2-audit.md`, `research-v2.md`, `design-system.md`, `IMPLEMENTATION_STATUS.md`, `BUGS.md`, `qa/v1/*`.

Reason: establish material root cause, product gaps, responsive failures and evidence-based design before changing code. Sampled original reference palette; researched primary Tetris/King/Apple/CrazyGames sources.

Validation: baseline lint, strict TypeScript and build pass; 30 unit tests pass. Seven populated viewport captures reviewed manually. Found tablet clipping and dark HTML-over-WebGL compositing. Runtime diagnostic removing only overlay restores color, confirming cause. No source gameplay/UI changes yet.

## 2026-09-11 16:10 IST — Handoff to Claude; rules layer for V2 systems

Files: `docs/README.md`, `docs/HANDOFF.md`, `docs/reference/*`, `src/config/{gameplay,scoring,blade,modes,motion,economy,cosmetics}.ts`, `src/game/{Piece,PieceLibrary,Tray,MoveAnalyzer,PieceGenerator,DailyMode,SkillEvents,BladeEnergy,RunClock,Overdrive,Fracture,ScoreSystem}.ts`, `src/progression/{SaveData,SaveCodec,AchievementSystem,Inventory}.ts`, `src/platform/StorageAdapter.ts`, `tests/{rotation,energy,modes,persistence,generator,scoring}.test.ts`.

Reason: every new gameplay system in the brief (rotation, Blade Energy, strong-move classification, Refraction Overdrive, Fracture, Clutch, single run clock, save v2 migration, UTC daily with board-independent sequence) is implemented as pure, configurable TypeScript before any presentation work so it can be verified deterministically. Piece library consolidated to shape families now that rotation exists, and three awkward pentominoes added so the blade stays relevant.

Validation: `vitest run` — 9 files, 60 tests passing. Type errors remain only in `Game.ts` / `SceneManager.ts`, which are replaced by the V2 presentation layer.

## 2026-09-11 16:55 IST — V2 presentation layer, screens, coordinator, e2e

Files: `src/styles/{tokens,base,blocks,board,components,gameplay,screens,states}.css`, `src/render/{blocks,BoardView,TrayView,DragVisual,BladeScene,EffectsLayer,Layout}.ts`, `src/ui/{Icons,components,ScreenManager,Toasts,Callouts,GameplayView}.ts`, `src/ui/screens/*`, `src/core/{Game,GameState}.ts`, `src/input/PointerController.ts`, `src/audio/AudioManager.ts`, `src/platform/CrazyGamesAdapter.ts`, `src/main.ts`, `e2e/*`, `art/asset-manifest.json`. Removed: `SceneManager.ts`, `UIController.ts`, `PieceView.ts`, `BladeSystem.ts`, V1 CSS.

Reason: V1 rendered board blocks in WebGL under a translucent HTML panel and tray blocks in CSS, so colours could never match (BUG V2-001). V2 draws every block with one CSS component; Three.js is kept only for the faceted blade (gameplay dock, Home hero, Shop preview) with a PMREM studio environment. Layout is computed in JS from width AND height (fixes V2-002 tablet clipping). Navigation is separated from the run phase with deferred transitions (fixes V2-003). A single gated run clock drives Overdrive/Fracture/play time (fixes V2-005). Tap-to-rotate with a 7px drag threshold and refused-start retry (fixes V2-007). SDK init/ad timeouts (fixes V2-008). All 13 screens rebuilt in the OBSIDIAN MIRROR 2.0 system.

Validation: lint 0 warnings; tsc strict; 60 unit tests; 15 Playwright tests including CDP touch drag, tutorial flow, energy forge, Overdrive 2×, Fracture warn/active/reset/escape/timeout, hidden-tab and pause freezes, settings/shop persistence, deferred navigation, 16-viewport bounds/overlap/overflow and tray-vs-board colour parity. Screenshots reviewed at 1920×1080, 1366×768, 1280×720, 1024×768, 768×1024, 430×932, 390×844, 844×390. Production build 688 KB (163 KB gzip).

## 2026-09-11 17:40 IST — Balancing, QA captures, short-landscape layouts, docs

Files: `scripts/simulate-runs.ts`, `scripts/capture-screens.mjs`, `src/config/{blade,modes,gameplay}.ts`, `src/game/PieceGenerator.ts` (tier-4+ weighting), `src/styles/screens.css` (short-landscape layer), `src/ui/GameplayView.ts` (persistent status chips), `docs/balance-report.md`, `docs/qa/v2/*`, `README.md`, `docs/design-system.md` (as-built), `package.json` (scripts, v2.0.0), `eslint.config.js`.

Reason: the brief requires playtest-driven tuning and inspected screenshots before responsive work counts as done. Simulation showed a strong player hoarding blades half the time and Fracture arming every ~30 moves; energy gains were cut ~20 % and Fracture thresholds raised. Rotation proved to be a 3–5× lever, so the late game now weights awkward pentominoes up. Status chips were being re-created every 100 ms, which restarted their fade-in and left the Fracture countdown invisible — they now update in place. Short-landscape menus (Home, Shop, Pause, Game over) overflowed 844×390 and got a dedicated layout layer.

Validation: lint (src, tests, e2e, scripts) 0 warnings; 60 unit; 15 e2e green after retune; 98 captures reviewed; production build passes.
