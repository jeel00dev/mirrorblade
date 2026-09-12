# Deterministic Scoring and Line-Earned Shards

## Decision summary

MIRRORBLADE should calculate score only from facts committed by the current move: the number of unique mirrored cells placed, the number of rows and columns completed together, the current consecutive-clear chain, named skill events, and the active score multiplier. Shards earned from normal play should be tied directly to cleared lines rather than inferred later from total score.

The recommended rules are:

1. A placed cell is worth 10 points. The mirrored union is counted once, so a cell on the centre axis is never double-counted.
2. Every cleared row or column is worth 100 points.
3. Every unordered pair of lines cleared in the same move adds 100 points. This produces a simple, superlinear line schedule of 100 / 300 / 600 / 1,000 points for one through four simultaneous lines.
4. Existing chain and named-skill bonuses remain explicit additions. Refraction Overdrive multiplies the complete move score after those additions.
5. Normal run shards are earned per clear as `line count × clear-tier multiplier`, where the multiplier is the same line count. A single pays 1 shard, DOUBLE pays 4, TRIPLE pays 9, and a four-line MAX pays 16. Rows and columns are equivalent lines.
6. Daily completion, achievement, and Mirror Contract rewards remain separate, explicitly labelled shard sources.

These rules remove hidden score-to-currency conversion, make identical moves produce identical rewards, and let players predict why one move is worth more than another.

## Problem definition

The game needs two related but distinct measurements:

- **Score** measures the quality and difficulty of play within a run. It drives best-score competition, Daily targets, achievements, and the published Difficulty Director curve.
- **Mirror Shards** are persistent spendable currency. For normal play, the requested source is cleared rows and columns, with stronger simultaneous clears receiving the matching clear-tier multiplier.

Conflating these values makes the shard reward difficult to predict. A score can include piece size, line clears, chain depth, Perfect Mirror, Perfect Clear, Clutch, Precision Cells, contracts, and Overdrive. Converting that aggregate score into shards at game over means two runs with the same number of cleared lines can pay different amounts for reasons that are not visible in the result label.

## Evidence from comparable scoring systems

### Reward the resolved action, not an indirect proxy

The original 2048 implementation adds the value of the tile created by each merge directly to score. The next tile is random, but the reward for a resolved merge is a deterministic consequence of the move.[^1] This separation is useful for MIRRORBLADE: piece generation may remain seeded or random while score calculation depends only on the committed board result.

OpenAI's CoastRunners example demonstrates the risk of rewarding a measurable proxy that does not match the intended objective: an agent maximized target hits instead of finishing the race, producing a higher score while violating the game's understood goal.[^2] For MIRRORBLADE, persistent currency should therefore measure the desired currency-earning action directly—clearing lines—rather than use total score as a proxy.

### Simultaneous clears should be worth more than repeated singles

The official Tetris Mobile scoring guide awards 100 for a single, 300 for a double, 500 for a triple, and 800 for a four-line clear, with further bonuses for difficult repeated actions.[^3] The exact values are specific to Tetris, but the design pattern is relevant: the score rises faster than raw line count so that constructing a multi-line clear is strategically valuable.

Research on puzzle score distributions likewise uses Tetris as an example in which maximum scoring requires clearing four rows at once. It treats the score for a fixed puzzle as determinable and warns that bonus multipliers can greatly change score distributions.[^4] This supports a formula that is deterministic, superlinear, testable, and monitored through the project's existing simulator.

The proposed pair-bonus formula is smoother than a hand-authored lookup:

```text
line score = 100L + 100 × L(L − 1) / 2
```

`L(L − 1) / 2` is the number of distinct pairs among `L` lines. Every additional simultaneous line creates another set of pairs, so the bonus has a clear explanation rather than an arbitrary table entry.

| Lines cleared together | Base | Pair bonus | Clear score |
| ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0 |
| 1 | 100 | 0 | 100 |
| 2 | 200 | 100 | 300 |
| 3 | 300 | 300 | 600 |
| 4 | 400 | 600 | 1,000 |
| 5 | 500 | 1,000 | 1,500 |

The formula works for every possible row-plus-column result without an array limit or fallback rule.

### Explainable mechanics improve the connection between action and outcome

The MDA framework defines mechanics at the level of data representation and algorithms, and describes runtime dynamics as the behavior produced when those mechanics act on player input.[^5] A scoring formula is therefore not just accounting: it changes which placements players seek. A stable formula that rewards board coverage, simultaneous clears, and consecutive clears supports deliberate planning.

A CRESST study compared minimal, absent, and elaborated explanations of game scoring. Its results do not show that explanation alone solves every learning problem, but the combined detailed-explanation and feedback condition improved measured outcomes relative to minimal or absent scoring information.[^6] The practical implication here is modest: state the formula in the Guide and expose the move reward through existing score and clear feedback.

CHI PLAY research describes instant rewards as rewards delivered when the deserving action completes and reports them in 20 of 22 studied games. It identifies immediacy, contingency, and amount as important reward properties, and describes the feedback loop between a goal and player performance.[^7] Shards should therefore be calculated at clear resolution, accumulated for the run, and reported as the result of those clears. They can still be committed to persistent currency safely when the run ends.

### Economy changes require simulation

Game economy research notes that even small numerical changes can affect progression speed and recommends testing and tuning against explicit objectives.[^8] The repository already has the correct mechanism: deterministic policies and score-band reporting through `npm run simulate`. Because score controls the Difficulty Director and Daily completion, changing the clear curve requires regenerating the balance report and comparing session length, score bands, line rates, and milestone timing.

## Existing implementation audit

The existing implementation is not random:

- `ScoreSystem.addMove` uses placed-cell count, clear classification, chain, fixed bonuses, and the current Overdrive multiplier.
- Piece generation uses seeded randomness, but the score function does not call a random source.
- `ClearResolver` deterministically reports `rows.length + columns.length` and de-duplicates intersection cells before removal.

However, three implementation details make the system harder to understand and maintain:

1. Multi-line score uses the table `[0, 0, 60, 150, 280, 450, 650]`. The values are deterministic but do not reveal a general rule.
2. Precision and contract score bypass the class interface with `this.score['score'] += ...`. This weakens the single-authority model and makes it easier for future score paths to apply multipliers inconsistently.
3. End-of-run shards are calculated from final score plus minimum, maximum, new-best, Overdrive, and Clutch adjustments. Normal shards therefore do not equal line-clearing performance.

## Proposed score algorithm

For one committed placement, define:

- `P`: unique cells occupied by the piece and its mirror.
- `L`: rows cleared plus columns cleared.
- `C`: consecutive clearing-move chain depth.
- `M`: active score multiplier, currently 1 or 2.
- `S`: named skill bonuses: Perfect Mirror, Perfect Clear, and Clutch.

```text
placement        = 10P
line base        = 100L
simultaneous     = 100 × L(L − 1) / 2
chain            = 35 × max(0, C − 1), only when L > 0
raw move score   = placement + line base + simultaneous + chain + S
awarded score    = raw move score × M
```

Precision Cell and Mirror Contract score should use a public `addBonus(amount, multiplier)` method on `ScoreSystem`. This keeps their current design while enforcing integer, non-negative, deterministic additions and applying Overdrive in one place.

### Worked examples

| Move | Calculation | Score |
| --- | --- | ---: |
| Place a mirrored two-cell domino producing four unique cells, no clear | `4 × 10` | 40 |
| Place three unique cells and clear one row | `30 + 100` | 130 |
| Place four unique cells and clear a row plus a column | `40 + 200 + 100` | 340 |
| Same double clear during 2× Overdrive | `340 × 2` | 680 |
| Place four cells, clear three lines on chain 2 | `40 + 300 + 300 + 35` | 675 |

Named skill bonuses remain visible in the breakdown and are multiplied with the rest of the move because the existing Overdrive promise is “every clear scores double.”

## Proposed shard algorithm

Let `L` be the number of rows plus columns completed by one placement. The clear tier multiplier is also `L`:

```text
normal shards from a clear = L × L
```

| Clear | Lines | Multiplier | Shards |
| --- | ---: | ---: | ---: |
| No clear | 0 | 0× | 0 |
| Single | 1 | 1× | 1 |
| DOUBLE | 2 | 2× | 4 |
| TRIPLE | 3 | 3× | 9 |
| Four-line MAX | 4 | 4× | 16 |
| Five-line MAX | 5 | 5× | 25 |

Rows and columns must have equal value because the rules present both as equivalent completion targets. A simultaneous row-plus-column clear is therefore a DOUBLE and pays 4 shards. Intersecting cells are removed once but both completed lines count, matching `ClearResolver` and lifetime line statistics.

Refraction Overdrive remains a **score** multiplier and does not multiply normal shards. DOUBLE and TRIPLE already define the requested shard multipliers through simultaneous line count. Keeping timed Overdrive out of persistent currency also makes shard calculations reproducible from the result's line-clear history.

The run accumulates these clear rewards and pays their total at game over. No-clear runs pay zero normal shards. Achievement, contract, and Daily rewards remain separate because they are explicit progression rewards with their own labels and one-time rules.

## Edge cases and invariants

- Negative, fractional, NaN, or infinite inputs must produce no exploitable score or shard values; public functions normalize to non-negative integers.
- A mirrored placement counts the union returned by `PlacementSystem`, not the source polygon cell count. Axis overlap therefore scores once.
- Multiple rows and columns detected in the same resolution are scored together.
- `MAX` is presentation for four or more lines; formulas use the actual count rather than cap at four.
- A non-clearing move resets the Symmetry Chain but still receives placement points.
- The multiplier is captured before Overdrive reacts to the current event, preserving the current rule: the move that ignites Overdrive is not retroactively doubled.
- Daily target and score-based difficulty thresholds retain their numeric values initially, then simulation determines whether tuning is required.
- Existing saved best scores remain valid because this is an intentional same-generation tuning change; the formula changes future earning, not save shape.

## Implementation and validation plan

1. Replace the multi-line lookup with pure formula helpers in `src/game/ScoreSystem.ts` and explanatory constants in `src/config/scoring.ts`.
2. Add a public score-bonus method and remove direct writes to the private score field, including debug score setup.
3. Replace end-run score conversion with a pure `shardsForClear(lineCount)` function and a run accumulator.
4. Update the Guide copy so players can see placement, line, simultaneous-clear, chain, Overdrive, and shard rules.
5. Add deterministic unit tests for singles through five-line clears, row-plus-column equivalence, Overdrive, bonuses, malformed values, and exact shard totals.
6. Add or update browser coverage for a known line clear and its end-of-run payout.
7. Run `npm run check`, `npm run simulate`, and `npm run test:e2e`; compare the regenerated balance report with the prior score distribution.
8. Capture affected Guide/gameplay/results views at required desktop, phone, landscape, and tablet sizes while preserving OBSIDIAN MIRROR tokens and components.

## Sources

[^1]: Gabriele Cirulli. “[2048 source: game_manager.js](https://github.com/gabrielecirulli/2048/blob/master/js/game_manager.js).” Original game source; `GameManager.prototype.move` adds each merged tile's value to score. Accessed September 12, 2026.
[^2]: Jack Clark and Dario Amodei, OpenAI. “[Faulty reward functions in the wild](https://openai.com/index/faulty-reward-functions/).” December 21, 2016.
[^3]: PLAYSTUDIOS Support. “[Scoring in Tetris®](https://playstudios.helpshift.com/hc/en/16-tetris-mobile/faq/2437-scoring-in-tetris/).” Tetris Mobile Help Center. Accessed September 12, 2026.
[^4]: Aaron Isaksen, Drew Wallace, Adam Finkelstein, and Andy Nealen. “[Simulating Strategy and Dexterity for Puzzle Games](https://gfx.cs.princeton.edu/gfx/pubs/Isaksen_2017_SSA/index.php).” IEEE Conference on Computational Intelligence and Games, August 2017.
[^5]: Robin Hunicke, Marc LeBlanc, and Robert Zubek. “[MDA: A Formal Approach to Game Design and Game Research](https://www.cs.northwestern.edu/~hunicke/MDA.pdf).” AAAI Workshop on Challenges in Game AI, 2004.
[^6]: Girlie C. Delacruz. “[Games as Formative Assessment Environments: Examining the Impact of Explanations of Scoring and Incentives on Math Learning, Game Performance, and Help Seeking](https://eric.ed.gov/?id=ED522834).” CRESST Report 796, June 2011.
[^7]: Kathrin Gerling et al. “[Game Dynamics that Support Snacking, not Feasting](https://www.researchgate.net/publication/336711050_Game_Dynamics_that_Support_Snacking_not_Feasting).” CHI PLAY 2019.
[^8]: Florian Rupp and Kai Eckert. “[GEEvo: Game Economy Generation and Balancing with Evolutionary Algorithms](https://arxiv.org/abs/2404.18574).” April 2024.
