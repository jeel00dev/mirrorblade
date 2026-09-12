# MIRRORBLADE

MIRRORBLADE is a precision mirror block puzzle for the web, built with TypeScript, Vite, HTML/CSS, Canvas, Web Audio and a small Three.js scene. Every placement is reflected across the glass column at the centre of a 9×9 board. Pieces rotate freely; a limited rack of blades splits pieces at a grid seam; strong clears refill Blade Energy, ignite Refraction Overdrive (2× score) and rescue the player from Fracture, the timed pressure state.

V2 (September 2026) rebuilt the entire presentation layer around the OBSIDIAN MIRROR 2.0 design system and added rotation, Blade Energy, Overdrive, Fracture and Clutch. V3 added a real difficulty curve with a ceiling (Difficulty Director, rising blade recharge cost, rated piece distribution, Mirror Stress, Mirror Contracts, Precision Cells, run milestones), layered combo presentation, a procedural katana, four-sided block bevels, ambient background motion, themed scrolling and richer Shop / Guide / Stats / Awards screens. The working notes — audit, research, design system, feedback matrix, implementation ledger, change logs, bug tracker, balance reports and QA captures — live in [`docs/`](docs/README.md).

## Install and run

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
```

Useful commands:

```bash
npm run check        # lint + unit tests + production build
npm run test         # Vitest rules suite
npm run test:e2e     # Playwright (mouse, touch, timers, navigation, 16 viewports); needs `npx playwright install chromium` once
npm run build        # strict TypeScript + optimized Vite build → dist/
npm run simulate     # balance simulation → docs/balance-report-v3.md
npm run capture      # screenshots of every screen and state at 7 viewports → docs/qa/v3 (dev server must be running)
node scripts/qa-shot.mjs 390 844 out.png --play --state contract   # one quick capture (see file header for flags)
```

## How it plays

- **Place** — drag a tray piece onto the board with mouse, touch or stylus. On touch the piece floats above your finger so the landing cells stay visible. A translucent ghost shows both the piece and its reflection before you release.
- **Mirror** — columns reflect `0↔8`, `1↔7`, `2↔6`, `3↔5`; column `4` is the glass axis and exists once. A move commits only when the whole mirrored union fits on empty cells.
- **Rotate** — tap a tray piece (or press `R`) to turn it a quarter clockwise. Free, and works on cut fragments.
- **Cut** — drag a piece over the katana to split it at the lit seam. Costs one blade; fragments can be cut again (another blade each time) as long as both halves stay connected.
- **Clear** — full rows and columns clear together. Consecutive clearing moves grow the Symmetry Chain. Two, three and four-plus lines are DOUBLE / TRIPLE / MAX; clearing the axis column is a PERFECT MIRROR; emptying the board is a PERFECT CLEAR.
- **Blade Energy** — clears fill the ring around the katana. A full ring forges a new blade (up to 5). Each blade you forge in a run costs more energy than the last (100 → 115 → 135 → 160 → 190 → 220, then capped); the ring always shows 0–100 % of the current cost, gains tick marks, and the label reads Charge I–V. With a full rack the ring stays banked and is redeemed the moment a blade is spent.
- **Difficulty** — a Difficulty Director maps score to a level (0 at start, 0.25 at 2,500, 0.5 at 7,500, 0.75 at 15,000, 1.0 at 30,000 — and no higher). Higher levels weight awkward pieces up and easy pieces down (easy pieces never vanish), stalling builds Mirror Stress, and milestones at 2.5k / 7.5k / 15k / 30k / 50k mark Mirror Levels II–V. The generator never looks at your intended move.
- **Mirror Contracts** — from 2,500 on, an optional short goal appears now and then ("Clear 2 lines in 3 moves", "Clear with a rotated piece"…). Completing it pays score, Blade Energy and shards; ignoring it costs nothing.
- **Precision Cells** — occasionally a mirrored pair of cells in a nearly complete line glows. Clearing through both pays a bonus.
- **Daily Mirror** — a calendar of puzzles, one per UTC day, each with its own fixed piece sequence that is the same for everyone. Reach the day's target (900) to complete it: the day turns gold in the calendar and pays +30 Mirror Shards once. You can go back and play any earlier day; completing a past day counts as done and pays the shards, but **only completing today's puzzle on the day extends your streak**. Future days are locked. Replays are free and keep your best score for that day.
- **Refraction Overdrive** — a Symmetry Chain of 3 (or a Perfect Clear) ignites ten seconds of 2× score. Warm rim light, breathing axis, rhythmic music layer. The chain has to break and rebuild before it can ignite again.
- **Fracture** — when the board is dense, the player has stalled and few moves remain, a three-second warning leads into an eight-second-per-placement window. Placing or cutting resets it; any line clear escapes. Clearing with under a second left is a **Clutch**. Running out ends the run.
- A run also ends when no tray piece fits in any orientation and no usable cut remains.
- **Game over** is a katana strike: the run locks, the katana enters from outside the board and cuts across the diagonal (alternating each run), the board recoils, every block pops toward you and falls away, the mirror axis goes dark and the results arrive in order — about two seconds; tap after the strike to skip. A new best turns the cut gold; a Fracture timeout makes the axis shudder before the blade lands. Reduced motion replaces the travel with a single line flash and a fade.

Timers only advance while the game is actually playable: they freeze on menus, hidden tabs, window blur, ads, resizes and interrupted pointers.

Keyboard: `R` rotate · `P` pause (`Esc` also pauses / goes back, but note that `Esc` leaves browser fullscreen first).

## Architecture

The rule layer is pure TypeScript with no DOM or Three.js dependency and is fully unit tested:

- `src/game/` — `BoardState`, `MirrorRules`, `PlacementSystem`, `ClearResolver`, `BladeCutter`, `Piece` (rotation, symmetry, orientations), `PieceLibrary` (rated shapes), `PieceGenerator` (director-weighted / daily fixed), `DifficultyDirector`, `Contracts`, `PrecisionCells`, `Tray`, `MoveAnalyzer` (rotation-aware), `ScoreSystem`, `ComboSystem`, `SkillEvents`, `BladeEnergy` (rising recharge cost), `Overdrive`, `Fracture`, `RunClock`, `DailyMode`, `SeededRandom`.
- `src/config/` — every tunable: `gameplay`, `scoring`, `blade` (gains + recharge curve), `difficulty` (curve, stress, piece weights, contracts, precision), `modes` (Overdrive / Fracture / Clutch), `motion`, `cinematic` (game-over timings and physics), `economy`, `cosmetics`.
- `src/core/Game.ts` — the run coordinator: transactions commit to the model first, then presentation follows. `RunPhaseMachine` tracks the interaction phase (`IDLE / PLAYING / DRAGGING / CUTTING / RESOLVING / CINEMATIC / OVER`); navigation is separate, deferred while a transaction resolves and refused during the game-over cinematic.
- `src/render/` — `blocks.ts` (one block component for board, tray, drag visual and previews), `BoardView`, `TrayView` (dynamic grid and bounded scrolling), `PiecePreviewLayout` (normalized per-card shape fitting), `DragVisual`, `Layout` (actual gameplay container + piece count → CSS variables), `EffectsLayer` (pooled Canvas 2D: sweeps, particles, energy streaks), `KatanaModel` (procedural katana), `BladeScene` (Three.js scene with a PMREM studio environment; one canvas re-parented between gameplay, Home, Shop and the game-over strike), `Ambience` (background world layer), `GameOverCinematic` (the katana game-over sequence: its own layer, an explicit event timeline, pure timeline/physics functions; `Game` commits the run and answers the events).
- `src/ui/` — `ScreenManager` (screen stack + transitions), `GameplayView` (HUD, board, tray, blade dock, hint bar), `Icons` (custom stroke family), `components`, `Toasts`, `Callouts`, and `screens/` for Home, Settings, Shop / Collection, Daily, Stats, Achievements, How to play, Pause, Game over, About.
- `src/input/PointerController.ts` — one Pointer Events path; tap-to-rotate vs. drag threshold, capture, cancellation, resize recovery.
- `src/audio/AudioManager.ts` — synthesized effects plus base / chain / overdrive / fracture music layers; three sound themes.
- `src/progression/` — versioned save with V1→V2 migration, achievements, inventory.
- `src/platform/` — the only code touching the CrazyGames SDK; storage adapter with legacy-key fallback.

## Save system

One JSON document (`mirrorblade.save`) holds currency, owned and equipped cosmetics, settings, onboarding, one-time hints, achievements, lifetime statistics and Daily Mirror progress. `SaveCodec` validates and clamps every field, migrates V1 saves (achievement ids renamed, V1 best score archived as `legacyBestScore` because V2 scoring differs) and recovers from corrupt data. The CrazyGames Data Module is used when available, otherwise local storage.

## CrazyGames

`CrazyGamesAdapter` initializes SDK v3 with a timeout (and skips it entirely in the `disabled` environment), reports loading and gameplay events (never on focus loss), reports Mirror Level milestones as game completion, honours the platform mute setting, probes the Data Module, and wraps ad requests so they always settle. Ads and banners are disabled for Basic Launch (`GAMEPLAY_FLAGS`). Upload the contents of `dist/` with `index.html` at the archive root; all paths are relative. The rule-by-rule audit, portal copy and QA captures are in [`docs/crazygames-compliance.md`](docs/crazygames-compliance.md).

## Tests

- Vitest: mirror rules, placement, clearing, cutting, rotation (90/180/270/360, normalization, collision, mirrored placement, fragments, orientation-aware analysis), blade energy (gains, exact 100, overflow, single forge, cap, banking, redemption), Overdrive (trigger, duration, exact 2×, clock pause, re-arm), Fracture (fairness gates, warning → active, reset, escape, cooldown, clutch threshold, hidden-tab pause, timeout), scoring, generation (deterministic, board-independent daily), save migration and inventory, the game-over cinematic (event order and timing windows, slash geometry, katana path and pose, block release plan ranges, cohesion, determinism, phase machine).
- Playwright: mouse placement, tap / keyboard rotation incl. fragments, cutting and zero-blade rejection, real CDP touch drag with the lift offset, tray scroll-versus-drag intent, cutting from a scrolled tray with fragment reveal, first-session tutorial, resize during capture, energy forge, Overdrive 2×, Fracture lifecycle, timer freezes, every screen, settings persistence, shop purchase/equip persistence, deferred navigation, 22-viewport × 1–8-piece containment/overlap/reachability plus 12-piece degradation, tray-vs-board colour parity, and the game-over cinematic (run lock, event order, alternating diagonal, skip rules, reduced motion, new best, fracture, double game over, empty and full boards, resize, three viewports).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Research, design decisions, the implementation ledger and QA captures are in [`docs/`](docs/README.md).
