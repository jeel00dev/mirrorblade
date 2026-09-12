# Third-party assets

None. Every visual and audio asset in MIRRORBLADE is generated in code (see `art/asset-manifest.json`). The 2026-09-12 responsive tray pass adds no runtime asset and preserves the existing block material, katana art, typography and background. The five-katana collection adds original geometry, seeded steel/silk/underlay textures, vector thumbnails and procedural signature effects. Museum objects were researched for anatomy and ornament vocabulary; their images were not imported. Sources and limitations are recorded in `research-2026-09-12-katana-collection.md`.

| Asset | Source | License | Attribution |
| --- | --- | --- | --- |
| Katana model | Procedural, `src/render/KatanaModel.ts` (2026-09-11) — no external model was used because available CC0 katana models were either fantasy-styled or far above the polygon budget | Project | none required |
| Blade / block / UI textures | Canvas-generated at runtime | Project | none |
| Fonts | System font stack only | n/a | none |
| Three.js | npm `three` | MIT | bundled LICENSE |
