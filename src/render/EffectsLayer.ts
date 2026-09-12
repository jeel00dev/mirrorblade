import type { EffectStyle, TrailStyle } from '../config/cosmetics';

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; shape: 'square' | 'dot' | 'shard'; spin: number; rot: number; gravity: number;
}

interface Streak { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; t: number; duration: number; color: string; size: number; }
interface Sweep { x: number; y: number; w: number; h: number; horizontal: boolean; life: number; maxLife: number; color: string; }
interface Ring { x: number; y: number; r: number; maxR: number; life: number; maxLife: number; color: string; }

/**
 * A pooled Canvas 2D layer positioned over the board. Cheap, GPU-composited, and bounded by the quality
 * profile's particle budget. It never decides rules — it only draws what the run already committed.
 */
export class EffectsLayer {
  public readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private sweeps: Sweep[] = [];
  private rings: Ring[] = [];
  private streaks: Streak[] = [];
  private onStreakArrive: (() => void) | null = null;
  private frame = 0;
  private lastTime = 0;
  private budget = 64;
  private dpr = 1;
  private width = 1;
  private height = 1;
  private effectStyle: EffectStyle = 'shatter';
  private effectColors: string[] = ['#dffaff', '#ffffff'];
  private trailStyle: TrailStyle = 'glow';
  private trailColors: string[] = ['#cffcfb'];
  private reducedMotion = false;
  private readonly observer: ResizeObserver;

  public constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'effects-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.append(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.tick = this.tick.bind(this);
  }

  public configure(options: { budget?: number; dpr?: number; effect?: EffectStyle; effectColors?: readonly string[]; trail?: TrailStyle; trailColors?: readonly string[]; reducedMotion?: boolean }): void {
    if (options.budget !== undefined) this.budget = options.budget;
    if (options.dpr !== undefined) { this.dpr = options.dpr; this.resize(); }
    if (options.effect) this.effectStyle = options.effect;
    if (options.effectColors) this.effectColors = [...options.effectColors];
    if (options.trail) this.trailStyle = options.trail;
    if (options.trailColors) this.trailColors = [...options.trailColors];
    if (options.reducedMotion !== undefined) this.reducedMotion = options.reducedMotion;
  }

  /** Points are in host-local CSS pixels. */
  public placement(points: readonly { x: number; y: number }[], cell: number): void {
    if (this.reducedMotion) return;
    const count = Math.min(points.length * 2, Math.floor(this.budget / 4));
    for (let index = 0; index < count; index += 1) {
      const point = points[index % points.length]!;
      const color = this.trailColors[index % this.trailColors.length]!;
      this.spawn({
        x: point.x + (Math.random() - 0.5) * cell * 0.6,
        y: point.y + cell * 0.2,
        vx: (Math.random() - 0.5) * cell * 0.9,
        vy: -Math.random() * cell * 1.2,
        life: 0.35 + Math.random() * 0.2,
        size: cell * (this.trailStyle === 'minimal' ? 0.06 : 0.1),
        color,
        shape: this.trailStyle === 'snow' ? 'dot' : this.trailStyle === 'ember' ? 'shard' : 'square',
        gravity: this.trailStyle === 'snow' ? cell * 0.4 : cell * 1.5,
      });
    }
    this.ensureRunning();
  }

  public lineClear(lines: readonly { horizontal: boolean; index: number }[], cellPoints: readonly { x: number; y: number }[], cell: number, gridOrigin: { x: number; y: number }, intensity: number): void {
    const color = this.effectColors[0]!;
    for (const line of lines) {
      this.sweeps.push({
        x: line.horizontal ? gridOrigin.x : gridOrigin.x + line.index * cell,
        y: line.horizontal ? gridOrigin.y + line.index * cell : gridOrigin.y,
        w: line.horizontal ? cell * 9 : cell,
        h: line.horizontal ? cell : cell * 9,
        horizontal: line.horizontal,
        life: 0.42,
        maxLife: 0.42,
        color,
      });
    }
    if (!this.reducedMotion) {
      const perCell = Math.max(1, Math.min(4, Math.floor((this.budget * intensity) / Math.max(1, cellPoints.length))));
      for (const point of cellPoints) {
        for (let index = 0; index < perCell; index += 1) {
          const color = this.effectColors[index % this.effectColors.length]!;
          const angle = Math.random() * Math.PI * 2;
          const speed = cell * (0.8 + Math.random() * 1.6) * (0.6 + intensity * 0.4);
          this.spawn({
            x: point.x + (Math.random() - 0.5) * cell * 0.5,
            y: point.y + (Math.random() - 0.5) * cell * 0.5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - cell * 0.4,
            life: 0.45 + Math.random() * 0.35,
            size: cell * (this.effectStyle === 'dust' ? 0.06 : this.effectStyle === 'dissolve' ? 0.14 : 0.1),
            color,
            shape: this.effectStyle === 'shatter' ? 'shard' : this.effectStyle === 'dust' ? 'dot' : 'square',
            gravity: this.effectStyle === 'dust' ? cell * 0.3 : cell * 2.2,
          });
        }
      }
    }
    if (this.effectStyle === 'ripple' || intensity >= 0.8) {
      const cx = gridOrigin.x + cell * 4.5;
      const cy = gridOrigin.y + cell * 4.5;
      this.rings.push({ x: cx, y: cy, r: cell, maxR: cell * 7, life: 0.6, maxLife: 0.6, color: this.effectColors[1] ?? color });
    }
    this.ensureRunning();
  }

  /** Crystalline energy streaks from cleared cells to the blade dock. Reduced motion: the ring just updates. */
  public energyTransfer(points: readonly { x: number; y: number }[], target: { x: number; y: number }, count: number, cell: number, onArrive?: () => void): void {
    if (this.reducedMotion || points.length === 0) { onArrive?.(); return; }
    this.onStreakArrive = onArrive ?? null;
    for (let index = 0; index < count; index += 1) {
      const point = points[index % points.length]!;
      const midX = (point.x + target.x) / 2 + (Math.random() - 0.5) * cell * 3;
      const midY = (point.y + target.y) / 2 - cell * (1 + Math.random() * 1.5);
      this.streaks.push({ x0: point.x, y0: point.y, cx: midX, cy: midY, x1: target.x, y1: target.y, t: -index * 0.02, duration: 0.42 + Math.random() * 0.14, color: index % 3 === 0 ? '#ffffff' : this.effectColors[1] ?? '#9ef9f2', size: cell * 0.09 });
    }
    this.ensureRunning();
  }

  public cutSparks(point: { x: number; y: number }, cell: number): void {
    if (this.reducedMotion) return;
    for (let index = 0; index < Math.min(14, this.budget / 4); index += 1) {
      const angle = (Math.random() - 0.5) * 1.4 + (index % 2 ? 0 : Math.PI);
      const speed = cell * (2 + Math.random() * 3);
      this.spawn({ x: point.x, y: point.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.4 - cell, life: 0.28 + Math.random() * 0.15, size: cell * 0.07, color: index % 3 ? '#ffffff' : '#ffd88a', shape: 'shard', gravity: cell * 3 });
    }
    this.ensureRunning();
  }

  public clear(): void {
    this.particles = [];
    this.sweeps = [];
    this.rings = [];
    this.streaks = [];
    this.onStreakArrive = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public dispose(): void {
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
    this.canvas.remove();
  }

  private spawn(input: Omit<Particle, 'maxLife' | 'spin' | 'rot'>): void {
    if (this.particles.length >= this.budget) this.particles.shift();
    this.particles.push({ ...input, maxLife: input.life, spin: (Math.random() - 0.5) * 8, rot: Math.random() * Math.PI });
  }

  private ensureRunning(): void {
    if (this.frame === 0) {
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  private tick(now: number): void {
    const delta = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    for (let index = this.sweeps.length - 1; index >= 0; index -= 1) {
      const sweep = this.sweeps[index]!;
      sweep.life -= delta;
      const t = 1 - sweep.life / sweep.maxLife;
      const alpha = Math.sin(Math.min(1, t) * Math.PI) * 0.85;
      const gradient = sweep.horizontal
        ? ctx.createLinearGradient(sweep.x, 0, sweep.x + sweep.w, 0)
        : ctx.createLinearGradient(0, sweep.y, 0, sweep.y + sweep.h);
      const head = Math.min(1, t * 1.15);
      gradient.addColorStop(Math.max(0, head - 0.35), 'rgba(255,255,255,0)');
      gradient.addColorStop(head, sweep.color);
      gradient.addColorStop(Math.min(1, head + 0.04), 'rgba(255,255,255,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(sweep.x, sweep.y, sweep.w, sweep.h);
      if (sweep.life <= 0) this.sweeps.splice(index, 1);
    }

    for (let index = this.rings.length - 1; index >= 0; index -= 1) {
      const ring = this.rings[index]!;
      ring.life -= delta;
      const t = 1 - ring.life / ring.maxLife;
      ctx.globalAlpha = (1 - t) * 0.55;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r + (ring.maxR - ring.r) * t, 0, Math.PI * 2);
      ctx.stroke();
      if (ring.life <= 0) this.rings.splice(index, 1);
    }

    let arrived = false;
    for (let index = this.streaks.length - 1; index >= 0; index -= 1) {
      const streak = this.streaks[index]!;
      streak.t += delta / streak.duration;
      if (streak.t < 0) continue;
      const t = Math.min(1, streak.t);
      const e = t * t * (3 - 2 * t);
      const x = (1 - e) * (1 - e) * streak.x0 + 2 * (1 - e) * e * streak.cx + e * e * streak.x1;
      const y = (1 - e) * (1 - e) * streak.y0 + 2 * (1 - e) * e * streak.cy + e * e * streak.y1;
      const tp = Math.max(0, t - 0.08);
      const ep = tp * tp * (3 - 2 * tp);
      const px = (1 - ep) * (1 - ep) * streak.x0 + 2 * (1 - ep) * ep * streak.cx + ep * ep * streak.x1;
      const py = (1 - ep) * (1 - ep) * streak.y0 + 2 * (1 - ep) * ep * streak.cy + ep * ep * streak.y1;
      ctx.globalAlpha = 0.85 * (1 - t * 0.3);
      ctx.strokeStyle = streak.color;
      ctx.lineWidth = streak.size;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, streak.size * 0.7, 0, Math.PI * 2); ctx.fill();
      if (t >= 1) { this.streaks.splice(index, 1); arrived = true; }
    }
    if (arrived && this.streaks.length === 0 && this.onStreakArrive) { const callback = this.onStreakArrive; this.onStreakArrive = null; callback(); }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index]!;
      particle.life -= delta;
      particle.vy += particle.gravity * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= Math.pow(0.6, delta);
      particle.rot += particle.spin * delta;
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      if (particle.shape === 'dot') {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rot);
        if (particle.shape === 'shard') ctx.fillRect(-particle.size, -particle.size * 0.2, particle.size * 2, particle.size * 0.4);
        else ctx.fillRect(-particle.size * 0.5, -particle.size * 0.5, particle.size, particle.size);
        ctx.restore();
      }
      if (particle.life <= 0) this.particles.splice(index, 1);
    }
    ctx.globalAlpha = 1;

    if (this.particles.length + this.sweeps.length + this.rings.length + this.streaks.length > 0) this.frame = requestAnimationFrame(this.tick);
    else {
      this.frame = 0;
      ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}
