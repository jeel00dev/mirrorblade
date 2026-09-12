# V3 change log

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

## 2026-09-12 02:30 IST — Shop scrolling on phones (V3-005)

Files: `src/styles/screens.css`, `src/core/Game.ts`, `e2e/gameplay.spec.ts`.

Reason: owner reported the Shop would not scroll on a phone. Root cause and fix in `BUGS.md` V3-005. Phones now scroll the whole catalog page with sticky category tabs; desktop keeps the fixed preview with a scrolling strip.

Validation: lint; 21 e2e incl. a real touch-swipe test; build.

## 2026-09-12 03:20 IST — Daily Mirror calendar (V3.1)

Files (new): `src/game/DailyCalendar.ts`, `tests/daily-calendar.test.ts`. Changed: `src/progression/{SaveData,SaveCodec}.ts` (`daily.scores`, `lastStreakDate`, `bestStreak`), `src/core/Game.ts` (per-date runs, completion/reward/streak, month/select/play actions, daily HUD chip), `src/ui/screens/{InfoScreens,HomeScreen,context}.ts`, `src/ui/GameplayView.ts`, `src/styles/{screens,gameplay}.css`, `scripts/*.mjs` (sample data), `README.md`.

Reason: owner asked for a chess.com-style daily puzzle calendar: full month view, each completed day marked, any past day playable, but past completions must not extend the continuous streak. Streak semantics changed from "played on consecutive days" to "completed on its own day on consecutive days"; existing `streak` values are kept and `bestStreak` seeds from them.

Validation: 81 unit (7 new: month lengths incl. 2000/2100 leap rules, weekday alignment, 4- and 6-week months, year-boundary navigation, streak credit/reset/no-double-count, codec); 22 e2e incl. the full past-day → today flow; build; captured at 1366×768 and 390×844.

## 2026-09-12 03:35 IST — Green completion tick on calendar days

Files: `src/styles/screens.css`. Owner request: completed days carry a green tick badge (success green, raised, pops in) on the gold day pill.

## 2026-09-12 03:55 IST — Streak flame on Home

Files: `src/ui/Icons.ts` (flame glyph), `src/ui/components.ts` (`streakTier`, `streakBadge`), `src/ui/screens/{HomeScreen,InfoScreens}.ts`, `src/styles/{components,screens}.css`.

Reason: owner request — show "X day streak" on the main screen with a flame whose colour escalates with the streak: grey (0), yellow (1–2), orange (3–6), red-orange (7–13), red (14–29), crimson with glow (30+); flicker from tier 2, off under reduced motion. Uses the icon family's flame, not an emoji. Same badge on the Daily streak card. Home records row now flexes to fit three pills on phones.

Validation: lint; 81 unit; navigation / calendar / shop e2e; build.

## 2026-09-12 04:10 IST — Streak badge moved onto the Daily Mirror button

Files: `src/ui/screens/HomeScreen.ts`, `src/styles/screens.css`. Owner feedback: a third pill in the records row broke the symmetry. The records row is back to Best score + Mirror Shards; the tiered flame now sits as an inset badge at the trailing edge of the Daily Mirror button, where it belongs contextually.

## 2026-09-12 04:30 IST — Streak badge carved into the Daily button; MIRRORBLADE flame glyph

Files: `src/ui/Icons.ts`, `src/ui/screens/HomeScreen.ts`, `src/styles/screens.css`.

Reason: owner feedback — the badge should move with the button on hover/press as if carved into it, and the flame should be unique to the game the way chess.com's carries a pawn. The badge is now a recessed pill inside the button (inset shadows, moves with the surface). The flame glyph carries a mirrored pair of blocks in its core with the axis line between them — the game's own mark in the fire. Tier colours unchanged.

## 2026-09-12 04:45 IST — Calendar day cells use the icon-button face

Files: `src/styles/screens.css`. Owner feedback: day cells now share the icon buttons' control face (lighter gradient, top highlight, rest/hover/pressed shadows, 12 px radius); future days are engraved on a darker face.

## 2026-09-12 12:40 IST — Katana game-over cinematic

Files: `src/render/GameOverCinematic.ts` (new), `src/config/cinematic.ts` (new), `src/styles/cinematic.css` (new), `src/core/GameState.ts` (`CINEMATIC` phase), `src/core/Game.ts` (`endRun` commits then plays; `onCinematicEvent`; skip on pointer/key/resize; navigation refused during the sequence), `src/render/BladeScene.ts` (`slash` pose, `setSlashPose`, ZYX roll), `src/render/BoardView.ts` (`occupiedBlocks`), `src/render/Ambience.ts` (`freeze`), `src/audio/AudioManager.ts` (six sounds, shaped whoosh, `setDucked`), `src/ui/GameplayView.ts` (`setCinematic`), `src/ui/screens/InfoScreens.ts` (staged results), `src/styles/states.css` (old crack line removed; `is-dead` is the reduced-motion end state), `scripts/qa-shot.mjs` (`--cinematic <ms>`), `scripts/capture-screens.mjs`, `e2e/cinematic.spec.ts`, `tests/cinematic.test.ts`, `docs/game-over-animation-research.md`.

Reason: owner brief — the run should end with a decisive katana strike: lock, anticipation, fast diagonal slash with a hit-stop, blocks that pop and fall with rotation and group cohesion, the mirror going dark, then a staged results card; new-best and fracture variants; skip; reduced motion; phones. Built as a system with an explicit event timeline rather than an animation on the results card; `Game.ts` only commits the run and answers events.

Validation: lint; 95 unit (14 new); 33 e2e (11 new: lock, order, alternation, skip rules, reduced motion, new best, fracture, double game over, empty/full boards, resize, three viewports); build 776 KB / 210 KB gz; frame-time and style-recalc measurements in headless Chromium (V3-006); captures at 1280×800, 390×844, 844×390 for tr-bl / tl-br / dense / fracture / reduced / new best.
