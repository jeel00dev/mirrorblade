import * as THREE from 'three';
import type { KatanaDesign } from '../config/katanas';
import { KATANA, bladeSection } from './KatanaModel';
import type { KatanaMotion } from './KatanaMotion';

/** Three pooled draw calls; signature effects are only visible in Home / catalog. */
export class KatanaFlourish {
  public readonly group = new THREE.Group();
  private readonly positions = new Float32Array(720 * 6);
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material = new THREE.LineBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  private readonly motes = new Float32Array(36 * 3);
  private readonly moteGeometry = new THREE.BufferGeometry();
  private readonly moteMaterial = new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly glintMaterial = new THREE.MeshBasicMaterial({ color: '#f6f1df', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  private readonly glint = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.012), this.glintMaterial);
  private count = 0;

  public constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.moteGeometry.setAttribute('position', new THREE.BufferAttribute(this.motes, 3).setUsage(THREE.DynamicDrawUsage));
    const lines = new THREE.LineSegments(this.geometry, this.material);
    const points = new THREE.Points(this.moteGeometry, this.moteMaterial);
    lines.frustumCulled = false; points.frustumCulled = false;
    this.group.add(lines, points, this.glint);
    this.group.position.y = KATANA.centerOffset;
    this.group.visible = false;
  }

  public update(design: KatanaDesign, motion: KatanaMotion, enabled: boolean): void {
    this.group.visible = enabled && motion.strength > 0.001;
    if (!this.group.visible) return;
    const { progress: p, strength } = motion;
    this.material.color.set(design.colors[3]);
    this.moteMaterial.color.set(design.colors[3]);
    this.material.opacity = strength * (design.tier < 3 ? 0.48 : 0.65);
    this.moteMaterial.opacity = strength * 0.65;
    this.count = 0;
    if (design.motif === 'moon' || design.motif === 'sun') {
      const turns = design.motif === 'sun' ? 2 : 1;
      for (let ring = 0; ring < turns; ring++) {
        const radius = (design.motif === 'sun' ? 0.95 : 0.72) + ring * 0.1 + p * 0.12;
        const end = design.motif === 'sun' ? Math.PI * 2 : Math.PI * 1.5;
        for (let i = 0; i < 100; i++) {
          const a = i / 100 * end + p * 0.6, b = (i + 1) / 100 * end + p * 0.6;
          this.segment(Math.cos(a) * radius, 1.45 + Math.sin(a) * radius, -0.15, Math.cos(b) * radius, 1.45 + Math.sin(b) * radius, -0.15);
        }
      }
      if (design.motif === 'sun') for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        this.segment(Math.cos(a) * 1.16, 1.45 + Math.sin(a) * 1.16, -0.16, Math.cos(a) * (i % 3 === 0 ? 1.38 : 1.25), 1.45 + Math.sin(a) * (i % 3 === 0 ? 1.38 : 1.25), -0.16);
      }
    }
    if (design.motif === 'tide' || design.motif === 'storm') {
      for (let ribbon = 0; ribbon < (design.motif === 'storm' ? 3 : 2); ribbon++) {
        const xAt = (t: number): number => {
          const wave = design.motif === 'storm' ? Math.sin(t * 75 + ribbon * 7) * 0.07 : Math.sin(t * 13 - p * 5 + ribbon * Math.PI) * 0.17;
          return (ribbon % 2 ? -1 : 1) * (0.12 + Math.sin(t * Math.PI) * 0.12) + wave;
        };
        for (let i = 0; i < 80; i++) {
          const a = i / 80, b = (i + 1) / 80;
          this.segment(xAt(a), a * 3.6, 0.07, xAt(b), b * 3.6, 0.07);
          if (design.motif === 'storm' && i % 12 === 0) this.segment(xAt(a), a * 3.6, 0.07, xAt(a) + (ribbon % 2 ? -0.18 : 0.18), a * 3.6 - 0.16, 0.07);
        }
      }
    }
    this.geometry.setDrawRange(0, this.count * 2);
    this.geometry.getAttribute('position').needsUpdate = true;
    const particleCount = design.motif === 'steel' ? 0 : design.tier * 6;
    for (let i = 0; i < particleCount; i++) {
      const a = i * 2.39996 + p * 0.7;
      const spread = 0.25 + (i % 5) * 0.12 + p * 0.25;
      this.motes[i * 3] = Math.cos(a) * spread;
      this.motes[i * 3 + 1] = ((i * 0.618 + p * 0.3) % 1) * 3.8 - 0.3;
      this.motes[i * 3 + 2] = Math.sin(a) * 0.12;
    }
    this.moteGeometry.setDrawRange(0, particleCount);
    this.moteGeometry.getAttribute('position').needsUpdate = true;
    const t = Math.min(0.99, p * 1.1);
    this.glint.position.set(bladeSection(design, t).edge, t * 3.6, 0.065);
    this.glint.rotation.z = -0.18;
    this.glint.scale.x = 0.5 + strength;
    this.glintMaterial.opacity = strength * 0.8;
  }
  private segment(ax: number, ay: number, az: number, bx: number, by: number, bz: number): void {
    const i = this.count++ * 6;
    this.positions[i] = ax; this.positions[i + 1] = ay; this.positions[i + 2] = az;
    this.positions[i + 3] = bx; this.positions[i + 4] = by; this.positions[i + 5] = bz;
  }
  public dispose(): void {
    this.geometry.dispose(); this.material.dispose();
    this.moteGeometry.dispose(); this.moteMaterial.dispose();
    this.glint.geometry.dispose(); this.glintMaterial.dispose();
  }
}
