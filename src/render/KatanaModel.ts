import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { guardRadiusAt, hamonAt, KATANA_DESIGNS, type KatanaDesign } from '../config/katanas';

export interface KatanaMaterials {
  steel: THREE.MeshPhysicalMaterial;
  fittings: THREE.MeshStandardMaterial;
  habaki: THREE.MeshStandardMaterial;
  wrap: THREE.MeshStandardMaterial;
  same: THREE.MeshStandardMaterial;
  inlay: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  edge: THREE.MeshBasicMaterial;
}
export interface KatanaSkin { readonly colors: readonly string[]; readonly katana?: KatanaDesign }
export const KATANA = { nagasa: 3.6, kissaki: 0.36, tsuka: 1.22, centerOffset: -1.05 } as const;

export function createKatanaMaterials(design = KATANA_DESIGNS[0]!): KatanaMaterials {
  const grain = steelTexture();
  const same = underlayTexture();
  const silk = silkTexture();
  return {
    steel: new THREE.MeshPhysicalMaterial({ color: design.colors[0], metalness: 0.92, roughness: 0.25, clearcoat: 0.32, clearcoatRoughness: 0.25, envMapIntensity: 1.3, vertexColors: true, map: grain }),
    fittings: new THREE.MeshStandardMaterial({ color: design.colors[1], metalness: 0.82, roughness: 0.33 }),
    habaki: new THREE.MeshStandardMaterial({ color: design.inlay, metalness: 0.88, roughness: 0.26 }),
    wrap: new THREE.MeshStandardMaterial({ color: design.colors[2], metalness: 0.05, roughness: 0.78, map: silk, bumpMap: silk, bumpScale: 0.003 }),
    same: new THREE.MeshStandardMaterial({ color: design.underlay, metalness: 0.03, roughness: 0.9, map: same, bumpMap: same, bumpScale: 0.009 }),
    inlay: new THREE.MeshStandardMaterial({ color: design.inlay, metalness: 0.82, roughness: 0.24 }),
    accent: new THREE.MeshStandardMaterial({ color: design.colors[3], emissive: design.colors[3], emissiveIntensity: 0.18, metalness: 0.4, roughness: 0.26 }),
    edge: new THREE.MeshBasicMaterial({ color: design.colors[3], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  };
}

/** Original procedural craftsmanship, batched into one mesh per material. */
export function buildKatana(materials: KatanaMaterials, design = KATANA_DESIGNS[0]!): { group: THREE.Group; triangles: number } {
  const group = new THREE.Group();
  group.name = design.id;
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1)): void => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    flat.applyMatrix4(new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(rotation), scale));
    const count = flat.getAttribute('position').count;
    if (!flat.getAttribute('color')) flat.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    if (!flat.getAttribute('uv')) flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    flat.clearGroups();
    const entries = batches.get(material) ?? [];
    entries.push(flat);
    batches.set(material, entries);
  };
  const cylinder = (r1: number, r2: number, length: number, y: number, material: THREE.Material): void => {
    add(new THREE.CylinderGeometry(r1, r2, length, 24), material, new THREE.Vector3(0, y, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 0.63));
  };
  const line = (points: THREE.Vector3[], radius: number, material: THREE.Material, closed = false): void => {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(8, points.length * 2), radius, 4, closed), material);
  };
  add(bladeGeometry(design), materials.steel);
  for (const side of [-1, 1]) {
    const edge: THREE.Vector3[] = [], ridge: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, p = bladeSection(design, t);
      edge.push(new THREE.Vector3(p.edge, t * KATANA.nagasa, side * 0.004));
      ridge.push(new THREE.Vector3(p.edge + p.span * 0.66, t * KATANA.nagasa, side * p.half * 1.04));
    }
    line(edge, 0.004, materials.edge);
    line(ridge, 0.0018, materials.steel);
  }
  add(new THREE.BoxGeometry(design.width * 1.04, 0.14, 0.085), materials.habaki, new THREE.Vector3(0, -0.07, 0));
  for (const side of [-1, 1]) for (let i = -2; i <= 2; i++) {
    add(new THREE.BoxGeometry(0.003, 0.10, 0.002), materials.fittings, new THREE.Vector3(i * 0.032, -0.07, side * 0.044));
  }
  cylinder(0.156, 0.156, 0.012, -0.145, materials.inlay);
  cylinder(0.156, 0.156, 0.012, -0.215, materials.inlay);
  add(tsubaGeometry(design), materials.fittings, new THREE.Vector3(0, -0.18, 0), new THREE.Euler(Math.PI / 2, 0, 0));
  for (const face of [-0.217, -0.143]) {
    const rim = Array.from({ length: 48 }, (_, i) => {
      const a = i / 48 * Math.PI * 2, r = guardRadiusAt(design, a) * 0.94;
      return new THREE.Vector3(Math.cos(a) * r, face, Math.sin(a) * r * 0.83);
    });
    line(rim, design.tier === 1 ? 0.003 : 0.007, materials.inlay, true);
    if (design.tier >= 3) {
      const petals = design.motif === 'sun' ? 16 : design.motif === 'storm' ? 5 : 6;
      for (let p = 0; p < petals; p++) {
        const a = p / petals * Math.PI * 2;
        line(Array.from({ length: 5 }, (_, i) => {
          const t = i / 4, r = 0.105 + t * design.guardRadius * 0.48, angle = a + Math.sin(t * Math.PI) * 0.18;
          return new THREE.Vector3(Math.cos(angle) * r, face, Math.sin(angle) * r * 0.83);
        }), 0.0045, materials.inlay);
      }
    }
  }
  const gripTop = -0.30, gripBottom = gripTop - KATANA.tsuka;
  cylinder(0.113, 0.108, 0.085, -0.261, materials.fittings);
  cylinder(0.105, 0.095, KATANA.tsuka, gripTop - KATANA.tsuka / 2, materials.same);
  cylinder(0.10, 0.091, 0.085, gripBottom - 0.04, materials.fittings);
  // Counter-wound silk ribbons conform to the elliptical grip, with no floating band ends.
  for (let row = 0; row < 6; row++) for (const direction of [-1, 1]) {
    add(wrapBandGeometry(gripTop - row * 0.20, direction, row), materials.wrap);
  }
  for (const y of [-0.23, -0.293, gripBottom - 0.015, gripBottom - 0.07]) cylinder(0.112, 0.112, design.tier > 3 ? 0.009 : 0.005, y, materials.inlay);
  for (const face of [-1, 1]) {
    const y = gripTop - 0.47, z = face * 0.087;
    if (design.motif === 'moon') {
      line(Array.from({ length: 12 }, (_, i) => {
        const a = -Math.PI * 0.6 + i / 11 * Math.PI * 1.35;
        return new THREE.Vector3(Math.cos(a) * 0.034, y + Math.sin(a) * 0.06, z);
      }), 0.007, materials.inlay);
    } else if (design.motif === 'sun') {
      add(new THREE.SphereGeometry(0.028, 12, 6), materials.accent, new THREE.Vector3(0, y, z), new THREE.Euler(), new THREE.Vector3(1, 1, 0.35));
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        add(new THREE.BoxGeometry(0.009, 0.022, 0.004), materials.inlay, new THREE.Vector3(Math.sin(a) * 0.041, y + Math.cos(a) * 0.041, z), new THREE.Euler(0, 0, -a));
      }
    } else for (let i = 0; i < (design.tier > 2 ? 3 : 1); i++) {
      add(new THREE.OctahedronGeometry(0.025), materials.accent, new THREE.Vector3(Math.sin(i * 2) * 0.013, y + (i - 1) * 0.035, z), new THREE.Euler(0, 0, 0.3), new THREE.Vector3(0.65, 1, 0.22));
    }
    if (design.tier >= 3) for (let i = 0; i < design.tier - 1; i++) {
      const yy = 0.16 + i * 0.087, p = bladeSection(design, yy / KATANA.nagasa);
      add(new THREE.BoxGeometry(0.033, 0.0025, 0.002), materials.inlay, new THREE.Vector3(p.edge + p.span * 0.78, yy, face * p.half * 0.81), new THREE.Euler(0, 0, -0.6));
    }
  }
  let triangles = 0;
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries)!;
    geometries.forEach((geometry) => geometry.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = Object.entries(materials).find(([, entry]) => entry === material)?.[0] ?? 'detail';
    triangles += merged.getAttribute('position').count / 3;
    group.add(mesh);
  }
  group.position.y = KATANA.centerOffset;
  return { group, triangles };
}

export function bladeSection(design: KatanaDesign, t: number): { edge: number; spine: number; span: number; half: number } {
  const bow = design.curvature * 4 * Math.pow(t, 1.15) * (1 - t);
  const width = design.width * (1 - t * 0.32);
  const tip = Math.max(0, (t - 0.9) / 0.1);
  const taper = Math.sqrt(Math.max(0.00001, 1 - tip * tip));
  const spine = bow + width / 2, span = width * taper;
  return { edge: spine - span, spine, span, half: (0.023 - t * 0.007) * taper };
}

export function bladeGeometry(design: KatanaDesign): THREE.BufferGeometry {
  const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
  const rings = 128, corners = 12;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const { edge, span, half } = bladeSection(design, t);
    const h = hamonAt(design, t);
    const section = [[0, 0, 1.05], [h - 0.025, (h - 0.025) / 0.66, 1.02], [h, h / 0.66, 1.09], [h + 0.025, (h + 0.025) / 0.66, 0.82], [0.66, 1, 0.80], [0.95, 0.52, 0.55], [1, 0, 0.70], [0.95, -0.52, 0.55], [0.66, -1, 0.80], [h + 0.025, -(h + 0.025) / 0.66, 0.82], [h, -h / 0.66, 1.09], [h - 0.025, -(h - 0.025) / 0.66, 1.02]];
    for (let c = 0; c < corners; c++) {
      const [fraction, z, shade] = section[c]!;
      positions.push(edge + span * fraction!, t * KATANA.nagasa, half * z!);
      const value = shade! * (t >= 0.9 ? 0.95 : 1);
      colors.push(value, value, value); uvs.push(fraction!, t);
      if (i < rings) {
        const a = i * corners + c, b = i * corners + (c + 1) % corners;
        indices.push(a, a + corners, b, b, a + corners, b + corners);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const flat = geometry.toNonIndexed(); geometry.dispose();
  return flat;
}
function tsubaGeometry(design: KatanaDesign): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const a = i / 96 * Math.PI * 2, r = guardRadiusAt(design, a);
    const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.83;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const slot = new THREE.Path();
  slot.absellipse(0, 0, design.width * 0.47, 0.035, 0, Math.PI * 2, true, 0);
  shape.holes.push(slot);
  if (design.tier > 1) {
    const count = design.motif === 'storm' ? 5 : design.motif === 'sun' ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const a = (i + 0.5) / count * Math.PI * 2;
      const hole = new THREE.Path();
      hole.absellipse(Math.cos(a) * design.guardRadius * 0.68, Math.sin(a) * design.guardRadius * 0.56, 0.031, 0.023, 0, Math.PI * 2, true, a);
      shape.holes.push(hole);
    }
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.006, bevelSegments: 1, curveSegments: 8 });
  geometry.center(); return geometry;
}
function wrapBandGeometry(top: number, direction: number, row: number): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const segments = 40;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, a = t * Math.PI * 2 * direction + (direction === -1 ? Math.PI : 0);
    const taper = 1 - (row + t) * 0.014;
    const rx = (0.109 + (direction === 1 ? 0.002 : 0)) * taper;
    const rz = (0.071 + (direction === 1 ? 0.002 : 0)) * taper;
    for (const side of [-1, 1]) {
      positions.push(Math.cos(a) * rx, Math.max(-1.52, Math.min(-0.30, top - t * 0.20 + side * 0.022)), Math.sin(a) * rz);
      uvs.push(t * 4, (side + 1) / 2);
    }
    if (i < segments) {
      const n = i * 2;
      if (direction === 1) indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      else indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
function silkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e5e5e5'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 3) {
    ctx.fillStyle = '#bababa'; ctx.fillRect(i, 0, 1, 128);
    ctx.fillStyle = '#f1f1f1'; ctx.fillRect(0, i, 128, 1);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; return texture;
}
function steelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#eeeef0'; ctx.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 200; i++) {
    ctx.strokeStyle = i % 3 ? 'rgba(65,75,87,0.06)' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.4 + seeded(i) * 0.9; ctx.beginPath();
    const x = seeded(i + 800) * 256;
    for (let y = 0; y <= 1024; y += 16) {
      const xx = x + Math.sin(y * 0.015 + i) * 0.9 + Math.sin(y * 0.045 + i * 0.3) * 0.4;
      if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function underlayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#848484'; ctx.fillRect(0, 0, 128, 512);
  for (let row = 0; row < 86; row++) for (let col = 0; col < 22; col++) {
    const x = col * 6 + (row % 2) * 3, y = row * 6;
    ctx.fillStyle = '#bcbcbc'; ctx.beginPath(); ctx.arc(x, y, 1.8 + seeded(row * 22 + col) * 0.65, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#efefef'; ctx.beginPath(); ctx.arc(x - 0.5, y - 0.5, 0.8, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function seeded(index: number): number { const n = Math.sin(index * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
export function disposeKatana(group: THREE.Group, materials: KatanaMaterials): void {
  group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  const textures = new Set<THREE.Texture>();
  for (const material of Object.values(materials)) {
    for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    material.dispose();
  }
  textures.forEach((texture) => texture.dispose());
}
