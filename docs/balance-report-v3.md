# Balance report (V3)

Generated 2026-09-12T09:11:14.167Z by `scripts/simulate-runs.ts` — 150 seeded runs per policy against the real rule modules, capped at 1500 placements per run (a strong player is not expected to lose inside that). Think time per move is modelled (see policy table) so Overdrive/Fracture timing can be estimated; Clutch is time-critical and is not simulated.

Config under test: {"BLADE_ENERGY":{"single":6,"double":14,"triple":26,"max":40,"perfectMirror":14,"perfectClear":40,"clutch":24,"chainPerLink":2,"chainCap":10},"maxBlades":5,"OVERDRIVE":{"chainTrigger":3,"perfectClearTriggers":true,"durationMs":10000,"finalWarningMs":3000,"rearmRequiresChainReset":true},"FRACTURE":{"minPlacements":8,"occupancyThreshold":0.66,"stallMoves":5,"maxLegalOptions":30,"warningMs":3000,"placementWindowMs":8000,"cutResetsWindow":true,"cooldownMoves":6}}

| Policy | Median score | Mean shards | Mean moves | Lines/100 moves | Doubles+ /run | Blades forged /run | Blades used /run | Forced cuts /run | % moves at 5 blades | Overdrives /run | % moves at 2× | Fracture arms /run | Fracture escapes | Rotations used /run | Perfect mirrors | Perfect clears | Max chain (mean) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Greedy (rotation + blades) | 28,235 | 219.9 | 125.6 | 74.7 | 44.6 | 4.4 | 8.2 | 8.2 | 5.5% | 3.15 | 8.1% | 1.15 | 1.07 | 53.1 | 0.00 | 0.05 | 3.4 |
| Casual (30% random) | 12,865 | 99.9 | 67.7 | 62.0 | 21.2 | 2.2 | 5.5 | 5.5 | 0.9% | 1.35 | 4.3% | 1.29 | 1.15 | 32.0 | 0.00 | 0.01 | 2.9 |
| Greedy, director frozen at level 0 | 1,03,185 | 1128.5 | 712.9 | 66.7 | 221.5 | 15.7 | 19.9 | 19.9 | 18.5% | 13.15 | 6.0% | 5.53 | 5.41 | 245.3 | 0.00 | 0.47 | 3.7 |
| Greedy without rotation | 6,665 | 51.7 | 41.0 | 52.9 | 11.1 | 1.1 | 4.2 | 4.2 | 0.1% | 0.59 | 4.0% | 0.65 | 0.49 | 0.0 | 0.00 | 0.00 | 2.3 |
| Greedy without blades | 3,430 | 31.4 | 24.6 | 42.5 | 6.0 | 0.6 | 0.0 | 0.0 | 4.5% | 0.26 | 2.4% | 0.27 | 0.15 | 8.3 | 0.00 | 0.01 | 1.7 |
| Random | 2,060 | 16.8 | 21.7 | 29.9 | 3.5 | 0.1 | 3.1 | 3.1 | 0.0% | 0.04 | 0.6% | 1.03 | 0.81 | 11.7 | 0.00 | 0.00 | 1.3 |

## Readings

- **Rotation vs blades:** greedy with rotation and blades reaches a median 28,235; without rotation 6,665; without blades 3,430. Blades still matter after rotation if the with-blades score and run length exceed the no-blades run: 125.6 vs 24.6 moves.
- **Forced cuts** (no placement possible without a cut) per greedy run: 8.23 — each one is a run the blade extended.
- **Line-earned shards:** greedy earns 219.9 per run, casual 99.9, random 16.8. These exclude separately labelled achievements, contracts and Daily rewards.
- **Hoarding:** greedy spends 5.5% of moves at the 5-blade cap; casual 0.9%.
- **Overdrive** ignites 3.15× per greedy run (8.1% of moves at 2×) and 1.35× per casual run.
- **Fracture** arms 1.15× per greedy run and 1.29× per casual run; escapes 1.15× per casual run.

## Difficulty progression by score band (greedy and casual policies)

| Band | Samples | Legal options (mean) | Piece rating (mean) | Occupancy | Stall streak (mean) | Moves per forge | Recharge cost (mean) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Greedy (rotation + blades)** | | | | | | | |
| early <2.5k | 2410 | 103.4 | 2.25 | 37.5% | 2.6 | ∞ | 100 |
| mid 2.5–7.5k | 3363 | 84.5 | 2.55 | 39.5% | 1.5 | 16.5 | 112 |
| late 7.5–15k | 4284 | 76.1 | 2.85 | 40.5% | 1.4 | 23.7 | 145 |
| hard 15–30k | 6098 | 70.1 | 3.10 | 40.8% | 1.3 | 30.6 | 197 |
| max 30k+ | 2685 | 65.1 | 3.25 | 41.5% | 1.2 | 34.0 | 220 |
| **Casual (30% random)** | | | | | | | |
| early <2.5k | 2527 | 95.7 | 2.26 | 39.1% | 2.7 | ∞ | 100 |
| mid 2.5–7.5k | 3211 | 70.7 | 2.56 | 44.0% | 1.6 | 18.2 | 112 |
| late 7.5–15k | 2773 | 65.7 | 2.84 | 44.9% | 1.5 | 25.7 | 144 |
| hard 15–30k | 1608 | 61.5 | 3.05 | 44.7% | 1.4 | 30.3 | 191 |
| max 30k+ | 35 | 40.5 | 3.29 | 46.9% | 1.1 | ∞ | 220 |

## Game-over score distribution

| Policy | p10 | p25 | median | p75 | p90 | max | runs hitting the 1500-move cap | max stage reached (mean) | contracts offered / completed | precision spawned / hit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Greedy (rotation + blades) | 14,795 | 21,120 | 28,235 | 35,725 | 49,130 | 74,785 | 0 | 4.3 | 5.7 / 3.2 | 6.9 / 4.2 |
| Casual (30% random) | 4,390 | 7,055 | 12,865 | 18,775 | 25,040 | 35,865 | 0 | 3.1 | 2.6 / 1.4 | 2.5 / 1.3 |
| Greedy, director frozen at level 0 | 35,850 | 71,025 | 1,03,185 | 1,97,990 | 2,75,570 | 2,88,250 | 11 | 4.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| Greedy without rotation | 2,420 | 3,840 | 6,665 | 9,445 | 11,975 | 18,550 | 0 | 2.3 | 1.1 / 0.5 | 0.7 / 0.3 |
| Greedy without blades | 520 | 1,440 | 3,430 | 5,800 | 9,975 | 14,325 | 0 | 1.7 | 0.4 / 0.2 | 0.3 / 0.1 |
| Random | 1,020 | 1,480 | 2,060 | 3,400 | 4,455 | 8,575 | 0 | 1.4 | 0.1 / 0.0 | 0.0 / 0.0 |

Curve under test: [{"score":0,"level":0},{"score":2500,"level":0.25},{"score":7500,"level":0.5},{"score":15000,"level":0.75},{"score":30000,"level":1}]; recharge {"base":100,"step":15,"curve":5,"max":220}

## Decisions (2026-09-12 scoring revision)

1. **The formula rewards planned simultaneous clears.** The score rule is deterministic: 10 per unique placed cell, 100 per line, 100 per simultaneous line pair, fixed chain/skill bonuses, then the active score multiplier. Normal shards are line count squared.
2. **The Difficulty Director still ends expert runs.** The live greedy policy has median 28,235, p90 49,130 and max 74,785, with 0 runs reaching the 1500-move cap. Freezing the director reaches median 1,03,185 and 11 capped runs.
3. **Session length remains stable.** Greedy averages 125.6 placements and casual averages 67.7; the scoring change moves score milestones without materially extending run length.
4. **Currency now follows clear performance directly.** Mean normal-play payout is 219.9 shards for greedy, 99.9 for casual and 16.8 for random play. Human economy testing should verify time-to-purchase against the 170–360 shard katana prices.
5. **Limits:** the policies estimate strategy and progression but do not model Clutch timing, player comprehension, aesthetic satisfaction, or real-session purchase behavior.
