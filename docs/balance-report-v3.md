# Balance report (V3)

Generated 2026-09-11T18:36:03.517Z by `scripts/simulate-runs.ts` — 150 seeded runs per policy against the real rule modules, capped at 1500 placements per run (a strong player is not expected to lose inside that). Think time per move is modelled (see policy table) so Overdrive/Fracture timing can be estimated; Clutch is time-critical and is not simulated.

Config under test: {"BLADE_ENERGY":{"single":6,"double":14,"triple":26,"max":40,"perfectMirror":14,"perfectClear":40,"clutch":24,"chainPerLink":2,"chainCap":10},"maxBlades":5,"OVERDRIVE":{"chainTrigger":3,"perfectClearTriggers":true,"durationMs":10000,"finalWarningMs":3000,"rearmRequiresChainReset":true},"FRACTURE":{"minPlacements":8,"occupancyThreshold":0.66,"stallMoves":5,"maxLegalOptions":30,"warningMs":3000,"placementWindowMs":8000,"cutResetsWindow":true,"cooldownMoves":6}}

| Policy | Median score | Mean moves | Lines/100 moves | Doubles+ /run | Blades forged /run | Blades used /run | Forced cuts /run | % moves at 5 blades | Overdrives /run | % moves at 2× | Fracture arms /run | Fracture escapes | Rotations used /run | Perfect mirrors | Perfect clears | Max chain (mean) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Greedy (rotation + blades) | 25,760 | 127.7 | 74.5 | 45.0 | 4.4 | 8.1 | 8.1 | 6.6% | 3.10 | 7.9% | 1.12 | 1.02 | 54.9 | 0.00 | 0.04 | 3.4 |
| Casual (30% random) | 9,970 | 65.3 | 60.5 | 20.1 | 2.2 | 5.2 | 5.2 | 1.7% | 1.21 | 3.7% | 1.07 | 0.83 | 30.3 | 0.00 | 0.03 | 2.7 |
| Greedy, director frozen at level 0 | 91,905 | 704.8 | 66.7 | 219.0 | 15.5 | 19.7 | 19.7 | 18.7% | 12.94 | 6.0% | 5.48 | 5.35 | 242.6 | 0.00 | 0.47 | 3.7 |
| Greedy without rotation | 5,975 | 39.1 | 51.0 | 10.3 | 1.1 | 3.9 | 3.9 | 0.0% | 0.44 | 3.4% | 0.61 | 0.43 | 0.0 | 0.00 | 0.00 | 2.2 |
| Greedy without blades | 3,110 | 25.9 | 43.1 | 6.4 | 0.6 | 0.0 | 0.0 | 5.8% | 0.30 | 2.7% | 0.27 | 0.18 | 8.9 | 0.00 | 0.01 | 1.7 |
| Random | 1,900 | 19.8 | 26.2 | 2.9 | 0.1 | 2.7 | 2.7 | 0.0% | 0.02 | 0.3% | 1.00 | 0.67 | 10.7 | 0.00 | 0.00 | 1.2 |

## Readings

- **Rotation vs blades:** greedy with rotation and blades reaches a median 25,760; without rotation 91,905; without blades 5,975. Blades still matter after rotation if the with-blades score and run length exceed the no-blades run: 127.7 vs 39.1 moves.
- **Forced cuts** (no placement possible without a cut) per greedy run: 8.11 — each one is a run the blade extended.
- **Hoarding:** greedy spends 6.6% of moves at the 5-blade cap; casual 1.7%.
- **Overdrive** ignites 3.10× per greedy run (7.9% of moves at 2×) and 1.21× per casual run.
- **Fracture** arms 1.12× per greedy run and 1.07× per casual run; escapes 0.83× per casual run.

## Difficulty progression by score band (greedy and casual policies)

| Band | Samples | Legal options (mean) | Piece rating (mean) | Occupancy | Stall streak (mean) | Moves per forge | Recharge cost (mean) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Greedy (rotation + blades)** | | | | | | | |
| early <2.5k | 2596 | 104.0 | 2.25 | 37.2% | 2.5 | ∞ | 100 |
| mid 2.5–7.5k | 3761 | 83.6 | 2.57 | 39.7% | 1.5 | 15.3 | 115 |
| late 7.5–15k | 4704 | 75.8 | 2.86 | 40.5% | 1.4 | 30.0 | 150 |
| hard 15–30k | 5974 | 70.7 | 3.09 | 40.8% | 1.3 | 30.6 | 204 |
| max 30k+ | 2114 | 67.0 | 3.25 | 40.9% | 1.3 | 38.4 | 220 |
| **Casual (30% random)** | | | | | | | |
| early <2.5k | 2686 | 95.1 | 2.26 | 39.1% | 2.6 | ∞ | 100 |
| mid 2.5–7.5k | 3360 | 71.3 | 2.56 | 44.1% | 1.6 | 14.7 | 115 |
| late 7.5–15k | 2507 | 63.1 | 2.83 | 44.9% | 1.5 | 37.4 | 149 |
| hard 15–30k | 1208 | 63.3 | 3.04 | 43.8% | 1.4 | 32.6 | 202 |
| max 30k+ | 40 | 60.5 | 3.45 | 41.9% | 1.9 | 40.0 | 220 |

## Game-over score distribution

| Policy | p10 | p25 | median | p75 | p90 | max | runs hitting the 1500-move cap | max stage reached (mean) | contracts offered / completed | precision spawned / hit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Greedy (rotation + blades) | 14,070 | 18,920 | 25,760 | 33,410 | 42,330 | 70,115 | 0 | 4.2 | 5.8 / 3.3 | 6.8 / 4.2 |
| Casual (30% random) | 3,295 | 6,405 | 9,970 | 15,535 | 22,985 | 34,905 | 0 | 2.9 | 2.5 / 1.4 | 2.3 / 1.2 |
| Greedy, director frozen at level 0 | 32,690 | 61,350 | 91,905 | 170,990 | 239,595 | 256,420 | 10 | 4.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| Greedy without rotation | 1,820 | 3,255 | 5,975 | 7,325 | 9,705 | 14,800 | 0 | 2.1 | 1.0 / 0.4 | 0.6 / 0.2 |
| Greedy without blades | 520 | 1,340 | 3,110 | 5,790 | 9,160 | 15,390 | 0 | 1.7 | 0.5 / 0.2 | 0.3 / 0.1 |
| Random | 580 | 1,060 | 1,900 | 2,780 | 3,395 | 6,160 | 0 | 1.3 | 0.1 / 0.0 | 0.0 / 0.0 |

Curve under test: [{"score":0,"level":0},{"score":2500,"level":0.25},{"score":7500,"level":0.5},{"score":15000,"level":0.75},{"score":30000,"level":1}]; recharge {"base":100,"step":15,"curve":5,"max":220}

## Decisions (2026-09-12, V3)

1. **The Difficulty Director is what ends expert runs.** With the director frozen at level 0 the greedy policy reaches a median 91,905 and 10 of 150 runs never end inside 1,500 placements; with the live curve every run ends (median 25,760, p90 42,330, max 70,115). Each band is measurably harder than the last: legal placements 104 → 67, mean piece rating 2.25 → 3.25, moves per forged blade 15 → 38, recharge cost 100 → 220.
2. **There is a ceiling and it is survivable.** Level caps at 1.0 from 30,000; the best greedy run still reached 70k inside the max band, so continued survival depends on decisions, not on an ever-steeper ramp.
3. **Blade recharge scaling halves late forges.** Greedy forges 4.4 blades per run (V2: 8.1) and reaches the 220 cap by the fifth forge; time at the 5-blade cap fell to 6.6 %. Early game is unchanged (first blade still costs 100).
4. **Piece distribution keeps relief.** Easy pieces (rating ≤ 2) are ~70 % of the draw at level 0 and ~20 % at level 1 — never zero — so late trays still alternate hard / hard / relief.
5. **Mirror Contracts** are offered every ~14 moves after 2,500 (3–6 per run) and completed 56–57 % of the time by policies that do not plan for them; humans who chase them should do better. One chip, no punishment.
6. **Precision Cells** spawn 2–7 times per run and are hit 52–62 % of the time incidentally; the bonus (+150 / +12 energy) is sized so aiming for them is worth a slightly worse placement, not a reckless one.
7. **Overdrive** ignites ~1.2× per casual run and ~3× per expert run; **Fracture** arms ~1.1× per run and is escaped 78–91 % of the time — both unchanged in intent from V2.
8. **Session shape:** casual ≈ 65 placements ≈ 4 minutes, median ~10k (V2: 73 / 11k); expert ≈ 128 placements, median ~26k. If human tests find the 0–2.5k band harsh, soften `DIFFICULTY.pieceWeights` row 3 at level 0 before touching the curve.
9. **Perfect Mirror** (axis-column clear) still never occurred in 900 simulated runs; it stays a rare showpiece with its own achievement.
10. **Clutch** remains unsimulated (sub-second timing).

## Playtest questions (brief §59) — what the simulation can and cannot answer

| Question | Measurable answer | Needs a human |
| --- | --- | --- |
| Does 0–5 minutes feel fair? | Early band: 104 legal placements per tray on average, mean piece rating 2.25, first blade at 100 energy, no contracts or precision cells before 2,500. Random play still dies in ~20 moves, so the band is forgiving but not free. | Feel |
| Does 5–10 minutes become meaningfully harder? | Mid/late bands: legal placements 84 → 76, rating 2.57 → 2.86, moves per forge 15 → 30, cost 115 → 150. | — |
| Do long runs require more planning? | Hard/max bands: 71 → 67 placements, rating 3.09 → 3.25, cost 204 → 220; greedy's game-over median sits inside the hard band. | Feel |
| Are blades valuable? | Without blades the greedy policy dies at ~26 moves vs ~128; all 8 cuts per run are forced (the only legal move). | — |
| Can players still earn blades through skill? | 4.4 forges per greedy run; 2.2 per casual run. | — |
| Does earning a late blade feel rewarding? | Presentation only (NEW BLADE callout, forge burst, charge-tier label). | Yes |
| Does rotation make the game too easy? | Rotation ≈ 4× score, but the director ends rotation-equipped runs at a 26k median (V2: rotation alone ran to 129k). | Feel |
| Do hard pieces create interesting decisions? | Rating-5 shapes are 0 % of the draw at level 0 and ~16 % at level 1. | Yes |
| Does Fracture feel fair? | Arms ~1.1× per run; escaped 78–91 %; never by timeout for these policies. | Yes |
| Are combos exciting? / Does the combo UI obscure the board? | Words are 26–70 px, 520–900 ms, no boxes; the board stays visible in every capture. | Yes |
| Does background motion distract? | Alpha ≤ 9 %, ≤ 8 pieces, one cut per 15–35 s. | Yes |
| Does the katana look premium / communicate interaction? | 1.6k tris, diagonal dock pose inside the ring, slash on cut, hover spin. Software-rendered captures only. | Yes (real GPU) |
| Does the Shop feel richer? Is it still the same MIRRORBLADE UI? | `qa/v3/ui-comparison.png` keeps the flat nav; depth is tokens only. | Yes |
