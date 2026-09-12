# V2 feedback matrix

One dominant callout per transaction. Score and energy are committed synchronously; effects never decide rules. Durations below are presentation targets. Reduced motion removes travel/shake/continuous pulse, preserves readable static messages and meter changes. Haptics are optional, brief and rate-limited.

| Event | Visual | Audio | Haptic ms | HUD | Score / energy | Camera | Duration |
| --- | --- | --- | ---: | --- | --- | --- | --- |
| Pickup | 1.05 lift, broader shadow | soft click | 0 | source subdued | none | fixed | 140ms |
| Rotate | quarter turn, settled footprint | ceramic tick | 4 | rotate indicator | none | fixed | 180ms |
| Valid placement | compress/settle, paired ghost→solid, axis echo | impact + stereo echo | 8 | score count-up | 10 per unique cell | fixed | 220ms |
| Invalid placement | muted coral × ghost, eased return | soft low tick | 6 | contextual reason | none | fixed | 220ms |
| Cut | seam, 90ms emphasis, sparks, two fragment arrivals | metallic shing | 12 | charge -1 | no score / no energy | fixed | 300ms |
| Single clear | anticipation then narrow sweep/dissolve | glass interval | 8 | score / energy | line100 / +8 | fixed | 360ms |
| Double | paired sweep, DOUBLE | wider chord | 12 | energy rises | multi bonus / +18 | fixed | 480ms |
| Triple | axis reflection, TRIPLE, particles | chord + metal | 15 | score emphasis | multi bonus / +30 | ≤2px if enabled | 600ms |
| Max | four+ sweep, MAX | full harmonic | 18 | strong score | multi bonus / +45 | ≤3px | 700ms |
| Perfect Mirror | split crest, PERFECT MIRROR | crystalline accent | 12 | secondary label | configured bonus / +16 | fixed | 600ms |
| Perfect Clear | board inhale, PERFECT CLEAR | crystal/metal release | 18 | strongest headline | configured bonus / +40 | ≤3px | 800ms |
| Chain increase | small link mark | rising note | 0 | Chain ×N only when ≥2 | +35/link / +3 per link capped12 | fixed | 220ms |
| Energy milestone | meter catchlight at50/75 | rising resonance | 0 | percentage | none | fixed | 300ms |
| Blade generated | meter contracts, blade brightens | distinct metal reward | 15 | +1 blade/count spring | bank overflow | fixed | 600ms |
| Overdrive start | warm rim, active axis, large restrained 2× | ambient rhythm enters | 12 | Refraction Overdrive | next moves exactly2× | fixed | 800ms |
| Overdrive final3 | timer contour drains, soft pulses | three quiet ticks | 0 | seconds visible | unchanged | fixed | last3s |
| Overdrive end | warm rim fades | rhythm releases | 0 | multiplier fades | returns1× | fixed | 600ms |
| Fracture warning | cold fractured corner marks | low bell | 0 | Clear a line to escape | none | fixed | 3 active s |
| Fracture start | pressure rim, clear numeric timer | heartbeat layer | 10 | 8s placement deadline | none | fixed | 480ms |
| Fracture ticking | subtle rim breathing, last3 contour | quiet pulse | 0 | seconds | none | fixed | active timer |
| Clutch | rim releases, CLUTCH | brief dip then success chord | 15 | relief headline | +200 / +24 | ≤2px | 800ms |
| Fracture escape | cold rim dissolves | low-to-high release | 8 | Escaped | clear rewards | fixed | 600ms |
| Game over | axis crack, board settles/dims after input stop | low glass fall | 10 | results | end payout once | fixed | 650ms |
| New best | facet crest glint | warm chime once | 8 | New best | modest end reward | fixed | 600ms |

Audio is synthesized locally, no autoplay before a gesture. All mode layers pass through master/music/SFX gains, platform mute and visibility pause. Timers do not include animation lockout or blocked interaction. Fracture cut resets timer to preserve rescue usefulness.

## V3 additions (2026-09-12)

| Event | Visual | Audio | Haptic ms | HUD | Score / energy | Camera | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Single clear (V3) | narrow sweep, 4 energy streaks to katana, ring bump on arrival | glass interval | 8 | score counts up | +6 raw energy | fixed | 360ms |
| DOUBLE (V3) | 70ms prime, metal word from axis with reflection, soft axis pulse, 8 streaks | +2nd harmonic layer | 12 | chain chip bumps | +14 | fixed | 520ms |
| TRIPLE (V3) | larger cyan-metal word, stronger pulse, 12 streaks, katana edge flash | +3rd layer + metal | 15 | — | +26 | 2px | 640ms |
| MAX (V3) | gold word 0.16em tracking, rim sweep, 16 streaks, katana specular | full chord | 18 | — | +40 | 3px | 760ms |
| PERFECT MIRROR / CLEAR (V3) | board dims 120ms → axis blaze → word → streaks converge → blade flash | crystal + metal | 18 | — | +14 / +40 | 3px | 900ms |
| Milestone | MIRROR LEVEL callout, board gold pulse, crest glint, katana gleam | rising triad | 6,18,8 | Mirror ticks advance | — | fixed | 800ms |
| Contract offered | amber chip with moves badge, first-time hint | two sparkle notes | 0 | chip | — | fixed | 220ms |
| Contract progress | chip bump, progress text | — | 0 | chip | — | fixed | 220ms |
| Contract completed | CONTRACT callout | ascending chord | 8,20,10 | chip leaves | +150–900 score, +25–45 energy, +3 shards | fixed | 720ms |
| Contract lapsed | chip leaves quietly | — | 0 | — | none | fixed | 220ms |
| Precision spawn | two amber diamonds breathe in mirrored cells | single high tick | 0 | — | — | fixed | 6 moves |
| Precision hit | PRECISION callout (triple style) | sparkle pair | 0 | — | +150 / +12 | fixed | 640ms |
| Mirror Stress ≥0.4 | axis dims and cools | tension drone fades in at ≥0.65 | 0 | stress chip at ≥0.65 | — | fixed | while stalled |
| Katana cut (V3) | 200ms slash swing, sparks, fragments arrive | slice + air whoosh | 7,16,9 | count −1 | — | fixed | 300ms |
| Home → Play | katana travels hero → dock, diagonal cut-line reveal | slice | 0 | — | — | fixed | 620ms |
| Game over (V3) | axis crack + katana crack line across the board, blocks desaturate | low glass fall | 10 | results | — | fixed | 900ms |
