# V2 implementation ledger

Status: `[ ]` not started · `[~]` in progress · `[x]` implemented · `[!]` externally blocked · `[B]` bug · `[T]` tested. Implementation is not equivalent to final visual approval.

## Audit / research / design

- [T] Complete repository inspection, baseline lint/30 tests/build
- [T] Baseline seven viewport captures and manual visual review
- [x] Reference pixel palette, material and spacing analysis
- [x] Tetris / match-puzzle / bubble-puzzle / game UI research with sources
- [x] OBSIDIAN MIRROR 2.0 design system and motion rules
- [x] Bug tracker and incremental change log
- [x] Feedback matrix
- [x] Asset manifest (`art/asset-manifest.json`) — all assets procedural; `art/source-studio/` reserved (no image generation available to Claude; Codex's attempt hit its usage limit)

## Visual / interaction

- [T] Tray-to-board colour parity — one DOM block component for both (`render/blocks.ts`); asserted by `e2e/responsive.spec.ts` (computed background identical)
- [T] Rounded resin blocks, recessed tiles, smoked axis and frame (`styles/blocks.css`, `styles/board.css`); sampled within ±4 RGB of the reference
- [x] Machined faceted blade with PMREM studio reflections, slows to a stop at zero charges (`render/BladeScene.ts`)
- [x] Custom 24px stroke icon family, 40 glyphs incl. all 23 required (`ui/Icons.ts`)
- [x] Pickup lift (tray→board scale), return, settle squash, quarter-turn rotate, cut hit + fragment arrive (`gameplay.css`, `DragVisual.ts`, `TrayView.ts`)
- [x] Original + mirror ghosts on the board cells, invalid ghost, cut guide seam, fragments arrive with spring
- [x] DOUBLE / TRIPLE / MAX / PERFECT MIRROR / PERFECT CLEAR / CLUTCH callouts, board pulses, sweeps + particles, score bump, optional shake (`Callouts.ts`, `EffectsLayer.ts`)
- [T] Energy ring around the blade, milestone sounds, NEW BLADE forge burst, banked full ring, reforge on spend; e2e verifies forge at 100
- [T] Overdrive: warm background, orbiting rim, breathing axis, 2× chip with drain bar, final-3s ticks, smooth exit (`states.css`); e2e verifies 2× score
- [T] Fracture: corner cracks, cold light, board pressure, countdown chip, urgent tray, escape relief, timeout shatter → results; e2e covers warn/active/reset/escape/timeout
- [x] CLUTCH callout, dip-then-release sound, +200 / +24 energy (unit tested; e2e for threshold pending)
- [x] Pooled Canvas 2D particles bounded by quality budget; one WebGL context; auto quality from cores/memory; blade canvas unmounted on screens that do not show it

## Screens

- [x] Boot screen; SDK init with 4s timeout; first session goes straight into guided play, returning players get Home
- [x] Home: wordmark, live 3D hero blade with mirrored block composition, best + shards, PLAY (primary), Daily Mirror, 5-item nav, settings
- [T] HUD: score/best, home/pause, status chips only when relevant (chain / 2× / fracture timer). No MIRROR AXIS / DROP TO SPLIT labels
- [T] Pause overlay; navigation during RESOLVING/CUTTING is deferred (e2e), never races a placement
- [T] Settings: master/SFX/music sliders, mute, haptics, screen shake, quality segmented, reduced motion, colour-accessible, high contrast, tutorial reset, platform note, About; persistence e2e
- [T] Shop: 6 categories, hero preview (live blocks / mini board / 3D blade / playable clear effect / trail / sound sample), buy→owned→equip flow with balance count-down; e2e
- [x] Collection: loadout summary, owned-only strip, preview, equip, 'Use default'
- [x] Daily screen (date, streak, today/best/plays, rules, play); UTC key; board-independent sequence (unit tested)
- [x] Statistics: best/total heroes + 16 editorial rows incl. efficiency, averages, overdrive time
- [x] Achievements screen: 16 medallions, progress bar, rewards
- [x] How to play: 5 diagrammed steps (place, mirror, rotate, cut, energy)
- [x] Results: score, NEW BEST, lines, chain, blades forged/used, overdrives, clutches, shards, Play again / Home
- [x] About / privacy / credits screen
- [x] Direction-aware fade+travel transitions, overlay fade/scale, initial focus, Esc/P/R keys, ≥44px targets

## Rules / progression / audio

- [T] Existing mirror union / atomic placement / simultaneous clears / connected one-generation cuts
- [T] Rotation for originals/fragments; rotation-aware move analysis/fair generator (`Piece.ts`, `Tray.ts`, `MoveAnalyzer.ts`, `tests/rotation.test.ts`)
- [T] Blade energy configurable gains / exact threshold / overflow / cap / banking (`config/blade.ts`, `game/BladeEnergy.ts`, `tests/energy.test.ts`)
- [T] Strong move classifier / Perfect Mirror (axis column clears) / Perfect Clear / chains (`game/SkillEvents.ts`)
- [T] Skill-earned 10-second 2× Overdrive with deterministic rearm (`game/Overdrive.ts`, `tests/modes.test.ts`)
- [T] Fracture occupancy/stall/options trigger / grace / per-action timer / escape (`game/Fracture.ts`)
- [T] Clutch threshold / bonus / energy (`Fracture.onAction`, `ScoreSystem`, `BladeEnergy`)
- [T] One active clock gated by screen / hidden / focus / ad / resize / pointer / over; e2e verifies hidden-tab and pause freeze
- [T] Onboarding: place → mirror → rotate → cut → energy hint bar with Skip; first Overdrive / Fracture / energy explain themselves once (e2e)
- [T] Save v2 validation/migration, preserved v1 inventory/currency and legacy records (`SaveCodec.ts`, `tests/persistence.test.ts`)
- [x] Economy: run payout + overdrive/clutch bonuses; 16 achievements; shop is cosmetic only
- [x] Audio: 29 synthesized SFX, base/chain/overdrive/fracture layers, master/SFX/music/mute, suspend on hidden, 3 sound themes
- [x] SDK: init timeout, ad request settle/timeout, Data Module probe, ads off for Basic Launch

## Validation / release

- [T] Rotation / blade energy / Overdrive / Fracture / Clutch deterministic unit tests (60 passing)
- [T] Save migration / corrupted data / daily sequence tested (`tests/persistence.test.ts`, `tests/generator.test.ts`); platform adapter exercised via the e2e SDK stub
- [T] Mouse, CDP touch, tap-rotate, R key, cut, zero blades, restart, navigation — `e2e/gameplay.spec.ts`
- [T] Shop purchase/equip persist, settings persist, hidden/menu pause, resize during capture — e2e
- [T] 16 viewports: bounds, no region overlap, no overflow, minimum tray cell — `e2e/responsive.spec.ts`
- [T] All ten major screens/states × 7 viewports captured to `docs/qa/v2` by `npm run capture` (98 images, 0 console errors)
- [T] Manual review of desktop, tablet portrait, phone portrait, phone landscape and short-landscape menus; colour parity asserted in e2e
- [T] Restart path reuses views/blade/effects; e2e runs 20 restarts and asserts no stray screens/canvases/drag visuals/blocks (device soak still recommended)
- [T] `npm run simulate` — 750 policy runs; energy gains −20 %, Fracture thresholds raised, tier-4+ weighting added; see `docs/balance-report.md`
- [T] Lint 0 warnings · tsc strict · 73 unit · 20 e2e · production build 776 KB (200 KB gzip) — V3 state
- [x] README rewritten for V2; asset manifest; platform notes in Settings/About
- [!] Real CrazyGames Portal/ad delivery, account cloud storage and physical-device performance require external platform/device validation

---

# V3 — Difficulty, game feel, visual refinement (started 2026-09-11)

## Katana collection — 2026-09-12, `ui/shop`

- [x] Read docs/contribution guide and available commit history; new sourced research in `research-2026-09-12-katana-collection.md` before implementation.
- [x] Five distinct detailed katana designs, ordered 01–05, preserving saved IDs, ownership and prices.
- [x] Per-blade Home/showcase animation, still pauses, replay, pause control and reduced motion.
- [x] Larger previews, fittings inspection, matching thumbnails and equipped identity across screens.
- [T] State/persistence tests and required checks passed: 85 unit tests, 25 browser tests; collection and 112 wider regression captures completed across seven desktop/phone/landscape/tablet viewports. See `qa/katana-collection/README.md`.

## V3 — UI refinement

- [T] Stronger global UI depth/shadows — `--shadow-rest/hover/pressed`, `--inner-highlight`, `--inner-edge`, `--panel-shadow`, `--shadow-inset` applied to buttons, icon buttons, nav items, tabs, cards, toggles, sliders, chips, pills, panels; compared against `reference/v3-1` in `qa/v3/ui-comparison.png`
- [T] Background ambience (`render/Ambience.ts`): distant pieces on parallax depths, motes, rare katana pass that splits a piece (15–35 s), pointer parallax on desktop, ~30 fps, quality-gated, static under reduced motion
- [T] Themed scrollbar (`scrollbar-color` + `::-webkit-scrollbar`, 10 px recessed track / raised thumb) and bottom scroll fade; e2e
- [T] Four-sided block bevel via inset shadows following the radius (`styles/blocks.css`); `qa/v3/block-comparison.png` target vs amber / old coral / new coral / cyan / violet
- [T] Procedural katana (`render/KatanaModel.ts`): curved shinogi-zukuri blade with vertex-colour hamon, kissaki, habaki, seppa, rounded-square tsuba, fuchi, wrapped tsuka (generated texture), kashira, menuki — 1.6k triangles (asserted < 3k in e2e); `qa/v3/katana-comparison.png`
- [x] Katana animation states: idle sway (dock) / full rotation (hero), hover spin, energy pulse, full-ring specular sweep, forge burst, cut slash, Fracture jitter, Overdrive lift, zero-charge dull, reduced-motion still; Home→Play travel + cut-line reveal; game-over crack line
- [x] Shop V3: spotlight + platform stage, showcase katana pose, bevelled block thumbnails, looping effect/trail thumbnails, katana silhouettes, board minis, card states rest/hover/selected/owned/equipped/locked, scroll fade
- [x] Guide: 8 looping CSS demos (place, mirror, rotate, cut, energy incl. rising cost, combo, overdrive, fracture)
- [x] Stats: clears-by-size bars, highest Mirror level, blade-efficiency dial, longest run, contracts, precision; Awards: engraved locked / gold earned / rare sheen medallions
- [x] Home ambience (katana, drifting pieces, occasional split, shard glint, rare logo reflection); hover +2 px / press −1 px + contracted shadow / spring release on every control

## V3 — Difficulty

- [T] DifficultyDirector (`game/DifficultyDirector.ts`, `config/difficulty.ts`): published score curve 0/2.5k/7.5k/15k/30k → 0/.25/.5/.75/1, bounded stress modulation, stages I–V, capped at 1.0
- [T] Blade recharge scaling: cost 100/115/135/160/190/220 per blade forged this run; ring shows % of current cost, tick marks grow, 'Charge I–V' label; e2e
- [T] Recharge cap 220 (`BLADE_ENERGY.recharge.max`), unit tested
- [T] Piece ratings 1–5 on all 18 shapes (+ N, Long T added)
- [T] Director-weighted distribution; easy share ~70 % → ~20 %, never zero; generator draws harder pieces at higher levels (unit tested); fairness substitution unchanged
- [x] Mirror Stress: builds after 2 free stalls, relieved by clears; axis dims, cold rim, tension drone, 'Mirror stress' chip ≥ 0.65; feeds Fracture stall gate
- [T] Ceiling verified: `docs/balance-report-v3.md` — live director median 25.8k / every run ends; frozen-director control 91.9k with 10 runs never ending
- [x] Milestones with 'MIRROR LEVEL II…' callout, board pulse, katana gleam, sound, achievements; Mirror I–V ticks under Best (endless only)
- [T] Mirror Contracts (`game/Contracts.ts`): 4 kinds, optional, one chip, rewards score/energy/shards, lapse silently; unit + e2e
- [T] Precision Cells (`game/PrecisionCells.ts`): mirrored empty pair in a ≥5/9 line, 6-move life, +150/+12; unit + e2e

## V3 — Combo

- [x] Combo research (`docs/v3-research.md` §B)
- [x] Combo typography: metal-gradient text with one-pass sheen, axis-outward reveal, per-letter compress/expand, glass reflection, no boxes; tiers double/triple/max/perfect/clutch
- [x] Ladder: anticipation prime (70 ms) → dissolve → title (140/220 ms) → energy streaks → score count-up (300–700 ms); perfect adds board dim + axis blaze; katana flash from triple
- [x] Audio: chain pad grows with chain depth, intensity pulse (≥0.35) + off-beat tick (≥0.7), tension drone with stress, katana slice + noise whoosh, contract/precision/milestone sounds
- [x] 4–16 crystalline streaks travel cleared cells → katana dock; ring bumps on arrival; skipped under reduced motion
- [x] Perfect: dim → axis blaze → title → streaks converge → blade flash → multiplier settles (~900 ms)
- [x] Max: larger gold type, rim sweep, katana specular, 3 px impulse (~760 ms)

## V3 — Testing

- [T] `npm run simulate` → `docs/balance-report-v3.md` with per-band legal options / rating / occupancy / stall / forge cadence / cost, game-over percentiles, frozen-director control
- [T] 390×844, 430×932, 844×390, 768×1024 captured (`qa/v3`) and reviewed; hint bar wrap fix (V3-001)
- [T] 1920×1080, 1366×768, 1280×720 captured and reviewed
- [T] 1.6k triangles (e2e asserts < 3k); one texture 128×512; one WebGL context; real-GPU frame time still to be measured on a device
- [T] e2e: `scrollbar-width: thin` applied, fade toggles with scroll position
- [T] `qa/v3/block-comparison.png`; tray-vs-board parity e2e still green
- [T] Shop captured at 7 viewports incl. blades category; purchase/equip e2e green
