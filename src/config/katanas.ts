/** Original collection; see docs/research-2026-09-12-katana-collection.md. */
export type KatanaMotif = 'steel' | 'moon' | 'tide' | 'storm' | 'sun';
export type HamonPattern = 'straight' | 'gentle' | 'wave' | 'pointed' | 'clove';
export interface KatanaDesign {
  readonly id: string;
  readonly name: string;
  readonly epithet: string;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly rank: string;
  readonly cost: number;
  readonly description: string;
  readonly details: readonly [string, string, string];
  readonly colors: readonly [string, string, string, string];
  readonly inlay: string;
  readonly underlay: string;
  readonly motif: KatanaMotif;
  readonly hamon: HamonPattern;
  readonly width: number;
  readonly curvature: number;
  readonly guardRadius: number;
  readonly flourish: string;
  readonly duration: number;
  readonly hold: number;
}
export const KATANA_DESIGNS: readonly KatanaDesign[] = [
  {
    id: 'surgical-chrome', name: 'Shoshin', epithet: 'First steel', tier: 1, rank: 'Essential', cost: 0,
    description: 'Every collection begins with a perfect edge. Quiet iron, charcoal silk, and steel polished to a silver whisper.',
    details: ['Straight temper line', 'Round iron guard', 'Charcoal silk wrap'],
    colors: ['#dce3e6', '#444b53', '#25282e', '#a7c6cc'], inlay: '#a99877', underlay: '#aca99e',
    motif: 'steel', hamon: 'straight', width: 0.215, curvature: 0.10, guardRadius: 0.22,
    flourish: 'Silver whisper', duration: 2.2, hold: 3.2,
  },
  {
    id: 'black-titanium', name: 'Kage', epithet: 'Silent moon', tier: 2, rank: 'Refined', cost: 170,
    description: 'Blackened steel holds a sliver of moonlight. A silver crescent rests beneath the midnight wrap.',
    details: ['Silver-edged dark steel', 'Pierced iron guard', 'Crescent silver inlay'],
    colors: ['#858e9d', '#303742', '#202532', '#c9d9ed'], inlay: '#bfcbd7', underlay: '#747d8e',
    motif: 'moon', hamon: 'gentle', width: 0.23, curvature: 0.12, guardRadius: 0.245,
    flourish: 'Moonlit draw', duration: 2.6, hold: 3.0,
  },
  {
    id: 'frost-blade', name: 'Shiosai', epithet: 'Tidal song', tier: 3, rank: 'Exquisite', cost: 220,
    description: 'Ocean-blue silk meets sculpted silver waves. A rolling temper line catches the light like water over glass.',
    details: ['Rolling wave hamon', 'Silver wave openwork', 'Deep teal silk wrap'],
    colors: ['#c8e0e6', '#4e8289', '#194a53', '#66d9d8'], inlay: '#b6dce0', underlay: '#c4d9d4',
    motif: 'tide', hamon: 'wave', width: 0.24, curvature: 0.145, guardRadius: 0.265,
    flourish: 'Rising tide', duration: 2.8, hold: 3.0,
  },
  {
    id: 'prism-edge', name: 'Raimei', epithet: 'Violet tempest', tier: 4, rank: 'Masterwork', cost: 260,
    description: 'A storm held in folded steel. Violet silk, a gilded petal guard, and a jagged temper line alive with distant thunder.',
    details: ['Storm-pattern hamon', 'Gilded petal guard', 'Violet silk & gold inlay'],
    colors: ['#b9b5d8', '#565076', '#443158', '#b398ef'], inlay: '#cbb481', underlay: '#d5c4dc',
    motif: 'storm', hamon: 'pointed', width: 0.255, curvature: 0.13, guardRadius: 0.28,
    flourish: 'Gathering storm', duration: 3.0, hold: 3.2,
  },
  {
    id: 'golden-edge', name: 'Akatsuki', epithet: 'First light', tier: 5, rank: 'Signature', cost: 360,
    description: 'The crowning piece. A golden chrysanthemum, ivory silk, and flowing steel greet the dawn in a halo of warm light.',
    details: ['Flowing clove hamon', 'Gold chrysanthemum guard', 'Ivory silk & sun menuki'],
    colors: ['#e7dfc9', '#96743e', '#ded8c4', '#ecc477'], inlay: '#e2bd70', underlay: '#34313b',
    motif: 'sun', hamon: 'clove', width: 0.27, curvature: 0.155, guardRadius: 0.30,
    flourish: 'Dawn coronation', duration: 3.4, hold: 3.3,
  },
];
export function katanaById(id: string): KatanaDesign {
  return KATANA_DESIGNS.find((design) => design.id === id) ?? KATANA_DESIGNS[0]!;
}
/** Shared by model and thumbnails. */
export function hamonAt(design: KatanaDesign, t: number): number {
  switch (design.hamon) {
    case 'straight': return 0.25 + Math.sin(t * 34) * 0.012;
    case 'gentle': return 0.28 + Math.sin(t * 22) * 0.04;
    case 'wave': return 0.31 + Math.sin(t * 34) * 0.105 + Math.sin(t * 68) * 0.02;
    case 'pointed': return 0.24 + Math.pow((Math.sin(t * 53) + 1) / 2, 3) * 0.23;
    case 'clove': return 0.27 + Math.sin(t * 38) * 0.065 + Math.sin(t * 76) * 0.055;
  }
}
export function guardRadiusAt(design: KatanaDesign, angle: number): number {
  const lobes = design.motif === 'moon' ? 4 : design.motif === 'tide' ? 3 : design.motif === 'storm' ? 5 : 16;
  const depth = design.motif === 'steel' ? 0 : design.motif === 'sun' ? 0.06 : 0.14;
  return design.guardRadius * (1 + Math.cos(angle * lobes) * depth);
}
