# HANDOFF — running log

Newest entry first. Each session appends: who, when, what was done, what to pick up next.

## 2026-09-12 — Codex: responsive dynamic tray on `fix/responsive-dynamic-tray`

Researched and reproduced the owner-supplied overflow cases before implementation; see `research-2026-09-12-responsive-dynamic-tray.md` and `responsive-layout-audit.md`. Root causes were the three-piece layout budget, visible implicit rows, a global width-oriented preview scale and a non-scrollable touch path. Fragment normalization was already correct and now has explicit coverage; the katana canvas projection was not the collision source.

Implemented a count- and container-driven layout, bounded scrollable tray, one normalized per-card preview-fit utility, reserved blade track, resize observation, reflow/fragment reveal, scroll-versus-held-drag touch intent, live return bounds after resize and a development geometry overlay. Removed the Home blade animation Play/Pause button while retaining the primary Play action and catalog showcase controls. The OBSIDIAN MIRROR materials and procedural asset set are unchanged.

Validation: 111 unit tests, 42 Playwright tests, production build, 22 requested viewports × counts 1–8 plus 12 pieces, mouse and real-touch scrolled cut paths, resize state preservation, and the full 126-image seven-viewport capture pass with no console errors. Dedicated reviewed captures are in `qa/responsive-tray/`. Physical-device touch feel and real-GPU performance remain normal release checks.

---

## 2026-09-12 — Codex: five katana collection on `ui/shop`

Started with docs, contribution rules and the single available import commit (`33155d1`). New museum/game-development research is in `research-2026-09-12-katana-collection.md`. Standing owner preferences are in root `AGENTS.md`.

Implemented Shoshin / Kage / Shiosai / Raimei / Akatsuki with distinct 3D details, matching thumbnail artwork and complete equipped identity on Home, Shop, Collection and gameplay. Existing saved IDs and prices remain unchanged. Home/catalog get signature animations with still holds, pause/replay and reduced motion; Shop also has a fittings close-up. Geometry is batched and disposed between design changes. No external art or audio added.

85 unit tests and 25 browser tests pass. See `qa/katana-collection/README.md` for capture paths, measured geometry budgets and final QA. `npm run dev` is running on http://127.0.0.1:5173 for review. Changes are local and uncommitted. No commit, push or PR has been requested.

Remaining human validation: visual preference/appeal across all five tiers and physical midrange-phone frame time. Do not claim purchase uplift or device performance from automated browser captures. All further art changes should follow the existing obsidian material language and begin with docs/research.

---

## 2026-09-11 16:10 IST — Claude Code takes over from Codex

**Where Codex stopped:** audit (`v2-audit.md`), research (`research-v2.md`), design system, feedback matrix, ledger, bug tracker and changelog were written. Baseline V1 captures are in `qa/v1/`. Codex was about to generate a white-studio blade concept image when its usage limit hit; no source code had been changed yet. Lint / 30 unit tests / build were green at handoff (re-verified by Claude).

**Reference material secured:** the owner's reference screenshot and the two V1 desktop captures are now permanent in `docs/reference/`. Palette re-sampled with ImageMagick; matches Codex's numbers (see `research-v2.md` §1). Extra observation: cell gaps in the reference are near-black `#0f1216`, i.e. the board reads as dark grooves between slightly raised tile faces, and block shading is restrained (≈10 % lighter top band, ≈8 % darker bottom lip, thin bright top edge).

**Architecture decision (Claude) — how V2 renders blocks:**

V1 draws tray pieces in CSS and board blocks in a Three.js WebGL scene that sits *under* a translucent HTML board panel. That is the direct cause of bug V2-001 (placed blocks are dark) and, more fundamentally, two different renderers can never produce identical block material. V2 therefore:

1. Renders board cells, placed blocks, tray pieces and the drag visual with **one DOM/CSS block component** (`src/render/blocks.ts`). Parity between tray and board is guaranteed by construction. The reference blocks are 2.5-D flat-shaded art, which layered CSS reproduces exactly and animates cheaply with transforms.
2. Keeps **Three.js only for the blade** (`src/render/BladeScene.ts`): a real machined-metal object with a PMREM studio environment so reflections move as it rotates. One shared canvas is re-parented between the gameplay blade zone, the Home hero and the Shop blade preview — which also gives the Home→Play transition its continuity.
3. Uses a pooled **Canvas 2D `EffectsLayer`** over the board for particles, line sweeps and axis flashes. No full-screen post-processing.
4. Replaces the single overlay card with a **`ScreenManager`** (full screens, enter/leave transitions, back-direction awareness) and separates navigation state from the run's interaction phase so menus can never race a placement (bug V2-003).
5. Adds a **`RunClock`** (single active-time clock that pauses on menu / hidden tab / ad / resize / lost pointer). Fracture, Overdrive and play-time stats read only from it (bug V2-005).
6. Computes gameplay layout in JS (`src/render/Layout.ts`) from *both* viewport width and height and publishes `--cell` etc. as CSS variables, replacing the nested `min()` chains that clipped the board at 1024×768 (bug V2-002).

**Assets:** Claude has no image-generation tool in this environment. Per the brief's fallback, every visual object is procedural (SVG icon family, CSS block material, Three.js blade, CSS/SVG crest emblem) and is recorded in `art/asset-manifest.json`. If Codex later regains image generation, the white-studio blade render can be added as optional Home artwork without changing any interactive element.

**Next steps (in the brief's order):** rules layer first (rotation, blade energy, skill events, Overdrive, Fracture, Clutch, clock, save v2, daily UTC) with unit tests → block material + board → blade scene → screens → HUD/states → audio → responsive QA captures → balance simulation → production build. Ledger is updated after each item.

---

## 2026-09-11 17:45 IST — Claude: V2 implementation pass complete, ready for device checks

**Done this session:** everything in `IMPLEMENTATION_STATUS.md` marked `[x]`/`[T]` — rules layer with tests, DOM block material matching the reference, faceted Three.js blade, all 13 screens, HUD, Overdrive/Fracture/Clutch presentation, audio layers, save v2, e2e suite (15), balance simulation and tuning, QA captures at 7 viewports (`docs/qa/v2`), README. Build: 688 KB (163 KB gzip).

**Still open / needs a human or a device:**
1. Real-GPU look of the blade reflections and 60 FPS on a mid phone — all captures here are software-rendered (SwiftShader), so metallic highlights are approximated.
2. Audio has only been verified not to throw; nobody has listened to it. Levels in `AudioManager.ts` are conservative.
3. Long-session leak check (30+ restarts) on a device.
4. Optional: white-studio blade render for `art/source-studio/` if image generation becomes available — purely decorative.
5. Perfect Mirror (axis clear) never fired in simulation; if playtests confirm nobody sees it, consider a softer sibling event.
6. CrazyGames portal settings (Data Module toggle, orientation flags) are outside the repo.

**How to pick up:** `npm run dev`, then `npm run capture` to refresh screenshots and `npm run simulate` after any config change. Keep `IMPLEMENTATION_STATUS.md`, `CHANGELOG_V2.md` and `BUGS.md` current.

---

## 2026-09-12 01:20 IST — Claude: V3 pass complete

**Done:** everything in the V3 sections of `IMPLEMENTATION_STATUS.md` is `[x]`/`[T]`. Research (`v3-research.md`, `katana-research.md`) → Difficulty Director + recharge scaling + rated pieces + Mirror Stress + Contracts + Precision Cells (unit + e2e tested, simulated in `balance-report-v3.md`) → combo ladder rebuild → four-sided bevel → depth tokens → procedural katana with poses → ambience → themed scrolling → Shop/Guide/Stats/Awards upgrades → 112 captures at 7 viewports (`qa/v3`) plus the three comparison sheets the brief asked for.

**Numbers to remember:** live director ends every greedy run (median 25.8k, p90 42k); frozen at level 0 the same policy reaches 92k and 7 % of runs never end. Casual ≈ 65 placements / 10k. Blade forges per expert run 8.1 → 4.4.

**Still needs a human / device:** real-GPU look of the katana (hamon, reflections) and frame time on a mid phone; listening pass on the new audio layers; the feel questions in `balance-report-v3.md` §Playtest.

**Where to tune:** `src/config/difficulty.ts` (curve, piece weights, stress, contract/precision cadence), `src/config/blade.ts` (recharge), then `npm run simulate`.

---

## 2026-09-12 12:40 IST — Claude: katana game-over cinematic

**Done:** `docs/game-over-animation-research.md` → `src/render/GameOverCinematic.ts` with an explicit event timeline (`CINEMATIC_START … CINEMATIC_END`), a `CINEMATIC` run phase, `src/config/cinematic.ts` for every timing, `src/styles/cinematic.css`; `Game.endRun` commits the run and answers events (audio duck + six new sounds, HUD fade, phase → OVER at `RESULTS_REVEAL`, staged results card). New-best and fracture variants, skip after the strike, reduced-motion path, phones. Ledger section "V3 — GAME OVER CINEMATIC", CHANGELOG, BUGS V3-006/007. 95 unit, 33 e2e, build green.

**Tune here:** `src/config/cinematic.ts` (timings, pop, gravity, spin, katana scale). Debug: `__MIRRORBLADE_TEST__.endRun('fracture')`, `.skipCinematic()`, `.state().cinematic`. One-off capture: `node scripts/qa-shot.mjs 1280 800 out.png --cinematic 450`.

**Still needs a device:** the strike at 60 fps on a mid phone (headless software rendering sits at ≈20 ms/frame with 81 clones after V3-006) and a listening pass on `katana-*`, `blocks-detach`, `block-thud`, `mirror-end`.
