import { CINEMATIC } from '../config/cinematic';
import type { BoardCell } from '../game/BoardState';
import type { GridCell } from '../game/Piece';
import { SeededRandom } from '../game/SeededRandom';
import type { BladeScene } from './BladeScene';
import type { BoardView } from './BoardView';
import type { EffectsLayer } from './EffectsLayer';

/**
 * The katana game-over sequence: run lock → freeze → katana enters → diagonal slash → hit-stop → blocks pop and fall
 * → mirror goes dark → results. The class owns its own DOM layer and timeline; the coordinator (Game) reacts to the
 * events below for audio, HUD, phase changes and the results overlay. Timeline and physics are pure functions so they
 * can be tested without a browser. Research: docs/game-over-animation-research.md.
 */
export type CinematicEvent =
  | 'CINEMATIC_START' | 'KATANA_ENTER' | 'KATANA_SLASH_START' | 'KATANA_IMPACT'
  | 'BLOCKS_RELEASE' | 'BLOCKS_FALL' | 'BOARD_SETTLED' | 'RESULTS_REVEAL' | 'CINEMATIC_END';

export const CINEMATIC_EVENTS: readonly CinematicEvent[] = [
  'CINEMATIC_START', 'KATANA_ENTER', 'KATANA_SLASH_START', 'KATANA_IMPACT', 'BLOCKS_RELEASE', 'BLOCKS_FALL', 'BOARD_SETTLED', 'RESULTS_REVEAL', 'CINEMATIC_END',
];

export type SlashDirection = 'tr-bl' | 'tl-br';

export interface CinematicTimeline {
  at: Record<CinematicEvent, number>;
  /** Katana leaves the board corner (end of the slash travel, after the hit-stop). */
  slashEnd: number;
  /** Katana fully off-screen. */
  katanaGone: number;
  total: number;
  reducedMotion: boolean;
}

export interface CinematicOptions {
  reason: 'stuck' | 'fracture' | 'timeout';
  isNewBest: boolean;
  direction: SlashDirection;
  reducedMotion: boolean;
  seed: number;
  /** Spawn cut sparks on the blocks nearest the line (off on low quality). */
  particles: boolean;
}

interface Point { x: number; y: number }
interface Rect { left: number; top: number; width: number; height: number }

export interface SlashGeometry {
  rect: Rect;
  center: Point;
  entry: Point;
  exit: Point;
  /** Unit travel direction and its left-hand normal (screen coordinates, y down). */
  dir: Point;
  normal: Point;
  /** CSS rotation of the travel direction in degrees. */
  angleDeg: number;
  diagonal: number;
}

export interface KatanaPath {
  /** Square canvas side in px (the sword is about as long as the side). */
  size: number;
  /** Waypoints of the sword TIP: outside → entry corner → axis → exit corner → gone. */
  start: Point;
  entry: Point;
  center: Point;
  exit: Point;
  end: Point;
  /** Three.js rotation about the view axis and whether the sword is turned over (edge facing the other way). */
  tilt: number;
  flip: boolean;
  /** Screen offset from the canvas centre to the tip. */
  tipOffset: Point;
}

export interface BlockPlan {
  cell: GridCell;
  pieceId: string;
  /** Client-space top-left and size of the block at rest. */
  x: number;
  y: number;
  size: number;
  /** 0–1 along the slash from entry to exit; signed distance from the line in cells. */
  proj: number;
  dist: number;
  near: boolean;
  delayMs: number;
  popMs: number;
  popScale: number;
  /** Individual fall motion (px/s, px/s, deg/s) and the motion shared with the rest of the piece. */
  vx: number;
  vy: number;
  omega: number;
  group: { vx: number; vy: number; omega: number };
}

export interface BlockPose {
  dx: number;
  dy: number;
  rotation: number;
  scale: number;
  stage: 'rest' | 'pop' | 'fall';
}

// ------------------------------------------------------------------ pure timeline and physics

export function buildTimeline(reducedMotion: boolean): CinematicTimeline {
  if (reducedMotion) {
    const r = CINEMATIC.reduced;
    return {
      at: {
        CINEMATIC_START: 0, KATANA_ENTER: r.flashMs, KATANA_SLASH_START: r.flashMs, KATANA_IMPACT: r.flashMs,
        BLOCKS_RELEASE: r.flashMs + 60, BLOCKS_FALL: r.flashMs + 60, BOARD_SETTLED: r.settleMs, RESULTS_REVEAL: r.resultsMs, CINEMATIC_END: r.endMs,
      },
      slashEnd: r.flashMs, katanaGone: r.flashMs, total: r.endMs, reducedMotion: true,
    };
  }
  const enter = CINEMATIC.anticipationMs;
  const slashStart = enter + CINEMATIC.enterMs;
  const impact = slashStart + CINEMATIC.slashMs / 2;
  const release = impact + CINEMATIC.hitStopMs;
  const slashEnd = release + CINEMATIC.slashMs / 2;
  const fall = release + CINEMATIC.popMs;
  const settled = fall + CINEMATIC.fallMs;
  const results = settled + CINEMATIC.settleToResultsMs;
  const end = results + CINEMATIC.resultsTailMs;
  return {
    at: { CINEMATIC_START: 0, KATANA_ENTER: enter, KATANA_SLASH_START: slashStart, KATANA_IMPACT: impact, BLOCKS_RELEASE: release, BLOCKS_FALL: fall, BOARD_SETTLED: settled, RESULTS_REVEAL: results, CINEMATIC_END: end },
    slashEnd, katanaGone: slashEnd + CINEMATIC.exitMs, total: end, reducedMotion: false,
  };
}

export function slashGeometry(rect: Rect, direction: SlashDirection): SlashGeometry {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const entry = direction === 'tr-bl' ? { x: right, y: rect.top } : { x: rect.left, y: rect.top };
  const exit = direction === 'tr-bl' ? { x: rect.left, y: bottom } : { x: right, y: bottom };
  const diagonal = Math.hypot(exit.x - entry.x, exit.y - entry.y) || 1;
  const dir = { x: (exit.x - entry.x) / diagonal, y: (exit.y - entry.y) / diagonal };
  return {
    rect, entry, exit, dir, diagonal,
    center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    normal: { x: -dir.y, y: dir.x },
    angleDeg: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
  };
}

/**
 * Katana size and waypoints. The sword is scaled from the board diagonal and travels from outside the visible area,
 * through the entry corner and the axis, out through the opposite corner. On narrow viewports the sword is smaller
 * and starts at the viewport edge so the travel stays short.
 */
export function katanaPath(geometry: SlashGeometry, viewport: { width: number; height: number }): KatanaPath {
  const phone = viewport.width <= CINEMATIC.phoneMaxWidth;
  const wanted = geometry.diagonal * (phone ? CINEMATIC.katanaScalePhone : CINEMATIC.katanaScale);
  const size = Math.max(120, Math.min(wanted, Math.min(viewport.width, viewport.height) * 0.9));
  const { dir, entry, exit, center } = geometry;
  // The sword lies along the diagonal, tip leading, leaned 17° so the edge (−X on the model) faces into the travel.
  // The mirrored diagonal turns the sword over instead of mirroring the tilt so the edge still leads.
  const tilt = (3 * Math.PI) / 4 - 0.3;
  const flip = dir.x > 0;
  const bladeDir = { x: (flip ? 1 : -1) * Math.sin(tilt), y: -Math.cos(tilt) };
  const tipOffset = { x: bladeDir.x * size * 0.48, y: bladeDir.y * size * 0.48 };
  const approach = phone ? size * 0.35 : size * 0.6;
  const start = { x: entry.x - dir.x * approach, y: entry.y - dir.y * approach };
  const clear = size * 1.05;
  const end = { x: exit.x + dir.x * clear, y: exit.y + dir.y * clear };
  return { size, start, entry, center, exit, end, tilt, flip, tipOffset };
}

const lerp = (a: Point, b: Point, u: number): Point => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const easeInQuad = (u: number): number => u * u;
const easeOutQuad = (u: number): number => 1 - (1 - u) * (1 - u);
const easeOutCubic = (u: number): number => 1 - (1 - u) ** 3;
const smoothstep = (u: number): number => { const c = clamp01(u); return c * c * (3 - 2 * c); };

export interface KatanaPose { x: number; y: number; visible: boolean; glow: number; /** 0–1 progress of the cut along the board diagonal. */ cut: number }

/** Katana tip at `t` ms on the full-motion timeline. */
export function katanaPose(t: number, path: KatanaPath, timeline: CinematicTimeline, jitter = 0): KatanaPose {
  const { at, slashEnd, katanaGone } = timeline;
  const half = CINEMATIC.slashMs / 2;
  let position: Point;
  let glow: number;
  let cut = 0;
  let visible = true;
  if (t < at.KATANA_ENTER) { position = path.start; glow = 0; visible = false; }
  else if (t < at.KATANA_SLASH_START) {
    const u = clamp01((t - at.KATANA_ENTER) / CINEMATIC.enterMs);
    position = lerp(path.start, path.entry, easeInQuad(u));
    glow = 0.25 + u * 0.45;
  } else if (t < at.KATANA_IMPACT) {
    const u = clamp01((t - at.KATANA_SLASH_START) / half);
    position = lerp(path.entry, path.center, u);
    glow = 0.8;
    cut = u * 0.5;
  } else if (t < at.BLOCKS_RELEASE) { position = path.center; glow = 1; cut = 0.5; }
  else if (t < slashEnd) {
    const u = clamp01((t - at.BLOCKS_RELEASE) / half);
    position = lerp(path.center, path.exit, u);
    glow = 1 - u * 0.4;
    cut = 0.5 + u * 0.5;
  } else if (t < katanaGone) {
    const u = clamp01((t - slashEnd) / CINEMATIC.exitMs);
    position = lerp(path.exit, path.end, easeOutQuad(u));
    glow = 0.6 * (1 - u);
    cut = 1;
  } else { position = path.end; glow = 0; cut = 1; visible = false; }
  if (jitter && visible && t < slashEnd) {
    const wobble = Math.sin(t * 0.9) * jitter;
    const n = { x: -(path.exit.y - path.entry.y), y: path.exit.x - path.entry.x };
    const len = Math.hypot(n.x, n.y) || 1;
    position = { x: position.x + (n.x / len) * wobble, y: position.y + (n.y / len) * wobble };
  }
  return { x: position.x, y: position.y, visible, glow, cut };
}

/** Per-block release plan. Deterministic for a seed so the same board always falls the same way. */
export function planBlocks(
  blocks: readonly { cell: GridCell; model: BoardCell }[],
  geometry: SlashGeometry,
  cellPx: number,
  random: SeededRandom,
): BlockPlan[] {
  const groups = new Map<string, BlockPlan['group']>();
  const groupFor = (pieceId: string, side: number): BlockPlan['group'] => {
    let group = groups.get(pieceId);
    if (!group) {
      const spin = CINEMATIC.spinMinDeg + random.next() * (CINEMATIC.spinMaxDeg - CINEMATIC.spinMinDeg);
      const flip = random.next() < 0.2 ? -1 : 1;
      const drift = CINEMATIC.driftCells * cellPx * 0.6 * side;
      group = {
        vx: geometry.normal.x * drift + (random.next() - 0.5) * CINEMATIC.driftCells * cellPx,
        vy: geometry.normal.y * drift - random.next() * CINEMATIC.kickCells * cellPx,
        omega: spin * side * flip,
      };
      groups.set(pieceId, group);
    }
    return group;
  };
  return blocks.map(({ cell, model }) => {
    const x = geometry.rect.left + cell.col * cellPx;
    const y = geometry.rect.top + cell.row * cellPx;
    const cx = x + cellPx / 2 - geometry.entry.x;
    const cy = y + cellPx / 2 - geometry.entry.y;
    const proj = clamp01((cx * geometry.dir.x + cy * geometry.dir.y) / geometry.diagonal);
    const dist = (cx * geometry.normal.x + cy * geometry.normal.y) / cellPx;
    const side = dist >= 0 ? 1 : -1;
    const near = Math.abs(dist) < CINEMATIC.nearCutCells;
    const group = groupFor(model.pieceId, side);
    const stagger = proj * CINEMATIC.staggerMs + random.next() * CINEMATIC.delayJitterMs;
    const delayMs = Math.min(150, Math.round(near ? stagger * 0.85 : stagger));
    const popMs = Math.round(CINEMATIC.popMs * (1 + (random.next() - 0.5) * 2 * CINEMATIC.popVariance));
    return {
      cell, pieceId: model.pieceId, x, y, size: cellPx, proj, dist, near, delayMs, popMs,
      popScale: near ? CINEMATIC.popScaleNear : CINEMATIC.popScale,
      vx: group.vx + (random.next() - 0.5) * 2 * CINEMATIC.driftCells * cellPx,
      vy: group.vy + (random.next() - 0.5) * CINEMATIC.kickCells * cellPx * 0.5,
      omega: group.omega * (0.75 + random.next() * 0.5),
      group,
    };
  });
}

/** Block offset/rotation/scale at `t` ms after BLOCKS_RELEASE. Cohesion: the piece moves as one before cells diverge. */
export function blockPose(plan: BlockPlan, t: number): BlockPose {
  const local = t - plan.delayMs;
  if (local <= 0) return { dx: 0, dy: 0, rotation: 0, scale: 1, stage: 'rest' };
  if (local < plan.popMs) {
    const u = easeOutCubic(local / plan.popMs);
    return { dx: 0, dy: -plan.size * 0.05 * u, rotation: 0, scale: 1 + (plan.popScale - 1) * u, stage: 'pop' };
  }
  const fallMs = local - plan.popMs;
  const s = fallMs / 1000;
  const blend = smoothstep((fallMs - CINEMATIC.cohesionMs) / CINEMATIC.cohesionBlendMs);
  const vx = plan.group.vx + (plan.vx - plan.group.vx) * blend;
  const vy = plan.group.vy + (plan.vy - plan.group.vy) * blend;
  const omega = plan.group.omega + (plan.omega - plan.group.omega) * blend;
  const gravity = CINEMATIC.gravityCells * plan.size;
  return {
    dx: vx * s,
    dy: -plan.size * 0.05 + vy * s + 0.5 * gravity * s * s,
    rotation: omega * s,
    scale: plan.popScale - (plan.popScale - 1) * Math.min(1, s / 0.4),
    stage: 'fall',
  };
}

// ------------------------------------------------------------------ the DOM sequence

export interface CinematicHost {
  board: BoardView;
  blade: BladeScene;
  effects: EffectsLayer;
  /** Host-local point for the effects layer from client coordinates. */
  effectsPoint: (clientX: number, clientY: number) => Point;
  /** Where the fixed layer lives (the app root). */
  layerHost: HTMLElement;
}

export class GameOverCinematic {
  private layer: HTMLElement | null = null;
  private blocksHost: HTMLElement | null = null;
  private cutLine: HTMLElement | null = null;
  private katanaHost: HTMLElement | null = null;
  private plans: { plan: BlockPlan; element: HTMLElement; popped: boolean; gone: boolean }[] = [];
  private timeline: CinematicTimeline = buildTimeline(false);
  private path: KatanaPath | null = null;
  private options: CinematicOptions | null = null;
  private emitted = new Set<CinematicEvent>();
  private onEvent: ((event: CinematicEvent, t: number) => void) | null = null;
  private startedAt = 0;
  private frame = 0;
  private active = false;
  private skipped = false;
  private bladeTaken = false;
  private sparksLeft = 0;
  private bottom = 0;
  private timers: number[] = [];

  public constructor(private readonly host: CinematicHost) {}

  public isActive(): boolean {
    return this.active;
  }

  /** Events fired so far, for debugging and tests. */
  public progress(): { active: boolean; direction: SlashDirection | null; events: CinematicEvent[]; skipped: boolean } {
    return { active: this.active, direction: this.options?.direction ?? null, events: CINEMATIC_EVENTS.filter((event) => this.emitted.has(event)), skipped: this.skipped };
  }

  public play(options: CinematicOptions, onEvent: (event: CinematicEvent, t: number) => void): void {
    this.cancel();
    this.options = options;
    this.onEvent = onEvent;
    this.timeline = buildTimeline(options.reducedMotion);
    this.emitted.clear();
    this.skipped = false;
    this.active = true;
    this.bladeTaken = false;
    this.startedAt = performance.now();
    const board = this.host.board;
    // Full motion hides the originals behind their clones; reduced motion animates the originals in place.
    board.element.classList.toggle('is-cinematic', !options.reducedMotion);
    board.element.classList.toggle('is-unstable', options.reason === 'fracture' && !options.reducedMotion);
    const geometry = slashGeometry(board.gridRect(), options.direction);
    this.buildLayer(geometry, options);
    if (!options.reducedMotion) this.buildBlocks(geometry, options);
    this.emit('CINEMATIC_START', 0);
    this.frame = requestAnimationFrame(this.step);
  }

  /** Fast-forwards to the results once the strike has landed; earlier taps are ignored so the slash always reads. */
  public skip(): boolean {
    if (!this.active || this.skipped || !this.emitted.has('KATANA_IMPACT')) return false;
    this.skipped = true;
    cancelAnimationFrame(this.frame);
    const t = this.elapsed();
    this.releaseBlade();
    this.cutLine?.remove();
    this.cutLine = null;
    this.plans.forEach((entry) => entry.element.classList.add('is-fading'));
    this.host.board.element.classList.remove('is-unstable', 'is-recoil');
    for (const event of ['BLOCKS_RELEASE', 'BLOCKS_FALL', 'BOARD_SETTLED', 'RESULTS_REVEAL'] as const) this.emit(event, t);
    this.timers.push(window.setTimeout(() => this.finish(), 260));
    return true;
  }

  /** Tears everything down without firing further events (dispose, new run). */
  public cancel(): void {
    cancelAnimationFrame(this.frame);
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    this.releaseBlade();
    this.layer?.remove();
    this.layer = null;
    this.blocksHost = null;
    this.cutLine = null;
    this.katanaHost = null;
    this.plans = [];
    this.path = null;
    this.host.board.element.classList.remove('is-cinematic', 'is-unstable', 'is-recoil');
    this.active = false;
    this.onEvent = null;
  }

  private elapsed(): number {
    return performance.now() - this.startedAt;
  }

  private emit(event: CinematicEvent, t: number): void {
    if (this.emitted.has(event)) return;
    this.emitted.add(event);
    this.react(event);
    this.onEvent?.(event, t);
  }

  /** The cinematic's own response to its events (the coordinator handles audio, HUD and results). */
  private react(event: CinematicEvent): void {
    const board = this.host.board.element;
    switch (event) {
      case 'KATANA_ENTER':
        if (this.katanaHost && this.path && !this.timeline.reducedMotion) {
          this.host.blade.mount(this.katanaHost, { pose: 'slash' });
          this.host.blade.setSlashPose({ tilt: this.path.tilt, flip: this.path.flip, glow: 0.3 });
          this.bladeTaken = true;
          this.katanaHost.classList.add('is-visible');
        }
        break;
      case 'KATANA_IMPACT':
        board.classList.remove('is-unstable');
        board.classList.add('axis-flash');
        board.classList.add('is-recoil');
        this.cutLine?.classList.add('is-struck');
        this.timers.push(window.setTimeout(() => board.classList.remove('is-recoil'), CINEMATIC.recoilMs + 40));
        this.timers.push(window.setTimeout(() => board.classList.remove('axis-flash'), 700));
        // Reduced motion: the line simply appears in full and is taken away once the board has settled.
        if (this.timeline.reducedMotion && this.cutLine) this.cutLine.style.transform = `translate(0, -50%) rotate(${this.cutLine.dataset.angle}deg) scaleX(1)`;
        break;
      case 'BLOCKS_RELEASE':
        if (this.timeline.reducedMotion) board.classList.add('is-dead');
        break;
      case 'BOARD_SETTLED':
        if (this.timeline.reducedMotion) { board.classList.add('is-dead'); this.cutLine?.classList.add('is-fading'); }
        else board.classList.add('is-mirror-dead');
        this.plans.forEach((entry) => { if (!entry.gone) entry.element.classList.add('is-fading'); });
        break;
      default:
        break;
    }
  }

  private readonly step = (): void => {
    if (!this.active || this.skipped) return;
    const t = this.elapsed();
    const { at } = this.timeline;
    for (const event of CINEMATIC_EVENTS) if (t >= at[event]) this.emit(event, t);
    if (!this.timeline.reducedMotion) {
      this.driveKatana(t);
      if (t >= at.BLOCKS_RELEASE) this.driveBlocks(t - at.BLOCKS_RELEASE);
    }
    if (t >= at.CINEMATIC_END) { this.finish(); return; }
    this.frame = requestAnimationFrame(this.step);
  };

  private finish(): void {
    if (!this.active) return;
    this.emit('CINEMATIC_END', this.elapsed());
    this.cancel();
  }

  private releaseBlade(): void {
    if (!this.bladeTaken) return;
    this.host.blade.setSlashPose({ glow: 0 });
    this.host.blade.unmount();
    this.bladeTaken = false;
  }

  // ------------------------------------------------------------------ DOM

  private buildLayer(geometry: SlashGeometry, options: CinematicOptions): void {
    const layer = document.createElement('div');
    layer.className = `cinematic-layer${options.isNewBest ? ' is-best' : ''}${options.reason === 'fracture' ? ' is-fracture' : ''}`;
    layer.setAttribute('aria-hidden', 'true');
    const blocks = document.createElement('div');
    blocks.className = 'cine-blocks';
    const cut = document.createElement('div');
    cut.className = 'cine-cut';
    cut.style.left = `${geometry.entry.x}px`;
    cut.style.top = `${geometry.entry.y}px`;
    cut.style.width = `${geometry.diagonal}px`;
    cut.dataset.angle = geometry.angleDeg.toFixed(2);
    cut.style.transform = `translate(0, -50%) rotate(${geometry.angleDeg}deg) scaleX(0)`;
    layer.append(blocks, cut);
    this.cutLine = cut;
    this.blocksHost = blocks;
    if (!options.reducedMotion) {
      this.path = katanaPath(geometry, { width: window.innerWidth, height: window.innerHeight });
      const katana = document.createElement('div');
      katana.className = 'cine-katana';
      katana.style.width = `${this.path.size}px`;
      katana.style.height = `${this.path.size}px`;
      katana.style.transform = `translate3d(${this.path.start.x - this.path.tipOffset.x - this.path.size / 2}px, ${this.path.start.y - this.path.tipOffset.y - this.path.size / 2}px, 0)`;
      layer.append(katana);
      this.katanaHost = katana;
    }
    this.host.layerHost.append(layer);
    this.layer = layer;
  }

  private buildBlocks(geometry: SlashGeometry, options: CinematicOptions): void {
    const board = this.host.board;
    const cellPx = board.cellSize();
    const occupied = board.occupiedBlocks();
    const plans = planBlocks(occupied, geometry, cellPx, new SeededRandom(options.seed));
    this.blocksHost!.style.setProperty('--cell', `${cellPx}px`);
    this.bottom = window.innerHeight + cellPx * 2;
    this.sparksLeft = options.particles ? 6 : 0;
    this.plans = plans.map((plan, index) => {
      // A cheap wrapper takes the per-frame transform so the block's own (color-mix heavy) style is never recomputed.
      const element = document.createElement('div');
      element.className = `cine-block${plan.near ? ' is-near' : ''}`;
      element.style.left = `${plan.x}px`;
      element.style.top = `${plan.y}px`;
      element.style.width = `${plan.size}px`;
      element.style.height = `${plan.size}px`;
      const block = occupied[index]!.element.cloneNode(false) as HTMLElement;
      block.classList.remove('is-settling', 'is-clearing', 'is-priming');
      element.append(block);
      this.blocksHost!.append(element);
      return { plan, element, popped: false, gone: false };
    });
  }

  private driveKatana(t: number): void {
    if (!this.katanaHost || !this.path) return;
    const pose = katanaPose(t, this.path, this.timeline, this.options?.reason === 'fracture' ? 1.5 : 0);
    const half = this.path.size / 2;
    this.katanaHost.style.transform = `translate3d(${pose.x - this.path.tipOffset.x - half}px, ${pose.y - this.path.tipOffset.y - half}px, 0)`;
    if (this.bladeTaken) this.host.blade.setSlashPose({ glow: pose.glow });
    if (this.cutLine && t >= this.timeline.at.KATANA_SLASH_START) {
      this.cutLine.style.transform = `translate(0, -50%) rotate(${this.cutLine.dataset.angle}deg) scaleX(${pose.cut.toFixed(4)})`;
      if (t >= this.timeline.slashEnd && !this.cutLine.classList.contains('is-fading')) this.cutLine.classList.add('is-fading');
    }
    if (!pose.visible && t >= this.timeline.katanaGone && this.bladeTaken) {
      this.releaseBlade();
      this.katanaHost.classList.remove('is-visible');
    }
  }

  private driveBlocks(t: number): void {
    for (const entry of this.plans) {
      if (entry.gone) continue;
      const pose = blockPose(entry.plan, t);
      if (pose.stage === 'rest') continue;
      if (!entry.popped) {
        entry.popped = true;
        entry.element.classList.add('is-popped');
        if (entry.plan.near && this.sparksLeft > 0) {
          this.sparksLeft -= 1;
          const point = this.host.effectsPoint(entry.plan.x + entry.plan.size / 2, entry.plan.y + entry.plan.size / 2);
          this.host.effects.cutSparks(point, entry.plan.size * 0.6);
        }
      }
      if (entry.plan.y + pose.dy > this.bottom) {
        entry.gone = true;
        entry.element.style.visibility = 'hidden';
        continue;
      }
      entry.element.style.transform = `translate3d(${pose.dx.toFixed(2)}px, ${pose.dy.toFixed(2)}px, 0) rotate(${pose.rotation.toFixed(2)}deg) scale(${pose.scale.toFixed(4)})`;
    }
  }
}
