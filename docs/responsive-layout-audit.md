# Responsive layout audit

Date: 12 September 2026  
Branch: `fix/responsive-dynamic-tray`

## Current architecture

`GameplayView` creates one persistent gameplay screen containing the HUD, status row, board, tray and blade zone. `Layout.ts` reads the gameplay element's current rectangle when `relayout()` is called, chooses portrait or landscape, and publishes board/tray cell sizes plus rail dimensions as CSS variables. `gameplay.css` maps those elements into one CSS Grid. The board and tray use the shared DOM/CSS block renderer; the katana is the only Three.js object and mounts a canvas inside `.blade-stage`. `DragVisual` already renders an active piece as a fixed child of `document.body`, outside the tray's clipping chain.

The game model stores pieces in `Tray` as an ordinary array. `replaceWithCut` replaces one item with two at the same index, so model state already supports a variable count. `TrayView.render` maps the array to cards without fixed slot IDs. The fixed-count assumptions are entirely in layout sizing and regression coverage.

## Root causes

### Piece preview overflow

Files: `src/render/Layout.ts`, `src/render/TrayView.ts`, `src/render/blocks.ts`, `src/styles/gameplay.css`.

One global `--tray-cell` is chosen using only the maximum library width and a fixed three-piece slot budget. Cards use a fixed minimum height of `3.4 × --tray-cell`, independent of the rendered piece's rows. A vertical five-cell piece therefore needs more height than the card at common tablet, desktop and small-phone sizes. The grid centers it, but the card cannot contain it. Hover scale can add a smaller intentional ink overflow too.

There is no authoritative preview-bounds utility. `pieceMarkup` applies raw grid dimensions and inherits the global cell size, so it cannot fit a shape to the card's actual width and height.

### Dynamic tray and katana collision

Files: `src/render/Layout.ts`, `src/styles/gameplay.css`, `src/core/Game.ts`.

Layout budgeting assumes one band of three pieces. CSS switches to two columns above three pieces, creating more implicit rows, but the parent gameplay grid continues to allocate the original height. Because `.tray` has visible overflow, the extra rows paint across the blade's separately assigned grid area. Changing z-index would leave the coordinate collision intact.

The same overflow is clipped by `.screen-gameplay { overflow: hidden }` at the viewport edge. Since the tray is not a scroll container, those pieces have no access path. `touch-action: none` on the entire tray further rules out native pan gestures.

### Resize and embedding gaps

Files: `src/ui/GameplayView.ts`, `src/core/Game.ts`.

`relayout()` correctly reads the gameplay element bounds, but it only runs from window resize, screen entry and a few explicit paths. A CrazyGames banner, iframe/container-only resize, or parent layout change can change the actual element without a window resize. Canvas effect layers already use `ResizeObserver`; gameplay layout does not.

The Three.js canvas resizes from its mounted host, so the supplied screenshots do not show a stale WebGL projection. The energy ring and katana canvas are inside the blade region and decorative layers do not receive pointer events. The oversized collision is the tray's visible grid overflow.

### Fragment normalization

Files: `src/game/BladeCutter.ts`, `src/game/Piece.ts`.

Fragment coordinates are normalized in `BladeCutter.partition`, then normalized again by `createPiece`. Rotations also normalize. The current implementation is correct, but tests should explicitly keep this invariant because preview fitting relies on it.

### Input and auto-reveal

Files: `src/input/PointerController.ts`, `src/render/DragVisual.ts`, `src/core/Game.ts`.

The pointer controller calls `preventDefault()` and captures immediately on piece `pointerdown`, while the tray declares `touch-action: none`. This makes a future scrollable tray unusable by touch. The existing 7 px threshold can distinguish intent, but capture/prevention need to wait until drag activation and vertical panning must remain native.

After cutting, `Game.commitCut` re-renders and highlights fragments but never reveals cards outside the tray's view. The source rectangle stored at drag start also becomes stale if the layout changes before a rejected drag returns.

### Home motion control

Files: `src/ui/screens/HomeScreen.ts`, `src/core/Game.ts`, `src/styles/katanas.css`.

The Home screen currently adds a `.hero-motion` Play/Pause animation button over the blade stage. The owner requested its removal. The shared shop showcase controls are a separate feature and are outside this request.

## Proposed fix

- Extend `Layout.ts` into one container-driven layout calculation that budgets a fixed board, HUD and blade region plus a shrinkable tray region. Publish tray columns, row/card size and capacity without device sniffing or exact-viewport branches.
- Change tray markup to a scrollport containing a dynamic grid. Keep the blade as a sibling region with its own grid track. Add `min-height: 0`, `min-width: 0`, themed scrollbars, native touch scrolling and a subtle overflow fade.
- Add a pure `calculatePiecePreviewLayout` utility based on normalized cell bounds and actual card content dimensions. `TrayView` applies one per-piece cell size and offsets after render/rotation and whenever its `ResizeObserver` fires.
- Adapt pointer handling so touch panning is not captured/prevented before drag intent. Keep active visuals in `DragVisual`'s top-level fixed overlay and use live card bounds when returning after resize.
- Reveal both new fragments with the minimum smooth tray scroll after the cut settles; keep arrival highlight and card reflow motion within the existing 140–480 ms motion language.
- Add a development-only bounds overlay toggled through the debug bridge.
- Expand unit and Playwright coverage across legal extreme shapes, counts 1–8/12, the requested viewport matrix, scroll reachability, card containment, katana separation, resize state preservation and mouse/touch drag paths.
- Remove the Home blade animation Play/Pause button and its Home-only synchronization/style.

## Production invariants

- Every resting preview's geometry fits within its card's configured padding/allowance.
- Every model piece has a rendered card and is either visible or reachable within the tray scrollport.
- No resting tray card intersects the blade region.
- The blade hit target stays inside the reserved blade region.
- Active drag visuals are outside the tray clipping chain.
- Layout responds to the actual game container and never mutates run state.
- Document-level horizontal and vertical gameplay overflow remain zero.

## Implemented result

`Layout.ts` now calculates from the gameplay content box and live tray count. It publishes dynamic columns, visible row height, bounded tray height and blade size; CSS maps the tray and blade to separate tracks. On landscape, the tray uses only the content height it needs until the rail's remaining track becomes the hard cap. On portrait, the tray receives a fixed bounded row between board and blade. Neither path uses exact viewport coordinates or user-agent detection.

`TrayView` owns a scrollport and inner grid, observes the scrollport and every card, and calls the single preview-fit utility after render, rotation and resize. Piece-count relayout and the first fit run before render returns so the new hitbox cannot move between a fast press and pointer-down; later observer work stays coalesced. The scroll state controls the themed affordance and accessible label. A cut keeps the existing 240 ms reflow language, highlights both fragment cards and reveals the complete fragment group after the cut animation. Active dragging continues through `DragVisual` on `document.body`, outside tray clipping.

`PointerController` treats a quick vertical touch movement in an overflowing card as tray scroll and a 160 ms hold as piece-drag intent. This preserves tap rotation and mouse/stylus behavior. The cut target is the dock rectangle; its canvas, SVG ring, scroll fade, effects and debugging outlines are pointer-transparent.

The temporary diagnostics are production-disabled and can be toggled in development with `__MIRRORBLADE_TEST__.toggleLayoutDebug(true)`. They outline the board, scrollport, cards, preview geometry and blade target and show the live pointer position.

Regression coverage is in `tests/layout.test.ts`, `tests/cutter.test.ts` and `e2e/responsive.spec.ts`. It covers all requested dimensions, counts 1–8, defensive 12-piece overflow, long/rotated/irregular bounds, scroll-to-last access, touch scroll and held drag, cut from a scrolled tray, automatic fragment reveal, resize state preservation and unwanted document overflow. Representative captures and review notes are in `qa/responsive-tray/`.

The project declares banner ads disabled and has no banner DOM region; the adapter only implements interstitial/rewarded ads. Container observation still makes the gameplay recompute if an embed changes its allocated element size.
