# V2 research and design conclusions

Researched 11 September 2026, before interface implementation. Sources establish mechanics/principles; proposed MIRRORBLADE tuning is our design hypothesis, not a claim of published research or user testing.

## 1. Supplied material reference

Sampled the original supplied 1024×1536 image using ImageMagick pixel inspection; coordinates are image pixels. Colors vary with the lighting, so samples are anchors, not entire-surface averages.

| Surface | Sample / estimate | Observation |
| --- | --- | --- |
| Background (65,100) | #1d1f26 | Neutral blue charcoal, not near-black cyan |
| Board (109,199) | #181a20 | Slightly darker than page |
| Cell face (149,172) | #23282e | Readable inset against board |
| Cell edge (123,150) | #252930 | Thin edge; stronger highlights about #3c4148 |
| Center glass (510,175) | #353940 | Modest brightness separation, low saturation |
| Cyan (216,242) | #43c1c6 | Saturated face, highlight around #72e1df, side around #278d96 |
| Coral (147,387) | #ec807b | Warm face, pale top edge, deep red lower lip |
| Amber (363,535) | #ecb758 | Golden body, cream highlight, ochre edge |
| Violet (218,679) | #9264dc | Clearly violet even on a dark board |
| Primary text (286,60) | #e4e3e0 | Warm off-white |
| Secondary text | ~#97999e | Readable, not blackened microcopy |
| Metal | ~#c3c5c3 / #818687 / #42494c | Alternating broad studio reflection bands |
| Dividers | ~#42464d | Quiet structural line |

Reference blocks are about 67px wide with ~5px gaps, ~10px planar corners, ~5px bevel and a narrow dark bottom lip. Board padding is ~18px. The face occupies most of the block: the bevel supports color rather than replacing it. Empty cells have a weaker version of the same corner language. Buttons are deep rounded squares; score dominates, best is subordinate. Whitespace separates board/tray/blade, not every label. The banner is not part of our design. Reference grid dimensions are not our rules: retain exactly 9×9.

## 2. Tetris Effect: skill changes the emotional state

What it does: line clears charge Zone; Zone temporarily changes how the playfield behaves, and clear counts receive distinct names. Its music/visuals respond to play. The official guide explains the gauge and escalating phases. [Enhance guide](https://tetriseffect.game/beginners-community-guide/), [developer GDC presentation](https://media.gdcvault.com/gdc2019/presentations/Mizuguchi_Tetsuya_MakingTetrisEffect-ive.pdf).

Why it works (design interpretation): visible buildup creates anticipation; a finite special state makes an earned peak legible. Dense board occupancy makes recovery valuable.

Learn: skill-earned 10-second Refraction Overdrive, unmistakable 2× numeral, warmer edge reflection and added harmonic rhythm. Trigger on chain 3, then a fresh chain required after expiry. Do not extend indefinitely by clearing during Overdrive.

Do not copy: falling blocks, rising gravity, Zone storage, terminology/art/sound, or constant speed pressure. MIRRORBLADE remains primarily a planning puzzle.

## 3. Candy Crush: a hierarchy of reward, with limits

What it does: named escalating celebrations recognize strong outcomes. A historical Sugar Track explicitly connected combo recognition to reward progress. [King's system explanation](https://community.king.com/en/candy-crush-saga/discussion/246575/candy-crush-sugar-track-is-here/p1). More recent official-community feedback reports discomfort when celebrations cover counters, flash, or appear too often. This is qualitative feedback, not a representative survey. [King feedback thread](https://community.king.com/en/candy-crush-saga/discussion/590443/who-wants-to-see-the-new-flashing-divine-graphics/p1).

Why it works: stronger outcomes have a distinct audiovisual signature and a visible consequence. Why excess fails: repeated full-screen effects mask decisions and become noise.

Learn: single clear gets a sweep, double/triple/max receive brief callout plus increasing energy. One prioritized headline per move, with secondary badges for perfect/chain; never stacked blocking banners. Keep ordinary moves quiet. No random cascade simulation.

Do not copy: candy art, voice lines, level economy, timed purchases, reward-loss pressure or flashing rainbow overlays.

## 4. Bubble Witch 3: convert successful actions into an optional tool

What it does: destroyed bubbles charge Nero's special orb; players can save it and aim before committing. A visible move counter communicates finite opportunity. [King beginner guide](https://community.king.com/en/bubble-witch-saga/discussion/246620/bubble-witch-3-saga-beginners-guide).

Why it works: reward progress is directly connected to play; holding a tool preserves agency; predictive aiming removes accidental failure.

Learn: energy sits immediately beside the blade, never buys score advantage, and is earned by clears. Cap charges at 5; bank at most 100 energy when full, redeem only when a slot opens. A blade remains useful when rotation cannot reduce area or separate occupied constraints. Fracture must telegraph a clear escape condition.

Do not copy: bubble physics, cats, purchasable boosters, lives or a move counter. No unsupported claim that all bubble games use timed fever; our short Overdrive and pressure phase are original adaptations.

## 5. Game UI, access and retention

Apple's game-specific design talk recommends clear text and practical touch target sizes, including 44-point default mobile targets. [Design advanced games](https://developer.apple.com/videos/play/wwdc2024/10085/). The UI guidance stresses alignment, native proportions and controls close to their content. [Design guidance](https://developer.apple.com/design/tips/). Game Accessibility Guidelines recommends quick start without deep menu navigation. [Quick start guidance](https://gameaccessibilityguidelines.com/allow-the-game-to-be-started-without-the-need-to-navigate-through-multiple-levels-of-menus/).

Learn: one obvious Play action; 44 CSS px minimum controls; familiar hierarchy with limited font/radius/spacing families. Full screens rather than nested modal walls. First CrazyGames session still goes directly into playable onboarding; local/returning sessions get Home. Retention comes from mastery, cosmetic goals, daily practice and achievements, not withholding play.

Generic-looking UI is not caused by a tool: it comes from unresolved hierarchy. Avoid an equal grid of outlined cards, scattered pills, tiny tracked labels, arbitrary neon/glow and inconsistent icon weights. Hero objects and primary actions must have more visual weight than navigation.

## 6. Proposed balance and fairness, to be checked by simulation

- Rotation: free 90° taps, all fragments included; legal move analysis checks distinct orientations.
- Blade energy: clear 8/18/30/45; chain bonus +3 per link after first capped +12; Perfect Mirror +16, Perfect Clear +40, Clutch +24. Perfect Mirror means a row AND a mirrored non-center column pair in one move; simply mirroring a normal move is not a bonus.
- Stored blades: 3 initially, max 5, energy capped at 100 while full. This slows farming without discarding the next earned charge.
- Overdrive: chain 3, 10 active seconds, 2× all move score. Entry move uses prior multiplier. No retrigger until chain resets; last three seconds signaled gently.
- Fracture: at least 10 placements, tutorial complete, occupancy ≥68%, 4 non-clears, 1–20 legal orientation/anchor opportunities. A 3-second warning precedes 8 active seconds per placement. No trigger when no legal placement exists. A successful cut resets the timer too, preserving the signature rescue tool. Any line clear escapes; 3-move cooldown. Clutch <1 second, +200 score and +24 energy. These initial values are deliberately less punishing than an unannounced five-second deadline.
- One active clock pauses for menus, ads, hidden tabs, resize, pointer interruption and WebGL loss. Long scheduling stalls do not consume the player’s reaction allowance.
- Daily uses a UTC date and a board-independent fixed balanced sequence. Endless keeps adaptive fairness. Daily comparisons are versioned because V2 rules changed.

## 7. Platform recheck

Official docs still specify HTML5 SDK v3 loaded before game code and awaited initialization. Basic Launch forbids ads. Use SDK data where configured and local fallback outside platform; only SDK ads, with balanced lifecycle restoration. Relative assets; mobile initial target ≤20 MB; total limit 250 MB/1500 files. Chrome/Edge required; Safari and 4 GB Chromebook performance need device testing. [SDK introduction](https://docs.crazygames.com/sdk/intro/), [technical requirements](https://docs.crazygames.com/requirements/technical/), [data](https://docs.crazygames.com/sdk/data/), [ads](https://docs.crazygames.com/sdk/video-ads/), [game events](https://docs.crazygames.com/sdk/game/).
