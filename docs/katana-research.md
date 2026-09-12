# Katana research — construction, proportions, and the MIRRORBLADE build

Written 2026-09-11 (Claude). The V2 blade (`docs/reference/v3-2-current-blade.png`) is a symmetric double-pointed spindle; it reads as a letter opener. V3 replaces it with a katana-inspired signature object built procedurally in Three.js so it fits the existing dark, restrained identity.

## 1. Anatomy (what each part is)

| Part | What it is | Source |
| --- | --- | --- |
| Nagasa | blade length, edge to the notch at the collar; standard katana ≈ 60–80 cm, ~73 cm typical | [Katana Corp — sizes](https://katana-corp.com/pages/katana-parts), [Romance of Men — length](https://romanceofmen.com/blogs/katana-info/how-long-is-a-katana) |
| Sori | curvature, measured as the deepest gap between the spine and the straight line tip↔notch; typically 1.5–2 cm on a standard blade; modern blades 10–15 mm with forward (saki-zori) bias | [Katana Corp — sori](https://katana-corp.com/pages/sori-katana-curvature) |
| Kissaki | the tip section, bounded by the yokote line; "slightly rounded"; chū-kissaki (medium) is the common proportion | [Swords of Northshire — anatomy](https://www.swordsofnorthshire.com/blogs/theblade/sword-anatomy-parts-of-a-katana) |
| Mune | the spine (back), unsharpened, usually a low peak (iori-mune) | same |
| Ha | the hardened cutting edge | same |
| Shinogi | the longitudinal ridge on each face where the flat shinogi-ji meets the bevel down to the edge; it sits closer to the spine than the edge (shinogi-zukuri geometry) | [Celtic Web Merchant — anatomy](https://www.celticwebmerchant.com/en-int/blogs/knowledge-base-swords-weapons/anatomy-of-a-samurai-sword-katana) |
| Hamon | the visible temper line between hard edge steel and softer body, wavy or straight, misty rather than a hard stripe | [Samurai Sword Keyring — anatomy](https://www.samuraiswordkeyring.com/learn/sword-anatomy) |
| Habaki | the blade collar at the base, usually brass/copper, wedge-shaped, locks the blade in the scabbard | [Katana USA — anatomy](https://katana-usa.com/blogs/every-part-of-a-katana-anatomy-guide/) |
| Seppa | thin washers either side of the guard | same |
| Tsuba | the guard, disc / rounded-square (mokkō) / lobed, ~7.5–8.5 cm across | [Battlewares — anatomy](https://battlewares.com/katana-anatomy/) |
| Fuchi | metal collar at the guard end of the handle | same |
| Tsuka | the handle, wood core over the tang; ~25–30 cm | [Hanbon Forge — measuring](https://www.hanbonforge.com/blog/How-to-measure-Japanese-sword-size-properly) |
| Samé | ray-skin under the wrap, its white nodes show through the wrap diamonds | Swords of Northshire |
| Tsuka-ito | the silk/cotton wrap; the standard hineri-maki wrap leaves a row of alternating diamonds | same |
| Menuki | small ornament under the wrap on each side | same |
| Kashira | the pommel cap | same |

## 2. Proportions used in the build (scene units, blade tip up)

| Element | Value | Basis |
| --- | --- | --- |
| Nagasa | 3.6 u | 73 cm ≈ 3.6 u → 1 u ≈ 20 cm |
| Sori | 0.085 u (≈ 1.7 cm) at ~55 % of the length, slight forward bias | 1.5–2 cm typical |
| Blade width (motohaba → sakihaba) | 0.16 u → 0.11 u, ~3.2 cm → 2.2 cm | typical taper |
| Blade thickness (motokasane → sakikasane) | 0.036 u → 0.024 u, ~7 mm → 5 mm | typical |
| Shinogi position | 62 % of the width from the edge (i.e. nearer the spine) | shinogi-zukuri |
| Kissaki | last 0.32 u (~6.5 cm, chū-kissaki), edge curves to the point, yokote at its base | chū-kissaki |
| Habaki | 0.13 u long, wedge, muted brass `#8f7a55` roughness 0.45 | brass collar |
| Seppa ×2 | 0.012 u thin, dark | washers |
| Tsuba | 0.40 u across (~8 cm), rounded-square, 0.05 u thick, dark brushed metal `#2b2f36` | 7.5–8.5 cm |
| Fuchi / kashira | 0.07 u caps, dark metal | fittings |
| Tsuka | 1.3 u (~26 cm), elliptical section 0.15 × 0.10 u, charcoal wrap `#1e2024` with a repeating diamond texture exposing grey samé nodes | 25–30 cm |
| Menuki | one small cyan `#43c2c7` lozenge under the wrap on the front face — the only MirrorBlade accent | brief §28 |
| Total | ≈ 5.1 u | – |

Polygon budget: blade sweep 72 rings × 6 vertices → ≈ 860 triangles; kissaki cap 12; habaki 44; tsuba extruded rounded square ≈ 420; tsuka 32-segment ellipse sweep ≈ 130; caps ≈ 120. **≈ 1,600 triangles**, far under the 3k–15k budget. Textures: one 128×512 generated wrap texture (canvas) for the tsuka; the blade uses vertex colour for the hamon band, no bitmap.

## 3. Materials

- Blade: `MeshPhysicalMaterial`, metalness 1.0, roughness 0.22 on the shinogi-ji / 0.16 in the hamon band, clearcoat 0.4, the same PMREM studio environment as V2. The hamon is a vertex-colour band whose boundary wanders with a low-frequency sine (misty, not a hard stripe), 4 % lighter than the body.
- Edge highlight: a thin emissive hairline along the ha, only during energy gain / 100 % / forge, so at rest the blade is "not mirror-chrome everywhere".
- Fittings: dark metal metalness 0.85, roughness 0.5; habaki brass metalness 0.9, roughness 0.45.
- Wrap: standard material with the generated diamond texture as map and a mild roughness map from the same canvas.

## 4. Animation states (readability first)

| State | Motion |
| --- | --- |
| Idle (dock) | 0.55 rad/s around the vertical axis, 0.05 rad tilt, no float |
| Idle (hero) | same rotation, ± 0.06 u vertical float, soft platform shadow |
| Hover with a piece | 3.2 rad/s |
| Energy gain | 180 ms edge hairline pulse |
| Ring at 100 % (banked) | slow specular sweep every 1.6 s (env intensity 1.35 → 1.9 → 1.35) |
| Forge | 0.6 s spin-up to ~9 rad/s that settles, bright edge flash |
| Cut | a single 200 ms slash: rotation.z swings −0.5 → +0.35 rad and back |
| Fracture | ± 0.3 rad/s jitter on the spin speed |
| Overdrive | 1.4 rad/s, warmer environment intensity |
| Zero charges | 0.08 rad/s, roughness 0.55, edge hidden |
| Reduced motion | static, 0.35 rad fixed yaw so the shinogi and hamon are visible |

## 5. Model source

No CC0/public-domain katana model matched the brief's restraint (most are fantasy or high-poly). The model is therefore **generated in code** (`src/render/KatanaModel.ts`); there is no third-party asset and no attribution requirement. `docs/third-party-assets.md` records this decision so the question is not reopened.

## 6. Where the katana appears

- Gameplay blade dock (inside the energy ring), Home hero, Shop "Blades" preview and its thumbnails (SVG silhouette in the item's colours).
- Katana motif elsewhere is limited to: the Fracture timeout shatter line, the rare ambient background cut, the cut-sparks direction, and the "slice" audio. Menus stay MIRRORBLADE, not Japanese.
