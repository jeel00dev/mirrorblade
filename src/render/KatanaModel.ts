import * as THREE from 'three';

/**
 * Procedural katana. Proportions follow docs/katana-research.md (1 unit ≈ 20 cm):
 * nagasa 3.6, sori 0.085 with forward bias, chū-kissaki 0.32, habaki, seppa, rounded-square tsuba,
 * fuchi, 1.3 tsuka with an ito wrap texture, kashira, one cyan menuki. Blade points +Y, edge faces −X.
 * ≈ 1.6k triangles, one 128×512 generated texture.
 */

export interface KatanaMaterials {
  steel: THREE.MeshPhysicalMaterial;
  fittings: THREE.MeshStandardMaterial;
  habaki: THREE.MeshStandardMaterial;
  wrap: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  edge: THREE.MeshBasicMaterial;
}

export interface KatanaSkin {
  /** [steel, fittings, wrap, accent] */
  readonly colors: readonly string[];
}

export const KATANA = {
  nagasa: 3.6,
  sori: 0.085,
  widthBase: 0.16,
  widthTip: 0.11,
  thicknessBase: 0.036,
  thicknessTip: 0.024,
  shinogi: 0.62,
  kissaki: 0.32,
  habaki: 0.13,
  tsubaSize: 0.4,
  tsubaThickness: 0.05,
  tsuka: 1.3,
  /** Vertical offset so the whole sword is centred on the origin. */
  centerOffset: -1.05,
} as const;

export function createKatanaMaterials(): KatanaMaterials {
  return {
    steel: new THREE.MeshPhysicalMaterial({ color: 0xe6eaeb, metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 1.35, vertexColors: true }),
    fittings: new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.85, roughness: 0.5 }),
    habaki: new THREE.MeshStandardMaterial({ color: 0x8f7a55, metalness: 0.9, roughness: 0.45 }),
    wrap: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.85, map: wrapTexture('#1e2024', '#6a6d72') }),
    accent: new THREE.MeshStandardMaterial({ color: 0x43c2c7, emissive: 0x43c2c7, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.4 }),
    edge: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  };
}

export function applyKatanaSkin(materials: KatanaMaterials, skin: KatanaSkin): void {
  const [steel = '#e6eaeb', fittings = '#2b2f36', wrap = '#1e2024', accent = '#43c2c7'] = skin.colors;
  materials.steel.color.set(steel);
  materials.fittings.color.set(fittings);
  materials.habaki.color.copy(new THREE.Color(0x8f7a55).lerp(new THREE.Color(fittings), 0.3));
  materials.wrap.map?.dispose();
  materials.wrap.map = wrapTexture(wrap, mixHex(wrap, '#ffffff', 0.32));
  materials.wrap.needsUpdate = true;
  materials.accent.color.set(accent);
  materials.accent.emissive.set(accent);
  materials.edge.color.set(accent);
  for (const material of [materials.steel, materials.fittings, materials.habaki, materials.accent]) material.needsUpdate = true;
}

export function buildKatana(materials: KatanaMaterials): { group: THREE.Group; triangles: number } {
  const group = new THREE.Group();
  let triangles = 0;
  const add = (mesh: THREE.Mesh): void => {
    group.add(mesh);
    const index = mesh.geometry.index;
    triangles += index ? index.count / 3 : mesh.geometry.attributes.position!.count / 3;
  };

  add(new THREE.Mesh(bladeGeometry(), materials.steel));

  // Cutting-line hairline along the ha (edge), used only for energy / forge flashes.
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, KATANA.nagasa * 0.9, 0.02), materials.edge);
  edge.position.set(-KATANA.widthBase * 0.46, KATANA.nagasa * 0.47, 0);
  edge.name = 'edge';
  add(edge);

  const habaki = new THREE.Mesh(new THREE.BoxGeometry(KATANA.widthBase * 1.25, KATANA.habaki, KATANA.thicknessBase * 2.4), materials.habaki);
  habaki.position.y = -KATANA.habaki / 2;
  add(habaki);

  for (const offset of [0, -KATANA.tsubaThickness - 0.012]) {
    const seppa = new THREE.Mesh(new THREE.BoxGeometry(KATANA.widthBase * 1.7, 0.012, KATANA.thicknessBase * 3.2), materials.fittings);
    seppa.position.y = -KATANA.habaki - 0.006 + offset;
    add(seppa);
  }

  const tsuba = new THREE.Mesh(tsubaGeometry(), materials.fittings);
  tsuba.rotation.x = Math.PI / 2;
  tsuba.position.y = -KATANA.habaki - 0.012 - KATANA.tsubaThickness / 2;
  add(tsuba);

  const tsukaTop = -KATANA.habaki - 0.024 - KATANA.tsubaThickness;
  const fuchi = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.078, 0.07, 24), materials.fittings);
  fuchi.scale.z = 0.66;
  fuchi.position.y = tsukaTop - 0.035;
  add(fuchi);

  const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.07, KATANA.tsuka, 24, 1, false), materials.wrap);
  tsuka.scale.z = 0.66;
  tsuka.position.y = tsukaTop - 0.07 - KATANA.tsuka / 2;
  add(tsuka);

  const kashira = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.062, 0.07, 24), materials.fittings);
  kashira.scale.z = 0.66;
  kashira.position.y = tsukaTop - 0.07 - KATANA.tsuka - 0.035;
  add(kashira);

  const menuki = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.012), materials.accent);
  menuki.position.set(0, tsukaTop - 0.07 - KATANA.tsuka * 0.42, 0.052);
  menuki.rotation.z = 0.25;
  add(menuki);

  group.position.y = KATANA.centerOffset;
  return { group, triangles };
}

/** Shinogi-zukuri blade: 8-vertex rings (edge, hamon, shinogi, mune ×2 + apex) swept along a curved centreline. */
function bladeGeometry(): THREE.BufferGeometry {
  const rings = 72;
  const perRing = 8;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const body = new THREE.Color(0.86, 0.87, 0.88);
  const hamon = new THREE.Color(0.94, 0.95, 0.96);
  const kissakiStart = 1 - KATANA.kissaki / KATANA.nagasa;

  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const y = t * KATANA.nagasa;
    // Sori: the centreline bows toward the spine, peaking slightly forward of the middle.
    const bow = KATANA.sori * 4 * Math.pow(t, 1.15) * (1 - t);
    const taper = 1 - (1 - KATANA.widthTip / KATANA.widthBase) * t;
    const width = KATANA.widthBase * taper;
    let thickness = KATANA.thicknessBase - (KATANA.thicknessBase - KATANA.thicknessTip) * t;
    let xEdge = bow - width / 2;
    const xSpine = bow + width / 2;
    if (t > kissakiStart) {
      // Kissaki: the edge sweeps up to meet the spine at the point; thickness fades with it.
      const u = (t - kissakiStart) / (1 - kissakiStart);
      const k = Math.sqrt(Math.max(0, 1 - u * u));
      xEdge = xSpine - width * k;
      thickness *= Math.max(0.05, k);
    }
    const span = xSpine - xEdge;
    const xShinogi = xEdge + span * KATANA.shinogi;
    const hamonFraction = 0.36 + 0.07 * Math.sin(t * 27) + 0.04 * Math.sin(t * 11 + 1.3);
    const xHamon = xEdge + span * Math.min(KATANA.shinogi - 0.05, hamonFraction);
    const half = thickness / 2;
    const ringPoints: [number, number, boolean][] = [
      [xEdge, 0, true],
      [xHamon, half * 0.55, true],
      [xShinogi, half, false],
      [xSpine - span * 0.06, half * 0.45, false],
      [xSpine, 0, false],
      [xSpine - span * 0.06, -half * 0.45, false],
      [xShinogi, -half, false],
      [xHamon, -half * 0.55, true],
    ];
    for (const [x, z, light] of ringPoints) {
      positions.push(x, y, z);
      const color = light ? hamon : body;
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    const a = ring * perRing;
    const b = a + perRing;
    for (let corner = 0; corner < perRing; corner += 1) {
      const next = (corner + 1) % perRing;
      indices.push(a + corner, b + corner, a + next, a + next, b + corner, b + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  geometry.dispose();
  return flat;
}

/** Rounded-square tsuba with the blade slot through the centre. */
function tsubaGeometry(): THREE.BufferGeometry {
  const size = KATANA.tsubaSize;
  const radius = size * 0.28;
  const half = size / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half + radius, -half);
  shape.lineTo(half - radius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + radius);
  shape.lineTo(half, half - radius);
  shape.quadraticCurveTo(half, half, half - radius, half);
  shape.lineTo(-half + radius, half);
  shape.quadraticCurveTo(-half, half, -half, half - radius);
  shape.lineTo(-half, -half + radius);
  shape.quadraticCurveTo(-half, -half, -half + radius, -half);
  const slot = new THREE.Path();
  const sw = KATANA.widthBase * 0.62;
  const sh = KATANA.thicknessBase * 1.3;
  slot.moveTo(-sw, -sh); slot.lineTo(sw, -sh); slot.lineTo(sw, sh); slot.lineTo(-sw, sh); slot.closePath();
  shape.holes.push(slot);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: KATANA.tsubaThickness, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10 });
  geometry.center();
  return geometry;
}

/** Ito wrap: alternating diamonds of samé showing through the crossing bands. */
function wrapTexture(wrapColor: string, nodeColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = wrapColor;
  ctx.fillRect(0, 0, 128, 512);
  // Samé nodes: soft speckle field.
  ctx.fillStyle = nodeColor;
  for (let index = 0; index < 900; index += 1) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.arc(Math.random() * 128, Math.random() * 512, 0.8 + Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Crossing bands leave a column of alternating diamonds down the middle.
  const bandHeight = 40;
  ctx.fillStyle = wrapColor;
  for (let y = -bandHeight; y < 512 + bandHeight; y += bandHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(128, y + bandHeight * 0.55); ctx.lineTo(128, y + bandHeight); ctx.lineTo(0, y + bandHeight * 0.45); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(128, y + bandHeight * 0.5); ctx.lineTo(0, y + bandHeight * 1.05); ctx.lineTo(0, y + bandHeight * 1.5); ctx.lineTo(128, y + bandHeight * 0.95); ctx.closePath();
    ctx.fill();
  }
  // Band edges catch a little light.
  ctx.strokeStyle = mixHex(wrapColor, '#ffffff', 0.12);
  ctx.lineWidth = 1;
  for (let y = -bandHeight; y < 512 + bandHeight; y += bandHeight) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y + bandHeight * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, y + bandHeight * 0.5); ctx.lineTo(0, y + bandHeight * 1.05); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1.6);
  return texture;
}

function mixHex(a: string, b: string, t: number): string {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}
