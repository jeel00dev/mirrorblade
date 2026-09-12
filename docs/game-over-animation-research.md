# Game-over cinematic research

Written 2026-09-12 (Claude) before implementing `src/render/GameOverCinematic.ts`. Sources are linked; everything under *reading* is our interpretation for MIRRORBLADE, and every timing below is a starting value checked in the browser afterwards.

## 1. Hit-stop: the pause that sells the hit

- Hit-stop freezes (or nearly freezes) both attacker and target for a few frames at the instant of impact "to create the impression that something hits harder"; it gives "the eyes a few frames to register and confirm it happened". [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/Main/HitStop), [CritPoints](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)
- In Smash the freeze scales with the strength of the hit and the target shakes in place during it. [SmashWiki — Hitlag](https://www.ssbwiki.com/Hitlag)
- Capcom beat 'em ups use it on every strike and it is a large part of why those hits read as heavy. [Shane Sicienski](https://shane-sicienski.com/blog/blog-post-title-one-55pmn)
- *Reading:* 3–5 frames (50–90 ms at 60 fps) is the sweet spot; longer reads as a stutter. During the freeze the *only* things that should move are the flash and the audio. We freeze the katana canvas, the block simulation and the ambience together, and let the cut line and the impact sound land.

## 2. Slicing feedback (Fruit Ninja lineage)

- Fruit Ninja's feel comes from a fast response plus a bright trail behind the blade and a small burst *at the cut*; the prototype spent weeks purely on swipe feedback and simple trajectories rather than heavy physics. [DEV Community build-along](https://dev.to/blaze_faisal/slicing-through-code-how-i-built-fruit-ninja-541o), [Abtach guide](https://www.abtach.ae/blog/how-to-create-a-game-like-fruit-ninja/)
- *Reading:* the trail is the memory of the cut. A thin, bright line that fades in 250–500 ms communicates "a blade passed here" far better than a wide glow. Our cut line is a 2 px metallic hairline with a short amber/cyan afterimage, never a beam.

## 3. Sword timing: anticipation, then one decisive cut

- Ghost of Tsushima's standoff is built entirely on anticipation: a held pose, an opponent's tell (a cry, a feint), then a single swing that ends it. [GameWith — Standoff](https://gamewith.net/ghost-of-tsushima/article/show/20356), [Ghost wiki](https://ghostfranchise.fandom.com/wiki/Standoff)
- *Reading:* the pause *before* the cut is what makes the cut feel decisive. We hold 140 ms of near-silence (music ducked, HUD dimmed, nothing moving) before the katana enters, and the slash itself is 180 ms — faster than the eye can follow but long enough to read direction.

## 4. Board collapse and falling objects

- Tetris Effect's animations react around the well and its Connected boards "collapse down" as a combined event; nothing about the well itself disintegrates. [Tetris Effect (wiki)](https://tetris.wiki/Tetris_Effect), [Digital Trends](https://www.digitaltrends.com/gaming/tetris-effect-makes-tetris-feel-new-again/)
- *Reading:* the board must stay; the pieces leave. Blocks should behave like solid tiles that lost their grip: a short forward pop, then a fast, heavy fall with modest rotation and almost no lateral drift. Confetti physics (light, floaty, spinning) would betray the material we spent V3 establishing.

## 5. Group cohesion and staggered propagation

- Object-separation work in destruction animations reads best when pieces first move as the objects they were (a tile, a shape) and only then diverge. *Design reading, not a citation.*
- *Reading:* cells that belong to one placed polyomino share velocity and spin for the first ~140 ms, then each cell gets its own variation. Release timing follows each cell's projection onto the slash diagonal (0–140 ms total), so the sword visibly travels through the board.

## MIRRORBLADE timeline (ms from game-over detection)

| t | Event | What happens |
| --- | --- | --- |
| 0 | `CINEMATIC_START` | run locked, HUD secondary elements fade, music ducks, ambience freezes |
| 140 | `KATANA_ENTER` | katana canvas appears outside the top-right (or top-left) corner, accelerating in |
| 330 | `KATANA_SLASH_START` | 180 ms sweep across the board, edge leading, blade perpendicular to the path |
| ≈420 | `KATANA_IMPACT` | cut line snaps on, 70 ms hit-stop, impact sound, axis flash, board recoil, 2 px impulse |
| 490 | `BLOCKS_RELEASE` | per-cell forward pop 240 ms, staggered 0–140 ms by slash projection; near-line cells pop further and spark |
| ≈730 | `BLOCKS_FALL` | gravity ≈ 38 cells/s², spin ±35–125°/s, drift ≤ 0.4 cells/s; groups cohere for 140 ms |
| 1500 | `BOARD_SETTLED` | board dims, mirror axis goes dark, low glass resonance |
| 1700 | `RESULTS_REVEAL` | results overlay: score rises in, stats stagger, buttons last (≈400 ms) |
| 2100 | `CINEMATIC_END` | layer removed, katana back in the dock, phase → OVER |

Skip: any pointer or key after `KATANA_IMPACT` fast-forwards to `RESULTS_REVEAL`. Reduced motion: cut-line flash → blocks fade and drop a third of a cell → results at ≈900 ms.

Sound: duck → subtle metal/air on enter → slice + whoosh → low thump at impact → one grouped ceramic detach → two or three off-screen thuds during the fall → low glass tail at settle. No per-block sounds.
