# Responsive dynamic tray research

Date: 12 September 2026  
Scope: gameplay tray sizing, overflow access, drag/scroll input, element-based resize, safe areas and automated responsive checks.

## Evidence from the current build

The live V3 build was measured before implementation with 3, 6 and 8 tray pieces, including a rotated five-cell line. The defects are structural:

- `Layout.ts` budgets one tray band from a fixed three-piece model. `gameplay.css` changes the tray to two columns when the count exceeds three, but the gameplay grid still allocates only the original band.
- The tray has `overflow: visible` and `touch-action: none`. Extra implicit grid rows therefore paint through the blade region and beyond the clipped gameplay viewport, while touch users cannot pan the tray.
- A tray card is at least `3.4 × --tray-cell` high, while preview geometry uses one global `--tray-cell`. A rotated 1×5 piece requires `5 × --tray-cell`, so it escapes cards whenever the fixed card height is smaller than five cells.
- Existing responsive coverage forces exactly three pieces and checks the `.piece` at rest, so it cannot detect dynamic-row overflow or scroll reachability.
- Cut fragments are normalized twice (`BladeCutter.partition` and `createPiece`), so stale parent coordinates are not the present cause. This remains an invariant worth testing.
- The DOM tray and Three.js katana do not share a renderer. The blade canvas already mounts inside `.blade-stage`; the collision comes from CSS grid overflow, not a WebGL/CSS projection mismatch.

Measured examples before the fix:

| Viewport | Pieces | Tray client / scroll height | Resting slots intersecting blade | Result |
| --- | ---: | ---: | ---: | --- |
| 390×844 | 8 | 177 / 310 px | 4 | Rows 3–4 enter the blade region |
| 844×390 | 8 | 126 / 337 px | 4 | Rows enter blade region and leave viewport |
| 768×1024 | 8 | 133 / 554 px | 4 | Rows enter blade region and leave viewport |
| 1366×768 | 8 | 434 / 467 px | 2 | Final row enters blade region |
| 500×700 | 6 | 84 / 261 px | 4 | Rows 2–3 enter the blade region |

At 768×1024, 1366×768 and 320×568, a rotated 1×5 preview also exceeded its card vertically.

## Standards findings and application

### Let the collection create tracks, then bound its scrollport

CSS Grid automatically creates implicit tracks for auto-placed items, and `repeat(auto-fit, …)` collapses unused repeated tracks. The grid specification also warns that intrinsic minimums can stretch content into overflow zones. The tray should derive columns from its measured width and item-count policy, give every row a definite usable minimum, and place that grid inside a bounded scrollport. A piece count must never participate in sizing the board or blade region beyond the tray's allocated size. Source: [CSS Grid Layout Module Level 2](https://www.w3.org/TR/css-grid/).

CSS Overflow defines the scrollport as the padding box through which scrollable overflow is viewed and explicitly recognizes user panning and scripted `scrollIntoView()` as access mechanisms. Extra tray rows therefore need `overflow: auto`, rather than visible painting or clipping without a scroll mechanism. New fragment cards can be revealed with the smallest necessary scroll after the cut/reflow settles. Source: [CSS Overflow Module Level 3](https://www.w3.org/TR/css-overflow/).

Flex and grid children have automatic minimum sizes that can preserve their content size. The responsive rail and tray region should explicitly use `min-width: 0` and `min-height: 0` so the tray scrollport can shrink within the gameplay grid. Source: [CSS Flexible Box Layout Module Level 1, automatic minimum size](https://www.w3.org/TR/css-flexbox-1/#min-size-auto).

### Size previews from actual shape bounds

The authoritative preview computation should normalize cells, find rows/columns, subtract card padding and visual allowance, and calculate:

```text
cellScale = min(
  usableWidth / columns,
  usableHeight / rows,
  maximumPreviewCell
)
```

The DOM grid then receives this cell size and is centered by normal flow. Block gaps, bevels and shadows scale from the same cell token. Resting geometry stays within the padded card; the drag visual continues to be rendered in the existing fixed, top-level overlay so scroll clipping never clips an active drag.

### Observe the actual gameplay container

Resize Observer reports changes to an element's content or border box and is the correct counterpart to the window resize event for embedded/iframe layouts. The gameplay view should observe its own border box, publish layout variables from that box, and coalesce updates in an animation frame. Window resize can retain clock/cinematic behavior, while layout must no longer assume the window equals the game container. Source: [Resize Observer specification](https://www.w3.org/TR/resize-observer/).

### Allow touch panning until a drag starts

Pointer Events defines `touch-action: pan-y` as allowing the user agent to handle vertical panning that begins on the element, while `none` prevents direct-manipulation panning and zooming. The tray scrollport should use `touch-action: pan-y` and `overscroll-behavior: contain`. A piece press remains pending until the existing movement threshold; vertical motion intended for a scroll must not call `preventDefault()` or capture the pointer. Once a piece drag is intentionally activated, pointer capture and the top-level drag visual can take over. Source: [Pointer Events specification, `touch-action`](https://www.w3.org/TR/pointerevents/#the-touch-action-css-property).

### Keep essential regions within safe areas

The four `safe-area-inset-*` environment variables define a rectangle within which essential content remains visible. The project already maps these values to tokens; the gameplay padding and the tray scroll affordance must continue to use those tokens after the layout refactor. Source: [CSS Environment Variables Module Level 1](https://www.w3.org/TR/css-env-1/#safe-area-insets).

### Test geometry and reachability, including touch

Playwright can emulate viewport, screen and touch capability. Regression coverage should force counts 1–8 plus a defensive 12, inspect all card/piece/blade rectangles, verify scroll properties, scroll the last card into view, and perform mouse and CDP-touch drags from a scrolled tray. Source: [Playwright emulation documentation](https://playwright.dev/docs/emulation).

## Resulting architecture

1. Keep the board and blade as sibling reserved regions in the gameplay grid.
2. Make the tray itself the bounded scrollport; its child grid owns all dynamic cards.
3. Derive tray columns, visible rows, card size and preview maximum from actual gameplay/tray dimensions and piece count.
4. Calculate every resting preview with one pure utility and apply it from `TrayView` after render, rotation and container resize.
5. Keep active drags in the existing fixed overlay; update the pointer controller so a vertical touch gesture can scroll before drag activation.
6. After cut reflow, highlight both fragments and reveal their cards only after interaction and layout have settled.
7. Expose an opt-in development geometry overlay and add automated overlap, containment, scroll reachability, resize-state and touch checks.

No visual theme, block material, typography or katana artwork needs to change.
