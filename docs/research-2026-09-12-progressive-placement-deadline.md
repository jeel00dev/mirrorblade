# Progressive Placement Deadline and Final-Five Warning

## Decision summary

MIRRORBLADE should add one deterministic placement deadline to normal gameplay. A run starts with 30 seconds to commit a polygon. The deadline shortens smoothly with score progression until it reaches 10 seconds at the existing Difficulty Director ceiling. Every successful board placement immediately clears the warning and receives a fresh full window. During the final five seconds, the board gains a restrained coral orbit line and a large `5, 4, 3, 2, 1` countdown. Expiry enters the existing katana game-over cinematic with a distinct timeout result label.

The timer must use the existing `RunClock` active-time source. Menus, hidden tabs, focus loss, ads, resize recovery, interrupted pointers, resolution animation, and the game-over cinematic already close gates on that clock. This prevents background throttling or a pause from consuming placement time.

The proposed progression is:

```text
base difficulty = DifficultyDirector.levelForScore(score), clamped 0…1
placement window = round(30 - 20 × base difficulty) seconds
```

| Score anchor | Base level | Placement window |
| ---: | ---: | ---: |
| 0 | 0.00 | 30 s |
| 2,500 | 0.25 | 25 s |
| 7,500 | 0.50 | 20 s |
| 15,000 | 0.75 | 15 s |
| 30,000+ | 1.00 | 10 s |

Using the Director's **base** score level keeps the deadline monotonic and understandable. Mirror Stress must not shorten it temporarily because that would make two runs at the same score expose different timing without a clear player-facing reason.

## Requirements and current architecture

The requested behavior has five invariants:

1. The first playable placement receives 30 seconds.
2. A successful polygon placement resets the full deadline even when it clears no line.
3. A failed drag, rotation, or katana cut does not reset it; the requested action is a board placement.
4. Only the final five seconds show the countdown and moving board-outline treatment.
5. At zero, the existing katana strike and falling polygons end the run.

The current project already contains the key timing infrastructure:

- `RunClock` reports active play milliseconds and is gated by page visibility, gameplay navigation, focus, ads, resize, pointer integrity, and the over state.
- `Game.updateTimers` is the single animation-frame update point for Overdrive and Fracture.
- `Game.commitPlacement` is the atomic success boundary; it is the only valid place to cancel the visible warning.
- `Game.endRun` owns persistent settlement and starts `GameOverCinematic`, so timeout should use that path instead of duplicating the katana sequence.
- `BoardView` already has a `.board-rim` layer used by Overdrive and Fracture. A timeout state can reuse the geometry with its own token and precedence.

## Timing model

### Use an absolute active-time deadline

W3C High Resolution Time defines a monotonic time source for duration measurement, avoiding system-clock adjustments that can move wall time backward or forward.[^1] The project already converts that source into active run time through `RunClock`. The deadline should therefore store `expiresAt = runClock.now() + windowMs` and derive every snapshot from `expiresAt - runClock.now()`.

This is safer than subtracting the frame delta because browsers can delay animation frames. It also makes exact boundary tests possible and keeps all timed systems on the same clock.

The HTML Living Standard defines page visibility as `hidden` or `visible`, fires `visibilitychange`, and notes that hidden pages can have rendering and other operations throttled.[^2] The deadline must not rely on receiving background frame callbacks. Because `RunClock` is gated when the document is hidden, returning to the tab preserves the remaining active time.

### Reset only on a committed placement

The reset belongs at the start of the committed-placement transaction, after the placement has been validated and written to the board. At that moment the final-five UI should disappear immediately. The fresh deadline should arm after the resolver returns the phase to `PLAYING`, so clear animation time does not reduce the new decision window.

A cut changes a tray piece but does not place a polygon. Resetting after a cut would let players wait indefinitely by repeatedly cutting. Rotation and invalid drops likewise do not meet the placement requirement.

### Keep specialized Fracture pressure unambiguous

Fracture already supplies a three-second warning and then an eight-second per-action deadline. It is a stricter, named late-run mode. While Fracture is warning or active, it should supersede the general placement deadline:

- clear the general deadline when Fracture warning starts;
- show only Fracture's existing blue/red status and rim;
- if the player escapes Fracture by clearing a line, arm a fresh normal placement window when resolution finishes;
- if Fracture expires, retain its current fracture game-over variant.

This avoids two simultaneous countdowns and preserves the established Fracture rules.

### Onboarding and non-play states

The first-session guided tutorial contains reading and gesture practice. The general deadline should remain disarmed until onboarding is complete, then start with the full score-based window. This keeps instructions usable while applying the rule to every subsequent normal or Daily run.

The deadline is active only during a live run and a playable phase. It is cleared when the run ends. Existing clock gates freeze it while Pause or another screen is open and during pointer/resize interruptions.

## Warning presentation

### Visual hierarchy and theme

The final-five state should use the existing OBSIDIAN MIRROR components and materials:

- reuse `.board-rim` and its conic-gradient orbit instead of adding a second effect renderer;
- use the design system's danger coral family, visually distinct from Overdrive amber and Fracture steel blue;
- show a compact engraved label, `PLACE`, and one high-contrast tabular digit centered over the board without blocking pointer events;
- size the panel and number with `clamp()` and board-relative positioning so they remain legible at desktop, portrait phone, landscape phone, and tablet sizes;
- remove the state synchronously after a valid drop so the board returns to its prior Overdrive/stress styling.

The moving rim lasts at most five seconds. WCAG's Pause, Stop, Hide guidance specifically calls out automatically moving content that lasts more than five seconds and appears beside other content.[^3] Staying within the final-five window limits distraction. The project should also keep a clear static coral rim and countdown when reduced motion is requested.

CSS Media Queries defines `prefers-reduced-motion` as the user's request for less non-essential motion.[^4] MIRRORBLADE already handles that preference globally. The timeout state needs an explicit static border color so it remains visible when the orbit animation is suppressed.

### Countdown semantics

The displayed number is:

```text
digit = ceil(remaining milliseconds / 1000)
```

The warning is visible when `0 < remaining <= 5,000`. This guarantees `5` appears as soon as the warning begins and `1` remains visible through the last fraction of a second. The UI only updates when the integer changes, avoiding unnecessary DOM work.

WAI-ARIA defines `role="timer"` as a numerical elapsed/remaining-time counter and recommends fixed-interval text updates; its implicit live-region value is `off`.[^5] The visible countdown should use one timer object with an accessible label such as “Place a polygon. 5 seconds remaining.” The large decorative digit is hidden from assistive technology so it is not announced twice. The timer's explicit `aria-live="polite"` is limited to the final-five warning, then disabled again when hidden.

### Time-limit accessibility

WCAG's Timing Adjustable guidance prefers allowing a time limit to be disabled, adjusted, or extended, while recognizing an exception when the limit is essential to the activity.[^6] This game mechanic changes the challenge and score environment, so silently extending only some runs would invalidate comparison. Practical accommodations in this implementation are:

- Pause remains available and freezes active time.
- Hidden tabs, focus loss, ads, resizes, and interrupted pointers do not consume time.
- The player receives an unambiguous five-second visual and semantic warning.
- Guided onboarding is untimed.
- Reduced motion retains the information without orbit animation.

A future non-ranked accessibility mode could provide a longer or disabled deadline, but that is a separate product decision because it changes run comparability.

## Dynamic difficulty rationale

Zook and Riedl describe dynamic difficulty adjustment as matching increasing game challenges to player ability and performance over time.[^7] MIRRORBLADE already publishes a tested, capped score curve for this purpose. Reusing its base level gives the timing rule visible anchors, avoids a second hidden difficulty model, and guarantees a lower bound.

The curve is deterministic and continuous between anchors. It should be exposed as a pure helper and tested at 0, 0.25, 0.5, 0.75, 1, malformed values, and out-of-range values. Automated puzzle-game simulation is useful for finding difficulty and score distributions,[^8] but the deadline also needs real-time browser tests because the offline simulator does not model human thinking time.

## State machine and integration design

Create a small DOM-free `PlacementDeadline` rule object with:

- `windowForLevel(baseLevel)` → whole-second value from 30,000 to 10,000 ms;
- `arm(now, baseLevel)` → stores a new absolute deadline;
- `clear()` → disarms it;
- `snapshot(now)` → `{ active, remainingMs, seconds, warning, expired, windowMs }`;
- one-shot expiry behavior so `Game.endRun('timeout')` cannot run twice.

Game integration sequence:

1. At a playable run start, arm from the current Director base level unless onboarding is active.
2. Each frame, read one deadline snapshot beside Overdrive and Fracture.
3. At final five, set the deadline HUD and `state-deadline-final` body class.
4. At zero, clear the timer and call `endRun('timeout')`.
5. On a valid placement, clear the warning immediately; after resolution/director observation, arm a fresh window using the new score-based base level.
6. On Fracture warning, clear the general timer. On a Fracture escape, arm it after the transaction.
7. On game over, restart, or leaving an active run, clear its UI and model state.

Timeout extends the reason union to `stuck | fracture | timeout`. The cinematic remains the same katana fall sequence; only the results eyebrow changes to “Time ran out.” This preserves one end-of-run authority and all existing cleanup, payout, and persistence behavior.

## Validation plan

1. Add unit coverage for the five curve anchors, clamping, whole-second rounding, arming, final-five digits, reset, clearing, and one-shot expiry.
2. Keep the existing exact scoring/shard clear browser test and add a no-clear case proving placement score is awarded while run shards and saved currency stay at zero.
3. Add browser coverage that forces the final-five state, verifies the timer/rim state, places a polygon, and confirms the warning disappears with a fresh deadline.
4. Add browser coverage that expires the deadline and verifies the katana cinematic reaches timeout results.
5. Verify the timer is frozen by Pause and hidden-tab gates using the debug snapshot.
6. Run lint, strict TypeScript, unit tests, production build, full Playwright, simulation, and required responsive captures.
7. Inspect final-five screenshots at the seven project viewports, including reduced motion, for clipping, overlap, contrast, and board readability.

## Sources

[^1]: W3C. “[High Resolution Time Level 2](https://www.w3.org/TR/hr-time-2/).” Monotonic timing and `performance.now()`. Accessed September 12, 2026.
[^2]: WHATWG. “[HTML Living Standard — Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility).” Visibility state, `visibilitychange`, and hidden-page throttling. Accessed September 12, 2026.
[^3]: W3C Web Accessibility Initiative. “[Understanding Success Criterion 2.2.2: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).” WCAG 2.2. Accessed September 12, 2026.
[^4]: CSS Working Group. “[Media Queries Level 5 — `prefers-reduced-motion`](https://drafts.csswg.org/mediaqueries-5/#prefers-reduced-motion).” Accessed September 12, 2026.
[^5]: W3C. “[Accessible Rich Internet Applications (WAI-ARIA) 1.2 — `timer` role](https://www.w3.org/TR/wai-aria-1.2/#timer).” Accessed September 12, 2026.
[^6]: W3C Web Accessibility Initiative. “[Understanding Success Criterion 2.2.1: Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).” WCAG 2.2. Accessed September 12, 2026.
[^7]: Alexander Zook and Mark Riedl. “[A Temporal Data-Driven Player Model for Dynamic Difficulty Adjustment](https://ojs.aaai.org/index.php/AIIDE/article/view/12504).” AIIDE 2012.
[^8]: Aaron Isaksen, Drew Wallace, Adam Finkelstein, and Andy Nealen. “[Simulating Strategy and Dexterity for Puzzle Games](https://gfx.cs.princeton.edu/gfx/pubs/Isaksen_2017_SSA/index.php).” IEEE CIG 2017.
