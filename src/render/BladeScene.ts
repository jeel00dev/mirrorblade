import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { applyKatanaSkin, buildKatana, createKatanaMaterials, type KatanaMaterials, type KatanaSkin } from './KatanaModel';

export type BladeSkin = KatanaSkin;

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
  public readonly triangles: number;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  private readonly group = new THREE.Group();
  private readonly materials: KatanaMaterials;
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
  private pose: 'upright' | 'dock' | 'showcase' = 'dock';
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
    this.triangles = built.triangles;
    this.group.add(built.group);

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-3, 5, 6);
    const fill = new THREE.DirectionalLight(0xcfe3ef, 0.45);
    fill.position.set(4, -2, 3);
    this.scene.add(key, fill, new THREE.AmbientLight(0xffffff, 0.22));

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
  public mount(container: HTMLElement, options: { hero?: boolean; travel?: boolean; pose?: 'upright' | 'dock' | 'showcase' } = {}): void {
    if (this.container === container) return;
    const from = options.travel && this.container ? this.canvas.getBoundingClientRect() : null;
    this.unmount();
    this.container = container;
    this.hero = Boolean(options.hero);
    this.pose = options.pose ?? (this.hero ? 'upright' : 'dock');
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
    applyKatanaSkin(this.materials, skin);
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

  /** One 200 ms slash on a cut. */
  public slash(): void {
    if (this.reducedMotion) { this.burst = Math.max(this.burst, 0.5); return; }
    this.slashT = 0;
    this.burst = Math.max(this.burst, 0.5);
  }

  public dispose(): void {
    this.unmount();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
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
    const half = 2.8;
    const fill = this.pose === 'showcase' ? 0.78 : this.hero ? 0.92 : 0.9;
    const extentY = (Math.abs(Math.cos(tilt)) * half + 0.12) / fill;
    const extentX = (Math.abs(Math.sin(tilt)) * half + 0.2) / fill;
    const fovHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const byHeight = extentY / Math.tan(fovHalf);
    const byWidth = (extentX / this.camera.aspect) / Math.tan(fovHalf);
    this.camera.position.z = Math.max(byHeight, byWidth);
    this.camera.updateProjectionMatrix();
  }

  private tiltFor(): number {
    return this.pose === 'upright' ? 0 : this.pose === 'showcase' ? -0.95 : -0.55;
  }

  private animate(): void {
    if (!this.running) return;
    const delta = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.elapsedTime;
    const burstSpeed = this.burst > 0 ? 8.5 * this.burst : 0;
    if (this.burst > 0) this.burst = Math.max(0, this.burst - delta * 1.5);
    const jitter = this.state.fracture ? Math.sin(time * 9) * 0.3 : 0;
    const target = this.reducedMotion ? 0 : this.targetSpeed + burstSpeed + jitter;
    this.speed += (target - this.speed) * Math.min(1, delta * 5);
    this.spin += this.speed * delta;
    // Hero: full slow rotation. Dock / showcase: a limited yaw sway so the blade face never vanishes into a line,
    // except while a burst (forge, hover) spins it fully.
    const sway = this.pose === 'upright' ? this.spin : 0.55 + Math.sin(this.spin * 0.9) * 0.6;
    const fullSpin = this.burst > 0.3 || this.state.hover;
    this.group.rotation.y = this.reducedMotion ? 0.55 : fullSpin || this.pose === 'upright' ? this.spin : sway;
    this.group.rotation.x = this.reducedMotion ? 0.06 : 0.06 + Math.sin(time * 0.7) * 0.03;
    const tilt = this.tiltFor();
    // Slash: a single swing of the whole sword on the cut.
    if (this.slashT >= 0) {
      this.slashT += delta / 0.2;
      const s = Math.min(1, this.slashT);
      this.group.rotation.z = tilt + (s < 0.4 ? -0.5 * (s / 0.4) : -0.5 + 0.85 * ((s - 0.4) / 0.6));
      if (this.slashT >= 1) { this.slashT = -1; this.group.rotation.z = tilt; }
    } else this.group.rotation.z += (tilt - this.group.rotation.z) * Math.min(1, delta * 6);
    this.group.position.y = this.hero && !this.reducedMotion ? Math.sin(time * 1.1) * 0.06 : 0;

    const dull = this.state.charges <= 0;
    const full = this.state.energy >= 0.999;
    const sweep = full && !this.reducedMotion ? Math.max(0, Math.sin(time * 3.9)) * 0.55 : 0;
    this.materials.steel.roughness = dull ? 0.55 : 0.2 - this.state.energy * 0.05;
    this.materials.steel.envMapIntensity = dull ? 0.45 : 1.3 + this.state.energy * 0.35 + (this.state.hover ? 0.35 : 0) + this.burst * 1.3 + sweep + (this.state.overdrive ? 0.25 : 0);
    this.materials.edge.opacity = dull ? 0 : Math.min(1, this.burst * 0.9 + sweep * 0.6 + (this.state.hover ? 0.25 : 0));
    this.floorShadow.material.opacity = 0.42 + Math.abs(Math.sin(this.spin)) * 0.16;
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
