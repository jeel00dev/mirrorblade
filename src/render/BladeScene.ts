import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildKatana, createKatanaMaterials, disposeKatana, type KatanaMaterials, type KatanaSkin } from './KatanaModel';
import { KATANA_DESIGNS } from '../config/katanas';
import { sampleKatanaMotion } from './KatanaMotion';
import { KatanaFlourish } from './KatanaFlourish';

export type BladeSkin = KatanaSkin;

/** upright: Home hero. dock: gameplay rack. showcase: Shop preview. slash: held by the game-over cinematic. */
export type BladePose = 'upright' | 'dock' | 'showcase' | 'slash';

export interface BladeState {
  charges: number;
  hover: boolean;
  /** 0–1 progress toward the next forge; the blade brightens as the ring fills. */
  energy: number;
  overdrive: boolean;
  fracture: boolean;
}

/**
 * The katana, rendered with Three.js into a transparent canvas that is re-parented between the gameplay blade
 * dock, the Home hero and the Shop preview. One WebGL context for the whole app. Motion is governed by state
 * (docs/katana-research.md §4) so the cut zone stays readable.
 */
export class BladeScene {
  public readonly canvas: HTMLCanvasElement;
  public triangles: number;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  private readonly group = new THREE.Group();
  private materials: KatanaMaterials;
  private model: THREE.Group;
  private design = KATANA_DESIGNS[0]!;
  private readonly flourish = new KatanaFlourish();
  private showcaseTime = 0;
  private showcasePaused = false;
  private detailView = false;
  private readonly floorShadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frame = 0;
  private running = false;
  private spin = 0.35;
  private speed = 0.55;
  private targetSpeed = 0.55;
  private burst = 0;
  private slashT = -1;
  private state: BladeState = { charges: 3, hover: false, energy: 0, overdrive: false, fracture: false };
  private hero = false;
  private pose: BladePose = 'dock';
  /** Slash pose: the sword is held perpendicular to its travel path, edge leading. */
  private slashTilt = Math.PI / 4;
  private slashFlip = false;
  private edgeGlow = 0;
  private reducedMotion = false;
  private width = 1;
  private height = 1;
  private readonly clock = new THREE.Clock();

  public constructor(private maxDpr = 2) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', premultipliedAlpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'blade-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.materials = createKatanaMaterials();
    const built = buildKatana(this.materials);
    this.model = built.group;
    this.triangles = built.triangles;
    this.group.add(built.group, this.flourish.group);
    this.canvas.dataset.bladeId = this.design.id;

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 5, 6);
    const fill = new THREE.DirectionalLight(0xcfe3ef, 0.8);
    fill.position.set(4, -2, 3);
    this.scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.4));

    this.floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.1),
      new THREE.MeshBasicMaterial({ map: softShadowTexture(), transparent: true, opacity: 0.55, depthWrite: false }),
    );
    this.floorShadow.rotation.x = -Math.PI / 2;
    this.floorShadow.position.y = -2.85;
    this.scene.add(this.floorShadow);

    this.scene.add(this.group);
    this.camera.position.set(0, 0.2, 10);
    this.camera.lookAt(0, -0.05, 0);
    this.animate = this.animate.bind(this);
  }

  /** Moves the canvas into a container and starts rendering there. With `travel`, the blade glides from its previous place. */
  public mount(container: HTMLElement, options: { hero?: boolean; travel?: boolean; pose?: BladePose } = {}): void {
    if (this.container === container) return;
    const from = options.travel && this.container ? this.canvas.getBoundingClientRect() : null;
    this.unmount();
    this.container = container;
    this.hero = Boolean(options.hero);
    this.pose = options.pose ?? (this.hero ? 'upright' : 'dock');
    this.group.rotation.order = this.pose === 'slash' ? 'ZYX' : 'XYZ';
    this.detailView = false;
    this.showcaseTime = 0;
    if (this.pose === 'slash') this.applySlashRotation();
    else this.group.rotation.set(0.10, 0.32, this.tiltFor());
    this.canvas.dataset.bladeView = 'full';
    container.append(this.canvas);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    if (from && !this.reducedMotion) this.travelFrom(from);
    this.floorShadow.visible = this.hero;
    this.floorShadow.position.y = this.pose === 'showcase' ? -1.95 : -2.85;
    this.floorShadow.scale.set(this.pose === 'showcase' ? 1.6 : 1, 1, 1);
    if (!this.running) {
      this.running = true;
      this.clock.start();
      this.frame = requestAnimationFrame(this.animate);
    }
  }

  private travelFrom(from: DOMRect): void {
    const to = this.canvas.getBoundingClientRect();
    if (to.width === 0 || to.height === 0) return;
    const scale = Math.max(0.2, from.height / to.height);
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    this.canvas.style.transition = 'none';
    this.canvas.style.transformOrigin = 'center';
    this.canvas.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    this.burst = Math.max(this.burst, 0.6);
    requestAnimationFrame(() => {
      this.canvas.style.transition = 'transform 520ms cubic-bezier(0.2, 0.75, 0.2, 1)';
      this.canvas.style.transform = 'translate(0, 0) scale(1)';
      window.setTimeout(() => { this.canvas.style.transition = ''; this.canvas.style.transform = ''; }, 560);
    });
  }

  public unmount(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.container = null;
    this.canvas.remove();
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  public setSkin(skin: BladeSkin): void {
    const design = skin.katana ?? KATANA_DESIGNS[0]!;
    if (this.design.id === design.id) return;
    this.group.remove(this.model);
    disposeKatana(this.model, this.materials);
    this.design = design;
    this.materials = createKatanaMaterials(design);
    const built = buildKatana(this.materials, design);
    this.model = built.group;
    this.triangles = built.triangles;
    this.group.add(this.model);
    this.showcaseTime = 0;
    this.canvas.dataset.bladeId = design.id;
    this.canvas.dataset.bladeTier = String(design.tier);
  }

  public replayShowcase(): void {
    this.showcaseTime = 0;
    this.showcasePaused = false;
  }

  public toggleShowcase(): boolean {
    this.showcasePaused = !this.showcasePaused;
    return this.showcasePaused;
  }

  public isShowcasePaused(): boolean { return this.showcasePaused; }

  public diagnostics(): Record<string, unknown> {
    return { id: this.design.id, triangles: this.triangles, calls: this.renderer.info.render.calls,
      geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures,
      phase: this.canvas.dataset.motionPhase, time: this.showcaseTime,
      rotation: [this.group.rotation.x, this.group.rotation.y, this.group.rotation.z],
      position: this.group.position.toArray(), effectsVisible: this.flourish.group.visible };
  }

  public toggleDetail(): boolean {
    this.detailView = !this.detailView;
    this.canvas.dataset.bladeView = this.detailView ? 'detail' : 'full';
    this.resize();
    return this.detailView;
  }

  public setState(next: Partial<BladeState>): void {
    this.state = { ...this.state, ...next };
    this.targetSpeed = this.state.charges <= 0 ? 0.08 : this.state.hover ? 3.2 : this.state.overdrive ? 1.4 : 0.55;
  }

  public setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  public setMaxDpr(value: number): void {
    this.maxDpr = value;
    this.resize();
  }

  /** Forge celebration: spin-up that settles, plus a bright edge flash. */
  public forgeBurst(): void {
    this.burst = 1;
  }

  /** A short edge pulse when energy lands. */
  public energyPulse(): void {
    this.burst = Math.max(this.burst, 0.25);
  }

  /** Specular flash for strong clears, 0–1. */
  public flash(strength: number): void {
    this.burst = Math.max(this.burst, Math.min(1, strength));
  }

  /**
   * Orientation for the `slash` pose. `tilt` is the rotation about the view axis (radians); `flip` turns the sword
   * over so the edge faces the other way for the mirrored diagonal. `glow` 0–1 lights the edge hairline.
   */
  public setSlashPose(options: { tilt?: number; flip?: boolean; glow?: number }): void {
    if (options.tilt !== undefined) this.slashTilt = options.tilt;
    if (options.flip !== undefined) this.slashFlip = options.flip;
    if (options.glow !== undefined) this.edgeGlow = Math.max(0, Math.min(1, options.glow));
    if (this.pose === 'slash') {
      this.applySlashRotation();
      if (options.tilt !== undefined) this.resize();
    }
  }

  /**
   * Slash pose rotation. Order ZYX: a roll about the sword's own length first (so the face turns toward the
   * environment lights instead of mirroring the dark wall behind the camera), then the on-screen tilt.
   */
  private applySlashRotation(): void {
    const roll = 0.42 + this.edgeGlow * 0.22;
    this.group.rotation.set(0.04, (this.slashFlip ? Math.PI : 0) + (this.slashFlip ? -roll : roll), this.slashTilt, 'ZYX');
  }

  /** One 200 ms slash on a cut. */
  public slash(): void {
    if (this.reducedMotion) { this.burst = Math.max(this.burst, 0.5); return; }
    this.slashT = 0;
    this.burst = Math.max(this.burst, 0.5);
  }

  public dispose(): void {
    this.unmount();
    disposeKatana(this.model, this.materials);
    this.flourish.dispose();
    this.floorShadow.geometry.dispose();
    this.floorShadow.material.map?.dispose();
    this.floorShadow.material.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  private resize(): void {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr));
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.camera.aspect = this.width / this.height;
    // Fit the tilted 5.3-unit sword: its bounding box depends on the pose tilt.
    const tilt = this.tiltFor();
    const half = this.detailView ? 0.96 : 2.8;
    const fill = this.pose === 'showcase' ? 0.9 : this.pose === 'slash' ? 0.94 : this.hero ? 0.92 : 0.9;
    const extentY = (Math.abs(Math.cos(tilt)) * half + 0.12) / fill;
    const extentX = (Math.abs(Math.sin(tilt)) * half + 0.2) / fill;
    const fovHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const byHeight = extentY / Math.tan(fovHalf);
    const byWidth = (extentX / this.camera.aspect) / Math.tan(fovHalf);
    const focus = this.detailView ? new THREE.Vector3(0, -1.85, 0).applyEuler(new THREE.Euler(0.10, 0.32, tilt)) : new THREE.Vector3(0, -0.05, 0);
    this.camera.position.set(focus.x, focus.y + 0.2, Math.max(byHeight, byWidth));
    this.camera.lookAt(focus);
    this.camera.updateProjectionMatrix();
  }

  private tiltFor(): number {
    return this.pose === 'upright' ? -0.12 : this.pose === 'showcase' ? -1.08 : this.pose === 'slash' ? this.slashTilt : -0.55;
  }

  private animate(): void {
    if (!this.running) return;
    const delta = Math.min(0.05, this.clock.getDelta());
    if (document.hidden || !this.container?.isConnected) {
      this.frame = requestAnimationFrame(this.animate);
      return;
    }
    const time = this.clock.elapsedTime;
    if (this.pose === 'slash') {
      // Held still by the cinematic: no sway, no spin, the edge lit as hard as the caller asks.
      this.applySlashRotation();
      this.group.position.y = 0;
      this.flourish.group.visible = false;
      this.materials.steel.roughness = 0.16;
      this.materials.steel.envMapIntensity = 1.6 + this.edgeGlow * 1.4;
      this.materials.edge.opacity = this.edgeGlow;
      this.renderer.render(this.scene, this.camera);
      this.frame = requestAnimationFrame(this.animate);
      return;
    }
    if (this.hero && !this.reducedMotion && !this.showcasePaused) this.showcaseTime += delta;
    const motion = sampleKatanaMotion(this.design, this.showcaseTime, this.reducedMotion || this.showcasePaused || this.detailView);
    this.canvas.dataset.motionPhase = this.hero ? motion.phase : 'gameplay';
    const burstSpeed = this.burst > 0 ? 8.5 * this.burst : 0;
    if (this.burst > 0) this.burst = Math.max(0, this.burst - delta * 1.5);
    const jitter = this.state.fracture ? Math.sin(time * 9) * 0.3 : 0;
    const target = this.reducedMotion ? 0 : this.targetSpeed + burstSpeed + jitter;
    this.speed += (target - this.speed) * Math.min(1, delta * 5);
    this.spin += this.speed * delta;
    // Gameplay keeps its state-driven sway; Home and Shop use the flourish / hold cycle.
    const sway = 0.55 + Math.sin(this.spin * 0.9) * 0.6;
    const fullSpin = this.burst > 0.3 || this.state.hover;
    this.group.rotation.y = this.hero ? motion.yaw : this.reducedMotion ? 0.32 : fullSpin ? this.spin : sway;
    this.group.rotation.x = this.hero || this.reducedMotion ? 0.10 : 0.10 + Math.sin(time * 0.7) * 0.03;
    const tilt = this.tiltFor();
    // Slash: a single swing of the whole sword on the cut.
    if (this.hero) this.group.rotation.z = tilt + motion.tilt;
    else if (this.slashT >= 0) {
      this.slashT += delta / 0.2;
      const s = Math.min(1, this.slashT);
      this.group.rotation.z = tilt + (s < 0.4 ? -0.5 * (s / 0.4) : -0.5 + 0.85 * ((s - 0.4) / 0.6));
      if (this.slashT >= 1) { this.slashT = -1; this.group.rotation.z = tilt; }
    } else this.group.rotation.z += (tilt - this.group.rotation.z) * Math.min(1, delta * 6);
    this.group.position.y = this.hero ? motion.lift : 0;
    this.flourish.update(this.design, motion, this.hero && !this.detailView);

    const dull = !this.hero && this.state.charges <= 0;
    const full = this.state.energy >= 0.999;
    const sweep = !this.hero && full && !this.reducedMotion ? Math.max(0, Math.sin(time * 3.9)) * 0.55 : 0;
    this.materials.steel.roughness = dull ? 0.55 : 0.2 - this.state.energy * 0.05;
    this.materials.steel.envMapIntensity = dull ? 0.45 : 1.3 + this.state.energy * 0.35 + (this.state.hover ? 0.35 : 0) + this.burst * 1.3 + sweep + (this.state.overdrive ? 0.25 : 0);
    this.materials.edge.opacity = dull ? 0 : Math.min(1, this.burst * 0.9 + sweep * 0.6 + (this.state.hover ? 0.25 : 0));
    if (this.hero) {
      this.materials.steel.roughness = 0.25;
      this.materials.steel.envMapIntensity = 1.4 + motion.strength * 0.25;
      this.materials.edge.opacity = this.design.tier > 2 ? motion.strength * 0.28 : 0;
    }
    this.floorShadow.material.opacity = 0.48;
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  }
}

function softShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 32, 4, 64, 32, 60);
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.scale(1, 0.5);
  ctx.translate(0, 32);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
