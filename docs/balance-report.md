# Balance report

Generated 2026-09-11T17:18:48.076Z by `scripts/simulate-runs.ts` — 150 seeded runs per policy against the real rule modules, capped at 400 placements per run (a strong player is not expected to lose inside that). Think time per move is modelled (see policy table) so Overdrive/Fracture timing can be estimated; Clutch is time-critical and is not simulated.

Config under test: {"BLADE_ENERGY":{"single":6,"double":14,"triple":26,"max":40,"perfectMirror":14,"perfectClear":40,"clutch":24,"chainPerLink":2,"chainCap":10},"maxBlades":5,"OVERDRIVE":{"chainTrigger":3,"perfectClearTriggers":true,"durationMs":10000,"finalWarningMs":3000,"rearmRequiresChainReset":true},"FRACTURE":{"minPlacements":8,"occupancyThreshold":0.66,"stallMoves":5,"maxLegalOptions":30,"warningMs":3000,"placementWindowMs":8000,"cutResetsWindow":true,"cooldownMoves":6}}

| Policy | Median score | Mean moves | Lines/100 moves | Doubles+ /run | Blades forged /run | Blades used /run | Forced cuts /run | % moves at 5 blades | Overdrives /run | % moves at 2× | Fracture arms /run | Fracture escapes | Rotations used /run | Perfect mirrors | Perfect clears | Max chain (mean) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Greedy (rotation + blades) | 25,255 | 157.6 | 71.4 | 54.6 | 8.1 | 10.7 | 10.7 | 7.7% | 4.02 | 7.7% | 1.29 | 1.15 | 62.4 | 0.00 | 0.04 | 3.4 |
| Casual (30% random) | 10,955 | 73.0 | 59.4 | 21.6 | 2.9 | 5.5 | 5.5 | 1.0% | 1.07 | 3.4% | 1.09 | 0.91 | 30.6 | 0.00 | 0.01 | 2.7 |
| Greedy without rotation | 7,435 | 52.7 | 53.8 | 13.6 | 1.7 | 4.5 | 4.5 | 0.0% | 0.53 | 3.2% | 0.76 | 0.60 | 0.0 | 0.00 | 0.00 | 2.5 |
| Greedy without blades | 4,305 | 32.9 | 44.7 | 7.8 | 0.8 | 0.0 | 0.0 | 4.8% | 0.41 | 3.3% | 0.27 | 0.20 | 9.2 | 0.00 | 0.01 | 2.0 |
| Random | 2,335 | 27.0 | 28.1 | 4.1 | 0.2 | 3.0 | 3.0 | 0.0% | 0.02 | 0.2% | 1.31 | 1.01 | 13.2 | 0.00 | 0.00 | 1.3 |

## Readings

- **Rotation vs blades:** greedy with rotation and blades reaches a median 25,255; without rotation 7,435; without blades 4,305. Blades still matter after rotation if the with-blades score and run length exceed the no-blades run: 157.6 vs 32.9 moves.
- **Forced cuts** (no placement possible without a cut) per greedy run: 10.72 — each one is a run the blade extended.
- **Hoarding:** greedy spends 7.7% of moves at the 5-blade cap; casual 1.0%.
- **Overdrive** ignites 4.02× per greedy run (7.7% of moves at 2×) and 1.07× per casual run.
- **Fracture** arms 1.29× per greedy run and 1.09× per casual run; escapes 0.91× per casual run.

## Decisions (2026-09-11)

1. **Rotation stays, and it is the biggest lever in the game** — a greedy player scores 3–5× more with rotation than without (25,255 vs 7,435 median). That is intended: rotation is the control the brief asked for. To stop it flattening the late game, Endless ramps every 1,800 points (was 2,200) and beyond tier 3 the awkward pentominoes get heavier while singles get lighter (`PieceGenerator.weightFor`); this alone brought the expert median down from 39k/241 moves to 25k/158 moves without touching casual play.
2. **Blades remain essential after rotation.** Without blades the same greedy player dies in ~33 moves; with them it survives ~158. Every one of its ~11 cuts per run is a forced cut — the blade is the only escape from a dead tray — so cutting still matters for every player.
3. **Blade Energy gains were cut ~20 %** (single 8→6, double 18→14, triple 30→26, max 45→40, chain 3→2 per link capped at 10). Before: a strong player sat at the 5-blade cap for half its moves. After: 7.7 % for the strong player, 1 % for a casual player, ~3 forged blades per casual run. Banking keeps the meter at 100 while full and redeems it on the next cut, so nothing earned is thrown away.
4. **Overdrive** ignites about once per casual run (every ~70 moves) and ~4× per expert run; 3–8 % of moves are played at 2×. That is rare enough to feel earned and frequent enough that most sessions see it. Chain-3 trigger unchanged.
5. **Fracture** thresholds raised (occupancy 0.60→0.66, stall 4→5, legal options ≤30, cooldown 3→6 moves). Before: armed every ~30 moves, which reads as nagging. After: ~1.1× per casual run and ~1.3× per expert run, escaped 84 % of the time by the casual policy — the rest ended as normal dead-board losses, never as timeouts (the policies always act inside the 8 s window, as a human will).
6. **Perfect Mirror (the axis column clearing) never occurred in 750 simulated runs.** It is kept as a rare showpiece with its own achievement, not as a routine tier; its energy bonus is therefore not a balance concern. Consider a softer sibling event later if players never see it.
7. **Clutch cannot be simulated** (it is a sub-second timing event). Its threshold is 1,000 ms and its reward (+200 score, +24 energy) is deliberately generous because it is rare.
8. **Session shape:** casual ≈ 73 placements ≈ 4–5 minutes, median 11k; expert ≈ 158 placements, median 25k. Random play ends in ~27 moves — the game does not survive button-mashing, which is what makes the skill signals meaningful.
