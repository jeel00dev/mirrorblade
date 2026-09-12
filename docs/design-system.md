# OBSIDIAN MIRROR 2.0

Art direction: a precision puzzle object. Smoked ceramic frame, inset graphite cells, rounded luminous resin, machined chrome. Light is soft and directional. Color belongs to the blocks, not every UI border. Based on sampled supplied reference; no copied assets.

## Tokens

| Role | Token / value |
| --- | --- |
| Page / raised | `--bg-main: #1b1e25`, `--bg-raised: #252930` |
| Panels | `--panel-primary: #20242b`, `--panel-secondary: #181c22` |
| Grid | `--grid-empty: #252a31`, `--grid-border: #41464f` |
| Center glass | `--mirror-axis: #383d46` |
| Text | `--text-primary: #f0eeea`, `--text-secondary: #b4b5ba`, `--text-muted: #8b909b` |
| Resin | cyan `#43c1c6`, coral `#ec807b`, amber `#ecb758`, violet `#9264dc` |
| Semantic | danger coral; success cyan; reward amber |
| Metal | light `#eef0ec`, mid `#a5aeb3`, dark `#424b54` |

Use sRGB output and neutral controlled lights. No opaque HTML paint between board and viewer. Planar rounded outline independent of extrusion depth, ~0.14 cell corner radius, ~0.035 bevel, 0.94 cell width. Tray and board use the same tone source and same procedural resin face texture. Color-accessible alternative uses blue/orange/gold/purple plus subtle unique embossed symbols. High contrast enhances boundaries and text, not saturation.

## Layout and hierarchy

Spacing: 4, 8, 12, 16, 24, 32, 48, 64 CSS px. Radii: 8 (small), 12 (control), 20 (panel), 28 (board/hero). Responsive geometric cell sizes are exempt from spacing tokens.

Depth 0: dark page, a single broad studio light. Depth 1: board frame and recessed tiles, quiet top edge. Depth 2: raised tactile buttons. Depth 3: selected item/foreground screen. Depth 4: drag piece with larger shadow. Do not stack outlines on every surface.

Typography: local system sans-serif, no remote font. Display 48–76/1.0, Score 44–64/1.0 tabular bold, Title 28–40/1.15, Section 18–22/1.3, Button 15–17/1.1 semibold, Body 14–16/1.5, Caption 12–13/1.4. Micro 11 only for nonessential metadata. Uppercase limited to wordmark and short celebration; normal text is sentence case. Score is larger than every gameplay label.

Desktop: a cohesive centered instrument, large board left (~available height), compact right interaction rail containing score, tray, blade/energy. Width cap grows to use large displays; no orphaned header controls spread across screen. Portrait: header, square board, tray, blade; tight vertical grouping without huge holes. Short landscape: board and rail side-by-side, two-column tray if needed. Layout computed from available width AND height; safe-area insets always applied. Menus may scroll vertically; gameplay does not.

## Screen family

Home: understated wordmark, rotating physical blade with mirrored resin accents, best and shards, large amber Play, quiet Daily, five lower navigation actions. No dashboard grid. First platform visit can bypass Home into onboarding.

Secondary screen: one header with Back/title/balance, comfortable centered content. Shop/Collection use a large live material preview and horizontal category navigation with compact selectable swatches. Collection shows equipped loadout and only owned options. Settings is grouped rows with custom accessible controls. Stats uses a dominant best and editorial metric rows. Achievements use medallions and measured progress. Results has a dominant score, meaningful run metrics, shard receipt, immediate retry.

## Icon family

Custom 24×24 SVG. 1.7px strokes, round caps/joins, optically centered 18–20px silhouette. Split-plane motif for blade/currency/brand, same grammar for Home/Play/Settings/Shop/Collection/Stats/Achievements/Daily/Back/Sound/Music/Haptics/Graphics/Info/Close/Rotate/Pause/Restart/Confirm/Lock/Owned/Equipped. No emoji or mixed library glyphs. Score emblem is an original three-facet crest rather than the reference crown.

## Motion

Fast 140ms; standard 220ms; reward 480ms; major 800ms. Ease-out for settling, restrained spring for one tactile response. Buttons press to .97, hover rises 2px. Pickup 1.05 and lift; placement compresses then settles. Cut 90ms emphasis then two fragments spring apart. Clears resolve within 360ms; celebration can finish after input resumes. Never move hitboxes independently from visuals while dragging. Screen transition is fade + 8px travel, disabled in reduced motion.

Overdrive: warm rim sweep, soft axis breathing below 2 Hz, restrained 2× score treatment. Fracture: cold rim with fixed crack accents, numeric timer, no occupancy-obscuring dim overlay. Reduced motion removes shake/travel/rotating reflections but retains static icons, text and meters. Timers never advance behind blocking screens.

## Assets

White-studio blade concept first; transparent cutout for optional home artwork, with procedural live blade using the same silhouette/material. No bitmap UI or board. Runtime assets small, local and manifested. Original source renders retained outside `public/`. Procedural icons, geometry and resin textures are authoritative for interactive objects.

## As built (Claude, 2026-09-11)

The system above was written before implementation. This is what shipped, so both agents can check the code against one description.

**Tokens** live in `src/styles/tokens.css` exactly as named in the brief (`--bg-main`, `--panel-primary`, `--grid-empty`, `--grid-gap`, `--mirror-axis`, `--text-*`, `--block-*`, `--danger`, `--success`, `--blade-metal-*`) plus control, spacing (`--s-1`…`--s-8` = 4…64), radius (`--r-s/m/l/xl` = 8/12/20/28), depth (`--shadow-1`…`4`) and motion (`--t-fast/standard/reward/major` = 140/220/480/800 ms) tokens. Block sets, board themes and the accessible palette override the block/board tokens at runtime on `:root`.

**Block material** (`blocks.css`) is one CSS component, `.blk`, sized from `--cell`. Face gradient 34 % white at the top edge → tone → 4 % black; 1.5 px lit top edge; bottom lip 13 % darker with a 30 % darker underline; contact shadow; 26 %-height gloss; faint resin glow. Radius 0.17 cell, lip 0.075 cell, gap 0.07 cell. Sampled faces sit within ±4 RGB of the reference on all four tones. Tray, board, drag visual, shop previews and How-to diagrams share the markup (`render/blocks.ts`), so parity is structural.

**Board** (`board.css`): frame `--board-frame` with inset highlight; grooves `--grid-gap`; recessed faces `--grid-empty` with a 1 px top highlight; axis cells `--mirror-axis` plus a 9 s travelling sheen. Frame padding 0.24 cell, radius 0.34 cell.

**Blade**: the one Three.js object (`render/BladeScene.ts`). Rhombic-section double-pointed geometry, flat facets, metalness 1 / roughness 0.2 / clearcoat 0.5, PMREM RoomEnvironment, hairline spine. Speed follows state (0.9 idle, 4.2 hover, 1.8 Overdrive, stalls near 0 with no charges), forge burst spins up and flashes the edge. Hero and preview mounts add a soft canvas-texture floor shadow.

**Layout** (`render/Layout.ts`) publishes `--cell`, `--tray-cell`, `--board-w`, `--rail-w`, `--row-gap`, `data-layout` and `data-tray`. Landscape: board sized by height, rail takes the remaining width (268–460 px), tray stacks in a column when the rail budget allows ≥30 px tray cells, otherwise a row. Portrait: header, board, tray, blade with leftover height spread into the gaps.

**Type**: system rounded sans stack. Score `clamp(30, 4.6vw, 48)` 800; display/wordmark `clamp(20, 5.4vw, 52)` 800 tracked 0.14em; title 26–36; section 18; button 16–18; body 15; caption 13; micro 11. Uppercase only on the wordmark, callouts, section labels and metric labels.

**Icons**: `ui/Icons.ts`, 24 px, 1.75 px round strokes; solid fills only for play, crest, shard and the equipped star.

**Screens**: full-viewport `.screen` sections managed by `ui/ScreenManager.ts`; gameplay is persistent, Pause and Game over are overlays with blur. Transitions: fade + 10 px travel (direction-aware), overlays fade + 0.98 scale, 220 ms, 60 ms under reduced motion.

**State transformations** (`states.css`): Overdrive — warm background wash, orbiting conic rim (`@property --rim-angle`), breathing axis, 6 % brighter blocks, score breathe, `2×` chip with drain bar; final 3 s doubles the rim speed. Fracture — cool wash, corner crack marks (0.45 → 0.9 opacity), board pressure pulse, cell dimming pulse, countdown chip, urgent tray; final 3 s turns the rim and cracks coral. Reduced motion replaces every animation with a static 2 px rim ring and keeps chips, text and meters.

## Katana collection (Codex, 2026-09-12)

The collection supersedes the earlier single-geometry katana description below. Five Japanese katana designs preserve OBSIDIAN MIRROR's surfaces, type, controls and depth tokens. Shoshin → Kage → Shiosai → Raimei → Akatsuki progress through steel, silver, cyan, violet/gold and warm gold/ivory. Saved IDs and prices remain compatible. See `research-2026-09-12-katana-collection.md` for sources and the design specification.

All screens mount the same live model. Shop adds ordered 01–05 cards, a fittings close-up, original matching SVG thumbnails, a named replay action and pause/resume. The Home caption identifies equipped name and tier. Unaffordable blade artwork remains fully lit; the price and lock carry availability.

Home/catalog motion is a 2.2–3.4 s signature sequence followed by 3–3.3 s completely still. The five signatures are a steel glint, crescent, tide ribbons, storm branches and sun halo. Gameplay retains its state-driven dock response. Pause and reduced motion suppress decorative movement and effects. Original generated steel, silk and samé textures, sculpted guards and conforming grip ribbons supply detail without external assets. Model budget: fewer than 15k triangles and eight material batches; actual counts are in `qa/katana-collection/measurements.json`.

## V3 additions (Claude, 2026-09-12)

- **Depth tokens** (`tokens.css`): `--shadow-rest` (2 px hard + 14 px soft), `--shadow-hover` (3 px + 22 px), `--shadow-pressed` (0 + 6 px), `--inner-highlight`, `--inner-edge`, `--panel-shadow`, `--shadow-inset`. Rest lifts ~10–25 % more than V2; hover +2 px; press moves the surface 1 px down and contracts the shadow; release springs back in 140 ms. Applied to every interactive surface; nav items keep the reference's flat rest look with only a faint lift.
- **Block bevel**: `--bevel = max(1.5px, 5.5 % cell)`. Inset shadows: top+left rim 42 % white (1 px 65 % catch-light), right rim 26 % black, bottom rim 22 % black, then the lip (14 % + 34 % underline) and the contact shadow. Face gradient reduced to 14 % white at the top so the rim, not the face, carries the depth. Matches `reference/v3-3-target-block-bevel.png` (see `qa/v3/block-comparison.png`).
- **Katana**: the signature object. Blade steel #e6eaeb metalness 1 / roughness 0.2 / clearcoat 0.4 with a vertex-colour hamon; fittings #2b2f36; habaki brass #8f7a55; wrap #1e2024 with generated diamonds; one cyan menuki. Poses: upright (Home), diagonal sway (dock), showcase (Shop). Motif reuse is limited to the Home→Play cut-line reveal, the game-over crack line, the ambient cut and the slice sound.
- **Ambience**: Canvas layer under every screen — 4–8 blurred piece silhouettes at 4–9 % alpha on three parallax depths, 10–22 motes, pointer parallax ±14 px on desktop, one katana pass every 15–35 s. Disabled at Low quality; frozen under reduced motion.
- **Combo typography**: metal-gradient `background-clip: text` word, revealed outward from the axis, per-letter compress→expand, one sheen pass, scaleY(−1) reflection at 35 %; tier sizes 26–70 px; durations 520 / 640 / 760 / 900 ms. Never in a box.
- **Scroll**: 10 px scrollbar (track #15181d recessed, thumb #4a515b→#363b43 raised, hover brighter, active with a cyan inner ring) via `scrollbar-color` and `::-webkit-scrollbar`; 56 px bottom fade while content remains.
- **Game-over cinematic** (`cinematic.css`, `render/GameOverCinematic.ts`): the only sequence that borrows the katana for a strike. 140 ms hold → 190 ms enter → 180 ms slash with a 70 ms hit-stop at the axis → blocks pop 1.10× (1.17× near the line) and fall at 38 cells/s² with 35–125 °/s spin, one piece cohering 140 ms → mirror dark at 1.5 s → staged results (≈480 ms) at 1.7 s. Cut line 2 px white core with a cyan afterimage (gold on a new best, red on a fracture), 400 ms fade. HUD secondary elements fade in 140 ms, the score stays. Reduced motion: static line flash, blocks dim and sink a third of a cell, results at 720 ms.
- **HUD additions**: Mirror I–V ticks under Best; ring tick marks (5→11) and "Charge I–V" as recharge cost rises; contract chip (title, progress, moves badge); stress chip ≥ 0.65; precision cells as amber diamonds.
