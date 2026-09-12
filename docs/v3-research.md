# V3 research — difficulty, combo presentation, premium UI

Written 2026-09-11 (Claude) before any V3 implementation. Sources are linked where a claim comes from a published guide or design article; everything marked *design reading* is our interpretation, and every number under *MIRRORBLADE plan* is a starting value to be checked by `npm run simulate`.

Reference images for this pass live in `docs/reference/v3-1..4-*.png` (current UI style to preserve, current blade to replace, target block bevel, current coral block).

---

## A. Why skilled players stop surviving in good endless puzzles

### A1. Tetris: pressure is a curve with a ceiling, not an unbounded ramp
- Guideline games raise gravity level by level until level 20 (20 G, pieces land instantly) and *then* shorten lock delay; several games (tetris.com, Tetris Ultimate) keep shortening lock delay only between levels 20 and 30, i.e. difficulty converges to a maximum rather than growing forever. [Tetris Guideline](https://tetris.wiki/Tetris_Guideline), [Marathon](https://tetris.wiki/Marathon)
- Lock delay is 0.5 s with a bounded number of move resets (15 under Extended Placement), so a stalled player cannot loop forever but is never robbed without warning. [How to Tetris](https://howtotetris.com/tetris-mechanisms/)
- *Design reading:* Tetris never changes the rules; it compresses **decision time**. The game stays fair because the ramp is explicit (the level number is on screen), gradual, and capped.

### A2. Block Blast / 1010 family: the board itself is the timer
- There is no clock. Difficulty comes from the tray: "each new batch of pieces raises the stakes… you feel the board tighten, you feel your margin for error shrink", and the game "gives clear feedback when you make the perfect move". [Deconstructor of Fun — the Post-Block Blast playbook](https://www.deconstructoroffun.com/blog/2026/1/19/from-tetris-to-block-blast-why-block-puzzles-never-stop-printing)
- Players widely *believe* the generator targets their gaps ("purposefully sending horizontal pieces when only vertical slots are open"), and it is the single most common complaint about the genre. [Block Blast tips](https://xsoneconsultants.com/blog/block-blast-puzzle-game/)
- *Design reading:* the correct difficulty lever is the **distribution of piece awkwardness over time**, published up front and never reactive to the player's specific holes. Reactive spawning is exactly what makes players feel cheated, so the brief's rule (never inspect the intended move) is also the commercially safe rule.

### A3. Match-3 / bubble games: resources get scarcer, not rules harsher
- Candy Crush escalates recognition by *magnitude*: Sweet ≥ 12 candies or 4 cascades, Tasty ≥ 18 / 6, Delicious ≥ 24 / 8, Divine ≥ 30 / 10. [King Community](https://community.king.com/en/candy-crush-saga/kb/articles/536-what-are-sweet-tasty-divine-and-delicious-cascades/)
- Bubble games add pressure by lowering the ceiling / adding rows after N shots and by making the special shot (Nero's orb in Bubble Witch 3) something you charge through play, so the escape tool is *earned*, not given. [Bubble Witch 3 beginner guide](https://community.king.com/en/bubble-witch-saga/discussion/246620/bubble-witch-3-saga-beginners-guide)
- *Design reading:* the tool you rely on to survive should cost more as the run goes on, but the *rules* of the tool must not change — which is the brief's "blade recharge scaling with a cap".

### A4. What V2 simulation told us
`docs/balance-report.md`: a greedy policy with rotation + blades survives 158 placements (median 25k) and was only stopped by the tier-4 weighting we added late; without that it ran to the 400-move cap. Blade forges were arriving every ~15 moves at a flat 100 energy. The board never got "meaner" — after 5,400 points nothing changed any more.

### MIRRORBLADE plan (difficulty)
1. **DifficultyDirector** (`src/game/DifficultyDirector.ts`) produces `level ∈ [0, 1]` from score along a fixed, published curve — 0 → 2,500 → 7,500 → 15,000 → 30,000 map to 0 / 0.25 / 0.5 / 0.75 / 1.0 with smooth interpolation — plus a bounded Mirror Stress modulation (≤ +0.1) that decays when the player clears. Level is **capped at 1.0**; nothing scales past 30,000. Stages I–V are the level quantised for presentation and milestones.
2. **Blade recharge cost** = `min(220, 100 + 15·n + 5·n(n−1)/2)` where `n` = blades forged this run: 100, 115, 135, 160, 190, 220, 220… The ring always shows 0–100 % of the *current* cost; tick marks on the ring (5 → 10) and a "Charge II…" label make the change legible.
3. **Piece difficulty ratings 1–5** on every library shape; the director interpolates a weight table so the easy share falls from ~75 % at level 0 to ~15 % at level 1 — never 0 %, so relief still arrives (the brief's *hard, hard, hard, RELIEF* rhythm). Fairness substitution stays exactly as in V2.
4. **Mirror Stress** replaces the raw stall counter: +0.16 per non-clearing move after the first two, −0.35 / −0.6 / −1.0 for single / double / triple+ clears. It drives ambience, a status chip at ≥ 0.6, and Fracture's stall gate; it never blocks cells.
5. Two optional challenge systems (section D) chosen from six candidates.
6. Run milestones at 2,500 / 7,500 / 15,000 / 30,000 / 50,000 give long runs structure ("Mirror Level II…").

---

## B. Combo presentation — what actually happens in good games

### B1. Layering, not size
- "Juice it or lose it" (Jonasson & Purho, 2012) is the canonical demonstration: the same Breakout clone becomes satisfying when *many small* effects stack — squash, particles, trails, sound, screen response — each individually subtle. [GameJuice summary](https://gamejuice.co.uk/resources/juice-it-or-lose-it), [Alakajam write-up](https://alakajam.com/post/232/juice-up-your-games)
- Vlambeer's "Art of Screenshake" adds hit-stop, camera kick and impact frames — with the explicit warning that everything is scaled to the size of the event. [Design Oriented reblog](https://www.designoriented.net/blog/2015/05/26/2015526reblog-game-makers-toolkit-secrets-of-game-feel-and-juice/)
- Tetris Effect gives clears escalating names (Tetris, Ultimatris, Decahextris) and its sound design scales with the clear: "a single-line clear features a short ascending arpeggio, while a Tetris uses a longer, more triumphant chord". [Shacknews](https://www.shacknews.com/article/108550/what-are-ultimatris-perfectris-and-decahextris-in-tetris-effect), [Dinogame sound analysis](https://dinogame.gg/blog/tetris-sound-design-analysis/)
- Candy Crush's four cascade words are *tiers* of one event, each with its own voice line and text treatment, and the community reacts badly when the smallest one ("Sweet") fires on every move. [King Community thread](https://community.king.com/en/candy-crush-saga/discussion/465255/sweet-pop-up-after-every-move-in-game)

### B2. Timing that reads as one event
Across these games the strong-move sequence is: detect → a few frames of anticipation → the clear itself → title → resource meter moves → score settles, inside roughly a second, and input is back before the tail finishes. Anything that stops play for several seconds is a cutscene, not feedback.

### MIRRORBLADE plan (combo)
Tier ladder with distinct treatments, each one a superset of the previous:

| Tier | Text | Board | Katana | Energy | Audio | Camera |
| --- | --- | --- | --- | --- | --- | --- |
| Single | none | narrow sweep | – | ring moves, 4 transfer particles | glass interval | – |
| DOUBLE | small metallic word emerging from the axis | soft axis pulse | – | 8 particles | second harmonic layer | – |
| TRIPLE | larger, split reveal | stronger pulse + fragments | edge flash | 12 particles | third layer + metal | 2 px impulse |
| MAX / QUAD | premium animated type, reflection sweep along the axis | rim sweep | specular sweep | 16 particles, ring surge | full chord | 3 px impulse |
| PERFECT MIRROR / PERFECT CLEAR | board dims ~120 ms → axis flash → word → particles converge on the katana → blade flash → multiplier resolves | inhale | bright sweep | surge | crystal + metal hit | 3 px |

Timeline for a strong event: 0 ms detect · 60 ms anticipation (blocks brighten) · 120–360 ms line dissolve · 180 ms title in · 250–550 ms energy particles travel · 300–700 ms score count · ≤ 900 ms settled. Typography uses `background-clip: text` metal gradients with a one-pass sheen, mirrored split (the word is revealed outward from the axis), and never a rectangle behind it.

---

## C. Premium UI depth, scroll and ambience

- Material's elevation system uses a *small* set of shadow levels tied to interaction state (rest / hover / pressed), never per-component improvisation. [Material 3 elevation](https://m3.material.io/styles/elevation/overview)
- Apple's guidance for games keeps controls near their content and uses depth sparingly so hierarchy stays readable. [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)
- `scrollbar-color` / `scrollbar-width` style Firefox and Chromium 121+; `::-webkit-scrollbar` covers older Chromium/Safari. Both should be set so no default light scrollbar appears. [MDN scrollbar-color](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color)
- *Design reading of `v3-1-current-ui-style.png`:* the owner likes flat dark ground, muted glyphs, one pill surface (shards) and a crown accent. Depth should be added as **consistent tokens**, +10–25 %, not as bigger blurs.

### MIRRORBLADE plan (UI)
- Tokens: `--shadow-rest`, `--shadow-hover`, `--shadow-pressed`, `--inner-highlight`, `--panel-shadow`, `--shadow-inset` (recessed tracks). Every interactive surface uses exactly these; press moves the surface 1 px down and contracts the shadow; release springs back.
- Ambience: a Canvas 2D layer behind the UI with distant blurred block silhouettes, sparse motes, tiny pointer parallax on desktop, and a rare (15–35 s) katana pass that splits a drifting piece. Quality-gated; static under reduced motion.
- Themed scrollbar (10 px, recessed track, raised obsidian thumb) plus a bottom fade on scrollable bodies.
- Shop: studio spotlight + platform behind the preview; useful thumbnails for every category; card states rest / hover / selected / owned / equipped / locked.

---

## D. Additional challenge candidates (evaluated, two selected)

| Candidate | How it works | Why it adds difficulty | Player counter | Fit | Annoyance risk | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Mirror Contract** | Optional short objective offered every ~14 moves after 2,500: "Clear 2 lines in 3 moves", "Double clear within 4 moves", "Clear with a rotated piece", "Clear with a cut fragment". Reward: score + Blade Energy + shards. Failure: it lapses silently. | Pulls the player toward risky, efficient play instead of safe stacking; late contracts ask for more. | Ignore it, or plan the board for it. | Uses rotation, blades and mirroring directly. | Low — no punishment, one chip, no modal. | **Selected** |
| **Precision Cells** | Occasionally one mirrored pair of empty cells in a nearly-complete line glows. Clearing a line that includes both pays a bonus. Expires after 6 moves. | Adds a placement target that competes with the "safe" move. | Ignore, or route a piece through them. | Symmetric by construction. | Low if subtle; must never look like a blocked cell. | **Selected** |
| Pressure rounds (timed waves) | Every N moves a 20 s wave where placements must be fast. | Time pressure. | Play faster. | Overlaps Fracture; two timers is confusing. | High. | Rejected |
| Announced hard sequence | Warn that the next 3 trays are hard. | Anticipation. | Prepare space. | Cheap to add, but it is just a label on the difficulty curve. | Medium (feels scripted). | Folded into milestones |
| Score-risk cell | Place a marked cell: gamble score. | Risk/reward. | Skip. | Feels like a casino mechanic; brief forbids gacha tone. | High. | Rejected |
| Mirrored target pattern | Fill a given symmetric shape for a bonus. | Planning. | Skip. | Strong thematically, but big overlays hide the board. | Medium–high. | Deferred (possible Daily variant) |

Both selected systems are optional, announced, never RNG punishment, one chip each, and they reward the core verbs (rotate, cut, mirror-clear).

---

## E. Difficulty indicator, milestones and playtest questions
- Tetris shows the level number; Block Blast shows nothing. We show a quiet **Mirror I–V** mark under Best (five ticks + numeral) so the ramp is honest, and celebrate milestones with a short "MIRROR LEVEL III" event. No decimals anywhere.
- The playtest questions in the brief (§59) are copied into `docs/balance-report-v3.md` with the simulation figures that answer the measurable ones; the feel questions remain for human sessions.
