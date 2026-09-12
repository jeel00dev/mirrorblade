# Contributing to MIRRORBLADE

Thanks for helping. This is a small TypeScript + Vite project with no backend; everything you need runs locally.

## Setup

```bash
npm install
npx playwright install chromium   # once, for the browser tests
npm run dev                       # http://localhost:5173
```

## Before you open a pull request

```bash
npm run check      # lint (0 warnings) + unit tests + production build
npm run test:e2e   # Playwright: input, timers, navigation, 16 viewports
```

Both must pass. If you touch anything visual, run `npm run capture` with the dev server up and look at the screenshots in `docs/qa/v3/` at the phone sizes as well as desktop.

## Where things live

- Rules (pure TypeScript, unit tested): `src/game/`, tunables in `src/config/`.
- Coordinator: `src/core/Game.ts` — the model commits first, presentation follows.
- Rendering: `src/render/` (DOM blocks, Canvas effects, the Three.js katana, ambience).
- Screens and HUD: `src/ui/`. Styles: `src/styles/` — use the tokens in `tokens.css`, do not invent shadows or spacing.
- Working notes, research, design system, bug tracker, balance reports and QA captures: `docs/` (start with `docs/README.md` and `docs/HANDOFF.md`).

## House rules

- Keep the visual identity (dark obsidian, muted glyphs, restrained depth). Compare against `docs/reference/` before changing a material.
- Difficulty must come from the published curve in `src/config/difficulty.ts`; never inspect the player's intended move or generate a tray to block them. After any balance change run `npm run simulate` and commit the updated `docs/balance-report-v3.md`.
- Every gameplay system needs a deterministic unit test; every screen or input change needs a Playwright test or an updated capture.
- Log notable bugs in `docs/BUGS.md` and changes in `docs/CHANGELOG_V3.md`; keep `docs/IMPLEMENTATION_STATUS.md` honest.
- No third-party art or audio; everything is generated in code (see `art/asset-manifest.json`). If you add an external asset, record it in `docs/third-party-assets.md` with its license.
