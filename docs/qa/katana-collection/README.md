# Katana collection validation

The five original designs were implemented on `ui/shop` after the sourced research in `../../research-2026-09-12-katana-collection.md`.

## Automated checks

- `npm run check`: passed; zero lint warnings, 85 unit tests, strict TypeScript and production build.
- `npm run test:e2e -- --workers=1`: all 25 tests passed. Includes five new collection tests for purchasing/equipping all five blades, save reload, preview cleanup, Collection/default restoration, animation holds and controls, hidden-document gating, reduced motion, GPU resource stability and phone/keyboard interaction.
- `git diff --check`: passed (Git reports normal LF/CRLF normalization notices on Windows).
- Production assets: CSS 92.16 kB (18.28 kB gzip); app JS 194.87 kB (59.50 kB gzip); Three.js chunk 524.65 kB (133.22 kB gzip).

An earlier browser run was interrupted by development-server reloads while code was being refined, and the first new persistence assertion incorrectly assumed a default equipped ID was always explicitly serialized. The assertion now recognizes the existing implicit default. The final stable-code browser run passed all 25 tests, including the unchanged Fracture timer test.

## Model and resource budgets

| Blade | Saved ID | Model triangles | Material batches |
| --- | --- | ---: | ---: |
| Shoshin | surgical-chrome | 10,612 | 8 |
| Kage | black-titanium | 11,508 | 7 |
| Shiosai | frost-blade | 12,180 | 8 |
| Raimei | prism-edge | 12,176 | 8 |
| Akatsuki | golden-edge | 14,740 | 8 |

All models remain below the researched 15k triangle budget. At rest, the scene uses 8–9 draw calls including the floor shadow. A flourish adds at most three effect draw calls. `measurements.json` records 35 full-sword render samples across seven viewports. The shared renderer retains five textures and 12–13 geometries according to design; switching through the five models repeatedly does not accumulate resources. These are structural/browser measurements, not physical-device frame-time claims.

## Capture inventory

- `shop-{tier}-{id}-{width}x{height}.png`: all five shop designs, 35 captures.
- `home-{tier}-{id}-{width}x{height}.png`: equipped Home identity, 35 captures.
- `gameplay-{tier}-{id}-{width}x{height}.png`: equipped gameplay dock, 35 captures.
- `detail-{tier}-{id}-1366x768.png`: all five fittings close-ups, 5 captures.
- `motion-{id}-{width}x{height}.png`: all five active signature effects on desktop and phone, 10 captures.
- `motion-video/katana-loops-1366x768.webm` and `motion-video/katana-loops-390x844.webm`: recorded live Home animation, pause and recurrence for each design.
- `../katana-regression/`: the contribution guide's standard `npm run capture` output for the wider game screen family; all 112 captures completed across seven viewports with no page errors.

Collection capture sizes: 1920×1080, 1366×768, 1280×720, 390×844, 430×932, 844×390 and 768×1024. The capture script reports no page errors. Motion recording reports no page errors.

## Visual review

Reviewed the five desktop shop and close-up designs during refinement, representative equipped Home/gameplay views, all seven viewport families, and the active Home effects on desktop and phone. The original obsidian panels, resin blocks, gold primary action, system typography and raised controls remain consistent. Full-sword previews fit inside the stage above the controls; fittings inspection intentionally crops the blade tip. The physical wrap was refined from detached-looking bands into conforming ribbons. Steel shading was smoothed while retaining the ridge and hamon.

Phone and short landscape catalogs intentionally scroll vertically; the ordered blade row scrolls horizontally on narrow phones. This keeps preview, details and purchase controls readable without shrinking their hit targets. Browser tests verify all five cards and inspection controls are reachable. The page itself does not overflow horizontally. A portion of lower content may be below the fold in a screenshot, with the existing scroll fade indicating more content.

Still to assess with people/devices: aesthetic preference and purchase appeal, physical midrange-phone frame rate, and whether the five craft tiers are recognized without labels. No claim is made that every player will want all five or that an automated desktop browser establishes mobile performance.

## Reproduce

Run `npm run dev`, then:

```sh
npm run check
npm run test:e2e -- --workers=1
node scripts/capture-katanas.mjs
node scripts/capture-katana-motion.mjs
npm run capture -- http://127.0.0.1:5173 docs/qa/katana-regression
```

Capture scripts seed test inventory inside their isolated browser contexts. They do not modify the player's existing browser save or grant items in the game build.
