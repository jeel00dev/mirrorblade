# CrazyGames Basic Launch — compliance audit

Audited 2026-09-13 (Claude) against the current CrazyGames documentation. Sources: [Requirements intro](https://docs.crazygames.com/requirements/intro/), [Technical](https://docs.crazygames.com/requirements/technical/), [Gameplay](https://docs.crazygames.com/requirements/gameplay/), [Quality guidelines](https://docs.crazygames.com/requirements/quality/), [SDK setup](https://docs.crazygames.com/sdk/intro/), [SDK game module](https://docs.crazygames.com/sdk/game/), [Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/).

## What Basic Launch is

- Go live without customisation; the SDK is optional; **monetisation is disabled** (ads are ignored even if integrated). External ad networks and external login systems are not allowed.
- The stage ends after **≥ 7 days live and ≥ 500 plays**; progression to Full Launch is decided on average playtime, conversion to gameplay and retention benchmarked against the platform.
- Full Launch later requires the SDK with `gameplayStart`, landing directly in gameplay, ads through the SDK (working with AdBlock) and account integration.

## Checklist — rule → status in MIRRORBLADE

| Rule (source) | Status | Where |
| --- | --- | --- |
| Initial download ≤ 50 MB (≤ 20 MB for the mobile homepage), total ≤ 250 MB, ≤ 1 500 files (Technical) | ✅ 860 KB total, 4 asset files; ~210 KB gzipped over the wire | `dist/` after `npm run build` |
| Only relative paths, `index.html` at the archive root (Technical) | ✅ `base: './'` | `vite.config.ts` |
| SDK v3 script in `<head>`, `await SDK.init()` during loading, before gameplay (SDK setup) | ✅ init with a 4 s timeout on the boot screen | `index.html`, `src/main.ts`, `platform/CrazyGamesAdapter.ts` |
| Do not use the SDK outside `local` / `crazygames` (`disabled` throws) (SDK setup) | ✅ **added**: `environment === 'disabled'` skips init; every call is guarded and try/caught | `CrazyGamesAdapter.init` |
| Game must boot and play if the SDK script is blocked (AdBlock) | ✅ e2e aborts the script and plays | `e2e/crazygames.spec.ts` |
| `gameplayStart` on play / resume / new run; `gameplayStop` on pause, menus, game over; **never on focus loss** (SDK game module) | ✅ start in `showGameplay` + `startRun`, stop in `leaveGameplay` (pause, Home, Settings) and `endRun`; blur / visibility only gate the clock | `core/Game.ts`; e2e asserts the sequence |
| `loadingStart` / `loadingStop` around the initial load (SDK game module) | ✅ `loadingStart` right after init, `loadingStop` when the first screen shows | `main.ts`, `Game.start` |
| `happytime` sparingly, major moments only | ✅ only on a new best score ≥ 1 500 | `Game.endRun` |
| `reportGameCompletedPercentage` — endless games define their own criteria (SDK game module) | ✅ **added**: Mirror Level milestones report 20 / 40 / 60 / 80 / 100 %, monotonic per run | `Game.onMilestone`, `CrazyGamesAdapter.reportCompletion` |
| Honour `settings.muteAudio` (overrides in-game toggle) and settings changes | ✅ observer → `AudioManager.setPlatformMuted` | `Game` constructor |
| Data Module for progress when available, local storage otherwise | ✅ probe once, fall back | `main.ts`, `platform/StorageAdapter.ts` |
| Ads disabled in Basic Launch | ✅ `GAMEPLAY_FLAGS.adsEnabled = false`; adapter settles every request | `config/gameplay.ts` |
| No custom fullscreen button (Gameplay) | ✅ none (e2e asserts) | — |
| No cross-promotion / external links; app-store links forbidden (Gameplay) | ✅ no `<a href>` anywhere (e2e asserts); About has no links | `ui/screens/InfoScreens.ts` |
| PEGI 12, audience 13+ (Gameplay) | ✅ abstract puzzle, no violence, no chat, no user content | — |
| English localisation mandatory (Gameplay) | ✅ `lang="en"`, all copy English | `index.html` |
| Legible at DPR 1 at 907×510, 1216×684, 1366×768, 1920×1080, 800×450, 1080×607 (Gameplay) | ✅ captured and reviewed 2026-09-13; layout tests cover 22 sizes | `qa/crazygames/`, `e2e/responsive.spec.ts` |
| Physics/timers consistent at 144/165 Hz (Gameplay) | ✅ `RunClock` and every animation use elapsed time, not frame counts | `game/RunClock.ts`, render loops |
| Landscape gameplay on desktop; portrait allowed (Technical) | ✅ both layouts; orientation set in the portal | `render/Layout.ts` |
| Touch: prevent magnifier / context menu, `user-select: none` with prefixes (Technical) | ✅ `user-select` + `-webkit-touch-callout` in `base.css`; **added** `contextmenu` suppression on the game root | `styles/base.css`, `Game` constructor |
| iOS AudioContext `interrupted` state: resume on a user gesture (Technical) | ✅ **fixed**: `unlock()` and `setSuspended(false)` resume whenever the state is not `running` (previously only `suspended`) | `audio/AudioManager.ts` |
| Safe areas in the CrazyGames app fullscreen (Technical) | ✅ `env(safe-area-inset-*)` on every screen | `styles/tokens.css`, `screens.css` |
| Device pixel ratio managed by the platform; be careful with DPR (Technical) | ✅ quality profiles cap DPR at 1 / 1.5 / 2 | `config/gameplay.ts` |
| Chromebook 4 GB / Safari performance (Technical) | ✅ Low quality profile (no ambience, DPR 1, 24 particles); one WebGL context for the katana only | `config/gameplay.ts` |
| New users land in gameplay directly or with ≤ 1 click (Quality) | ✅ first session boots straight into a guided run; returning players: Home → Play (one click) | `Game.start` |
| Onboarding inside gameplay, skippable, visual (Quality) | ✅ three-step in-run tutorial with "Skip" | `Game.showTutorial` |
| Avoid reserving Escape (exits fullscreen) and Ctrl/Cmd+W (Quality) | ⚠️ Escape still pauses / goes back as a convenience, but `P` and on-screen buttons are the documented controls; nothing depends on Escape | README, Guide |
| Personal data → privacy notice (Requirements) | ✅ none collected beyond SDK events; About says so | `InfoScreens.buildAboutScreen` |
| Sitelock (Technical, optional) | — not implemented on purpose: it must whitelist every CrazyGames web and app origin and adds risk for no Basic Launch benefit | — |
| Portal metadata: description, controls, covers (Requirements) | ⏳ owner task at upload: description + controls text (below), 16:9 / portrait covers | — |

## Portal copy (ready to paste)

**Description.** MIRRORBLADE is a precision mirror block puzzle. Every piece you place is reflected across the glass column at the centre of a 9×9 board. Rotate pieces, cut them with the katana to fit awkward gaps, clear rows and columns to forge new blades, ignite Refraction Overdrive for 2× score and escape Fracture before the mirror breaks. Endless mode with a rising difficulty curve, a Daily Mirror calendar puzzle, and a shop of block sets, boards, katanas, effects and sounds.

**Controls.** Mouse / touch: drag a piece onto the board; tap a piece to rotate; drag a piece onto the katana to cut it. Keyboard: `R` rotate, `P` pause.

## Changes made in this audit

- `CrazyGamesAdapter.init` skips the SDK when `environment === 'disabled'`.
- `reportGameCompletedPercentage` on Mirror Level milestones (20 % steps, reset per run).
- Context menu suppressed inside the game root (touch long-press).
- iOS `interrupted` AudioContext state resumes on the next gesture / on tab return.
- `e2e/crazygames.spec.ts`: SDK lifecycle order, blocked-script boot, disabled environment, no links / fullscreen control, context menu, `lang`.
