import { guardRadiusAt, hamonAt, type KatanaDesign } from '../config/katanas';
import { bladeSection, KATANA } from '../render/KatanaModel';

/** Vector overview follows the live model's blade section, guard contour and materials. */
export function katanaArtwork(design: KatanaDesign): string {
  const [steel, fittings, wrap, accent] = design.colors;
  const uid = `katana-${design.id}`;
  const edge: string[] = [], spine: string[] = [], hamon: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, section = bladeSection(design, t), y = t * KATANA.nagasa;
    edge.push(`${section.edge},${y}`);
    spine.unshift(`${section.spine},${y}`);
    hamon.push(`${section.edge + section.span * hamonAt(design, t)},${y}`);
  }
  const guard = Array.from({ length: 64 }, (_, i) => {
    const a = i / 64 * Math.PI * 2, r = guardRadiusAt(design, a);
    return `${Math.cos(a) * r},${-0.18 + Math.sin(a) * r * 0.36}`;
  }).join(' ');
  const bands = Array.from({ length: 12 }, (_, i) => {
    const y = -0.34 - i * 0.101;
    return `<path d="M-.106 ${y - 0.045} L.106 ${y + 0.045} M-.106 ${y + 0.045} L.106 ${y - 0.045}" stroke="${wrap}" stroke-width=".038"/><path d="M-.106 ${y - 0.026} L.106 ${y + 0.064}" stroke="${design.underlay}" stroke-opacity=".28" stroke-width=".004"/>`;
  }).join('');
  const rays = design.tier >= 3 ? Array.from({ length: design.tier === 5 ? 16 : 6 }, (_, i) => {
    const a = i / (design.tier === 5 ? 16 : 6) * Math.PI * 2;
    return `<path d="M${Math.cos(a) * .12} ${-.18 + Math.sin(a) * .04} L${Math.cos(a) * design.guardRadius * .88} ${-.18 + Math.sin(a) * design.guardRadius * .3}" stroke="${design.inlay}" stroke-width=".008"/>`;
  }).join('') : '';
  return `<svg class="swatch-katana katana-artwork" viewBox="0 0 240 120" aria-hidden="true">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fafafa"/><stop offset=".28" stop-color="${steel}"/><stop offset=".64" stop-color="#f0efea"/><stop offset=".68" stop-color="${fittings}"/><stop offset="1" stop-color="${steel}"/></linearGradient></defs>
    <g transform="translate(120 60) rotate(62) scale(38 -38)"><g transform="translate(0 -1.05)">
      <path d="M${edge.join(' L')} L${spine.join(' L')} Z" fill="url(#${uid})"/>
      <path d="M${hamon.join(' L')}" fill="none" stroke="#f5f6f5" stroke-width=".014" opacity=".8"/>
      <rect x="-.105" y="-1.52" width=".21" height="1.22" rx=".03" fill="${design.underlay}"/>
      ${bands}<rect x="-.12" y="-.3" width=".24" height=".08" rx=".02" fill="${fittings}"/>
      <rect x="-.11" y="-1.61" width=".22" height=".09" rx=".03" fill="${fittings}" stroke="${design.inlay}" stroke-width=".012"/>
      <polygon points="${guard}" fill="${fittings}" stroke="${design.inlay}" stroke-width=".015"/>${rays}
      <rect x="${-design.width * .52}" y="-.14" width="${design.width * 1.04}" height=".14" fill="${design.inlay}"/>
      <path d="M-.025 -.74 L0 -.66 L.025 -.74 L0 -.82 Z" fill="${accent}"/>
      ${design.tier === 5 ? `<circle cx="0" cy="-.74" r=".042" fill="${design.inlay}"/>` : ''}
    </g></g></svg>`;
}
