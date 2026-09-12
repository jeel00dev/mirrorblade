# Five katana designs for MIRRORBLADE

## Recommendation

Replace the five recolors with five original katana designs sharing one Japanese sword construction language. Progress from restrained forged steel to increasingly distinctive fittings, temper patterns, ornament and brief showcase effects. Keep the OBSIDIAN MIRROR interface, the existing prices and the existing saved cosmetic identifiers. The equipped object must be the same model in the shop, collection, Home and gameplay.

This is an art direction and implementation specification, supported by museum references and first-party game development accounts. Increased appeal is a design hypothesis, not a measured increase in purchases. Cosmetic preference varies, and no source establishes that these five particular designs will make every player want all five. A later player comparison should assess recognition, preference and perceived value without changing the economy during this implementation.

## Project baseline

The available Git history contains one imported commit, `33155d1`, “MIRRORBLADE V3: difficulty director, katana, combo feedback, refined UI.” Earlier progress is documented in the V2/V3 changelogs and handoff. Work is on `ui/shop`, created from updated `main`.

The current five blade items retain the same geometry and change four colors. At shop scale, their blade faces are narrow and their similar 64-pixel thumbnails convey little difference beyond tint. Unaffordable items are desaturated and darkened, making aspirational items harder to appreciate. The original sword has recognizable basic anatomy but a relatively simple grip texture, one guard and a straight box used as its light strip. Home continuously rotates the sword, periodically hiding the broad face.

The renderer already has a useful foundation: one Three.js canvas is moved between screen mounts. Inventory separates purchasing from equipping. Preview cleanup restores the equipped colors. Extend this structure to carry the complete design identity; do not introduce separate, inconsistent Home illustrations or five independent WebGL contexts.

The existing design system specifies charcoal ceramic panels, machined metal, restrained depth, system typography and four resin accents. The sword collection belongs inside that system. Japanese typography, temple architecture, parchment, red menu borders or a separate shop theme are unnecessary.

## Evidence: Japanese sword identity

### Blade and surface

The Metropolitan Museum describes the blade's patterned steel grain, its ridgelines, and the visible hardening boundary called the hamon. It distinguishes straight suguha from more patterned lines and describes the sword mountings as a combination of metalwork, lacquer, silk and ray skin. These references support a design built around a curved, single-edged blade with a differentiated spine, cutting face and tip, rather than an oversized fantasy silhouette.[^1]

The Japanese Sword Museum explains why temper lines reflect light differently and documents how hamon patterns have been studied and recorded. Its exhibition distinguishes the restrained and elaborate treatments found across different periods. A bright temper line is therefore an appropriate material detail, but a permanently glowing neon stripe is a fictional effect, not historical metallurgy.[^2]

The museum's hamon exhibition catalog supplies named examples including suguha, notare, chōji and gunome.[^3] The model may use mathematical approximations inspired by those families. It should not claim to reproduce an authenticated school, maker or National Treasure.

**Design application:** keep every sword steel. Alter the polish, body value, broad hamon rhythm and subtle grain; do not make the entire blade transparent ice, rainbow glass or gold. Exaggerate width and relief moderately for a small game viewport. A physically exact sword that disappears at the gameplay dock would be a poor interactive object.

### Fittings and decorative vocabulary

The Met's nineteenth-century dragon-and-waves guard combines dark copper-gold alloy, gold highlights, a textured field and wave ornament. This gives a grounded reference for contrasting dark fittings with carefully placed brighter details.[^4] The chrysanthemum-and-butterfly guard combines a raised rim, engraved scrollwork, relief and mixed-metal inlays, with an approximately 8 cm guard.[^5]

**Design application:** use original guard contours and motifs: plain round iron, pierced four-lobed iron, wave engraving, petal geometry and a chrysanthemum crown. Decorative hierarchy can grow across the collection while all five remain katana. Grip wraps should show actual crossing bands, exposed textured underlay, two-sided menuki ornaments, collars and a pommel cap. Small repeated gold details should follow the fittings instead of covering the whole sword.

The object records are reference material. No museum images, third-party weapon meshes, game skins, logos or sound recordings are copied into the build. Japanese names are fictional collection names using familiar motifs; the designs are not historical replicas.

## Evidence: cosmetic appeal and progression

Valve's weapon finish guide relates salience to recognizability, distinct patterns and contrast. It describes a progression from quieter finishes to more visually assertive designs, while also emphasizing quality at lower tiers. It recommends evaluating the actual in-game perspective and warns against colors so dark or bright that they cease to fit their environment.[^6]

**Design application:** every tier gets good craftsmanship. Tier 1 is desirable for its restraint; later tiers add broader material contrasts and recognizable decoration. Keep the order visible with numbers 01–05 and a consistent thumbnail scale. Unowned blades should remain fully legible; affordability belongs in the price and lock state. Show the actual render, not a promotional image that promises unavailable detail.

Riot's account of Reaver describes combining a custom model, animation and effects into a cohesive theme. It also reports removing an equip animation because players could not readily tell when the weapon was usable.[^7] This is direct evidence of a tradeoff: spectacle can support a cosmetic identity but can also harm interaction.

Riot's rendering article explicitly balances art, performance and gameplay clarity. It describes different material responses and the need for consistent readability across quality levels.[^8] This supports putting the strongest display effects in Home and Shop, with smaller state-driven feedback in gameplay.

**Design application:** give each blade one recognizable showcase event, not a continuous storm of unrelated particles. The idle pose exposes the blade face and craftsmanship. During a run, the same geometry and materials appear in the existing dock; its cut zone, charge count, recharge costs and input timings remain unchanged. Cosmetic tier never changes power.

## Five-design specification

The English epithets and motion names below are original art direction. Tier labels describe this collection's craft progression, not real-world sword grading or randomized rarity.

| Order | Display name / epithet | Existing saved ID | Shards | Craft tier | Visual identity |
| --- | --- | --- | ---: | --- | --- |
| 01 | Shoshin / First steel | `surgical-chrome` | 0 | Essential | Neutral polished steel, quiet straight hamon, round iron guard, charcoal wrap, brass collar, one small cyan accent |
| 02 | Kage / Silent moon | `black-titanium` | 170 | Refined | Darkened steel body and bright silver edge, pierced four-lobed guard, silver rim, black wrap and crescent ornament |
| 03 | Shiosai / Tidal song | `frost-blade` | 220 | Exquisite | Cool steel, rolling wave hamon, wave-shaped openwork guard, silver fittings, deep teal wrap and cyan inlay |
| 04 | Raimei / Violet tempest | `prism-edge` | 260 | Masterwork | Smoked violet steel, pointed irregular hamon, floral openwork guard with gold trim, violet wrap and branching storm detail |
| 05 | Akatsuki / First light | `golden-edge` | 360 | Signature | Bright warm steel, elaborate flowing hamon, chrysanthemum guard, layered gold fittings, ivory-and-dark grip contrast and sun ornament |

The hierarchy should remain apparent in grayscale through the guard outline, edge-to-body contrast and amount of ornament. Color gives a second signal. Lower-tier craftsmanship is not intentionally degraded: all five get steel ridges, wrap structure and correct component boundaries. Tiers 4 and 5 should feel richer through composition and detail rather than unbounded particle counts.

### Materials and anatomy

Use a common swept shinogi-zukuri-style blade structure, with taper, controlled curvature, an edge that meets the spine at the kissaki, and a visible yokote boundary. The hamon follows the curved cutting edge. Build the collars, washers, guard, grip and pommel as separate material regions. Add wrapping in geometry so crossing bands cast their own shading and keep a recognizable silhouette at close range.

A generated steel texture adds restrained longitudinal grain and polishing variations; a generated underlay supplies small ray-skin-like nodules. Texture generation must be seeded so previewing a blade twice does not randomly change its craft details. Bright accents are limited to inlays, ornaments and temporary effects. The expensive blades retain readable silver steel and do not become solid glowing sticks.

Three.js documents clearcoat, anisotropy and other physical material features, together with their extra per-pixel cost and the value of environment lighting.[^9] Retain the existing studio environment. Use physical shading where it contributes to the blade's reflection and simpler materials for small fittings and effects. Local TypeScript definitions for the installed Three.js version are the final compatibility check because the online reference may document a newer release.

### Presentation

Use a broader diagonal shop pose that fills the stage and keeps the face visible. A restrained light pool, tier number, craft label and three concise construction details give context to the object. The five thumbnails should be larger than the current tiny silhouettes and match each blade's guard, handle, finish and hamon. Show one ordered row on desktop and a horizontally scrollable row on phone, retaining 01–05 order. Keep the purchase control distinct from preview selection.

The preview should offer a replay action and a fittings close-up so the extra detail can actually be inspected. Close-up framing may crop the tip intentionally; full-sword framing must contain the entire weapon. Affordability and ownership use the established shard/owned/equipped vocabulary. Existing prices, currency storage and purchasing behavior stay compatible.

Home displays the equipped blade's name and craft tier close to its stage. The main Play and Daily controls retain their hierarchy. Equip from either Shop or Collection must update the same identity used by Home and gameplay. Browsing an unowned blade must never grant ownership or persist that preview as equipped.

## Motion specification

Use one explicit repeating timeline with three phases: reveal/anticipation, a short signature flourish, then an entirely still hold. Proposed starting durations are 0.4–0.7 seconds anticipation, 1.2–2.4 seconds action/settle and about 3 seconds hold. These values are art direction, not source measurements. A static hold is deliberate; a continuous sine wave underneath would defeat the requested animation–pause–animation rhythm.

| Katana | Signature event | Still pose |
| --- | --- | --- |
| Shoshin | A clean silver glint climbs the edge as the sword makes a modest inspection turn | Steel face exposed; no aura |
| Kage | A silver crescent traces past the dark blade with a small number of pale motes | Dark face and bright rim visible |
| Shiosai | Two cyan wave ribbons sweep along the blade and settle into fine droplets | Teal handle and wavy hamon visible |
| Raimei | A violet arc traces the blade, with separated branches and a brief controlled turn | Floral guard and pale steel edge readable |
| Akatsuki | A warm sun halo opens behind the sword, gilded rays and motes rise, then fade | Gold chrysanthemum guard and ivory grip framed |

Display motion must not leak into the charge mechanics or block clicks. Gameplay keeps the existing short slash, energy pulse and forge response, with material identity intact. The showcase's halo and ribbons are not placed over the puzzle board. No automatic new sounds are needed for the repeating menu event.

W3C's pause/stop/hide guidance requires control over qualifying automatically moving content presented alongside other information.[^10] Provide a visible pause/resume animation control at the Home and blade preview stage; keep the game's reduced-motion setting authoritative. Under reduced motion, show the complete static blade, readable metadata and no decorative travel, flashing, particles or scheduled flourish. Hidden tabs should not advance the presentation clock. Resume without simulating the time spent away.

## Engineering and verification plan

Store the design parameters in a typed blade-definition module referenced by cosmetic configuration, geometry and thumbnails. Carry that definition through `BladeScene.setSkin` rather than attempting to infer identity from a hex color. Preserve the five saved IDs so existing purchases and equipment migrate without a save-version change. Rebuild geometry only when the design changes; revisiting the same design should not recreate textures every time the HUD updates.

Retain one WebGL renderer. Dispose old geometry, textures and materials when switching designs; dispose shared resources only once. Preallocate effect geometry and reuse it during the loop. Aim for fewer than 15,000 triangles per detailed sword, then record actual counts. The old 3,000-triangle assertion measures a superseded art target; update it only with a documented replacement budget and measured results. A small draw-call budget is also useful because geometry detail spread across many objects can be expensive even at low polygon counts.

Validate both state correctness and what the player sees:

1. Five ordered designs, preserved costs/IDs, distinct geometry, finite vertices, and deterministic motion phases including a real still interval.
2. Purchase and equip each upgrade; check currency once, ownership, Home, gameplay and persistence after reload.
3. Preview an unowned different blade and exit; confirm the equipped blade is restored. Cover Collection and Use default too.
4. Check replay, pause/resume, reduced motion and hidden-tab behavior. Test state transitions from zero-charge gameplay into the shop so a preview is not incorrectly dulled.
5. Inspect Home, Shop and gameplay on desktop and phone, including short landscape. Test keyboard activation and make all five cards reachable on narrow screens.
6. Run `npm run check`, `npm run test:e2e`, and the required screen captures. Add collection-specific screenshots for all five swords. Record real outcomes in the implementation ledger and changelog; do not describe automated screenshots as physical-device frame-rate measurements.

## Limitations and follow-up evaluation

Museum examples justify anatomy and ornament vocabulary; they do not authenticate these fictional combinations. Shooter cosmetic guidance supplies useful presentation principles, but its audience and first-person weapon context differ from a puzzle game's blade dock. Perceived value still needs feedback from MIRRORBLADE players.

After implementation, show the five blades without prices first and ask testers to order the perceived craft levels and name their favorites. Then show prices and compare purchase preferences with the previous shop. Record whether the hierarchy is legible, whether a favorite lower tier remains meaningful, and whether the effects feel distracting. That evaluation can guide later refinements; no conversion uplift is assumed in advance.

## Sources

All pages accessed 12 September 2026. Historical object dates are distinguished from article publication dates. Undated live documentation is identified as such.

[^1]: Edward Hunter, The Metropolitan Museum of Art. [The Japanese Blade: Technology and Manufacture](https://www.metmuseum.org/essays/the-japanese-blade-technology-and-manufacture), October 2003. Blade construction, grain, hamon and mounting materials.
[^2]: NBTHK / The Japanese Sword Museum. [Introduction to Japanese Swords III: Hamon](https://www.touken.or.jp/english/explanation/itjsshape/k2.html), undated exhibition interpretation. Temper-line appearance and historical study.
[^3]: The Japanese Sword Museum. [Appreciation of Hamon Patterns exhibition list](https://www.touken.or.jp/Portals/0/pdf/mokuroku/2021mikata-hamon-en.pdf), 2021. Catalog examples and pattern terminology.
[^4]: The Metropolitan Museum of Art. [Sword Guard Depicting Dragon Between Waves](https://www.metmuseum.org/art/collection/search/25705), nineteenth-century object; undated collection record. Mixed-metal contrast, waves and textured decoration.
[^5]: The Metropolitan Museum of Art. [Sword Guard With the Motif of Chrysanthemums and Butterfly](https://www.metmuseum.org/art/collection/search/25683), nineteenth-century object; undated collection record. Floral ornament, relief, rim and dimensions.
[^6]: Valve. [Style Guide for Weapon Finishes](https://www.counter-strike.net/workshop/workshopstyleguide), undated live guide. Salience, tiers, original work and in-game perspective.
[^7]: Sean Marino and Preeti Khanolkar, Riot Games. [True to Form: The Story of Reaver](https://playvalorant.com/en-us/news/dev/true-to-form-the-story-of-reaver/), 9 August 2022. Coherent cosmetic identity and animation clarity tradeoffs.
[^8]: Brandon Wang, Riot Games. [VALORANT Shaders and Gameplay Clarity](https://www.riotgames.com/en/news/valorant-shaders-and-gameplay-clarity), 30 June 2020. Material response, performance and readability.
[^9]: Three.js contributors. [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html), live documentation. Material features and performance costs; installed release is checked separately.
[^10]: W3C Web Accessibility Initiative. [Understanding Success Criterion 2.2.2: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html), live WCAG 2.2 explanatory document. User control over automatic motion.
