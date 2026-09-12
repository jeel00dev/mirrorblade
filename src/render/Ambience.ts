import { PIECE_LIBRARY } from '../game/PieceLibrary';

interface DriftPiece {
  cells: readonly { row: number; col: number }[];
  x: number; y: number; vx: number; vy: number;
  rot: number; vr: number;
  cell: number; depth: number; tone: string; alpha: number;
  /** Split fragments carry a life that fades them out. */
  life: number | null;
}

interface Mote { x: number; y: number; vy: number; size: number; alpha: number; depth: number; }

interface Cut { piece: DriftPiece; t: number; x0: number; y0: number; x1: number; y1: number; split: boolean; }

const TONES = ['#43c2c7', '#ea7d78', '#ecb455', '#8e60d8'];

/**
 * Ambient world motion behind the whole UI: distant block silhouettes drifting on parallax depths, sparse
 * motes, and — rarely — a faint katana pass that splits one piece. Subtle by design: total alpha stays low,
 * it renders at ~30 fps, and reduced motion freezes it into a still composition.
 */
export class Ambience {
  public readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private pieces: DriftPiece[] = [];
  private motes: Mote[] = [];
  private cut: Cut | null = null;
  private nextCutAt = 0;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private frame = 0;
  private lastTime = 0;
  private accumulator = 0;
  private pointerX = 0.5;
  private pointerY = 0.5;
  private parallaxX = 0;
  private parallaxY = 0;
  private pulseLevel = 0;
  private density = 1;
  private reducedMotion = false;
  private enabled = true;
  private readonly observer: ResizeObserver;
  private readonly hoverCapable = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

  public constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ambience-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    host.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.populate();
    if (this.hoverCapable) window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.tick = this.tick.bind(this);
    this.start();
  }

  public configure(options: { density?: number; reducedMotion?: boolean; enabled?: boolean }): void {
    if (options.density !== undefined) this.density = options.density;
    if (options.reducedMotion !== undefined) this.reducedMotion = options.reducedMotion;
    if (options.enabled !== undefined) this.enabled = options.enabled;
    this.canvas.hidden = !this.enabled;
    this.populate();
    if (this.enabled) this.start(); else this.stop();
  }

  /** Strong clears make the world respond for a moment. */
  public pulse(strength: number): void {
    this.pulseLevel = Math.max(this.pulseLevel, Math.min(1, strength));
    if (this.enabled && this.reducedMotion) this.drawOnce();
  }

  public dispose(): void {
    this.stop();
    this.observer.disconnect();
    window.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.remove();
  }

  private start(): void {
    if (this.frame === 0) {
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  private stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.pointerX = event.clientX / Math.max(1, window.innerWidth);
    this.pointerY = event.clientY / Math.max(1, window.innerHeight);
  };

  private resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  private populate(): void {
    const small = this.width < 700;
    const pieceCount = Math.round((small ? 4 : 8) * this.density);
    const moteCount = Math.round((small ? 10 : 22) * this.density);
    this.pieces = Array.from({ length: pieceCount }, (_, index) => this.spawnPiece(index / Math.max(1, pieceCount)));
    this.motes = Array.from({ length: moteCount }, () => ({
      x: Math.random() * this.width, y: Math.random() * this.height, vy: -(2 + Math.random() * 5), size: 1 + Math.random() * 1.6, alpha: 0.06 + Math.random() * 0.12, depth: 0.3 + Math.random() * 0.6,
    }));
    this.nextCutAt = performance.now() + 15_000 + Math.random() * 20_000;
    this.cut = null;
  }

  private spawnPiece(spread: number, atEdge = false): DriftPiece {
    const definition = PIECE_LIBRARY[Math.floor(Math.random() * PIECE_LIBRARY.length)]!;
    const depth = 0.25 + Math.random() * 0.55;
    const cell = (10 + depth * 18) * (this.width < 700 ? 0.75 : 1);
    const angle = Math.random() * Math.PI * 2;
    return {
      cells: definition.cells,
      x: atEdge ? (Math.random() < 0.5 ? -cell * 4 : this.width + cell * 4) : spread * this.width + (Math.random() - 0.5) * 120,
      y: atEdge ? Math.random() * this.height : Math.random() * this.height,
      vx: Math.cos(angle) * (2 + depth * 4),
      vy: Math.sin(angle) * (2 + depth * 4),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.08,
      cell, depth,
      tone: TONES[Math.floor(Math.random() * TONES.length)]!,
      alpha: 0.045 + depth * 0.05,
      life: null,
    };
  }

  private tick(now: number): void {
    if (!this.enabled) { this.frame = 0; return; }
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.accumulator += delta;
    // ~30 fps is plenty for slow drift and keeps the layer cheap.
    if (this.accumulator < 1 / 30) { this.frame = requestAnimationFrame(this.tick); return; }
    const step = this.accumulator;
    this.accumulator = 0;
    if (!this.reducedMotion) this.update(step, now);
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  }

  private drawOnce(): void {
    this.draw();
  }

  private update(delta: number, now: number): void {
    // Parallax eases toward the pointer; tiny amplitude.
    const targetX = (this.pointerX - 0.5) * 14;
    const targetY = (this.pointerY - 0.5) * 10;
    this.parallaxX += (targetX - this.parallaxX) * Math.min(1, delta * 2);
    this.parallaxY += (targetY - this.parallaxY) * Math.min(1, delta * 2);
    this.pulseLevel = Math.max(0, this.pulseLevel - delta * 1.6);

    for (let index = this.pieces.length - 1; index >= 0; index -= 1) {
      const piece = this.pieces[index]!;
      piece.x += piece.vx * delta;
      piece.y += piece.vy * delta;
      piece.rot += piece.vr * delta;
      if (piece.life !== null) {
        piece.life -= delta;
        if (piece.life <= 0) { this.pieces.splice(index, 1); continue; }
      }
      const margin = piece.cell * 6;
      if (piece.x < -margin || piece.x > this.width + margin || piece.y < -margin || piece.y > this.height + margin) {
        this.pieces[index] = this.spawnPiece(Math.random(), true);
      }
    }
    for (const mote of this.motes) {
      mote.y += mote.vy * delta;
      if (mote.y < -10) { mote.y = this.height + 10; mote.x = Math.random() * this.width; }
    }

    if (this.cut) {
      this.cut.t += delta / 0.42;
      if (!this.cut.split && this.cut.t >= 0.55) {
        this.cut.split = true;
        this.splitPiece(this.cut.piece);
      }
      if (this.cut.t >= 1.6) this.cut = null;
    } else if (now >= this.nextCutAt) {
      const candidates = this.pieces.filter((piece) => piece.life === null && piece.x > this.width * 0.15 && piece.x < this.width * 0.85 && piece.y > this.height * 0.15 && piece.y < this.height * 0.85);
      const piece = candidates[Math.floor(Math.random() * candidates.length)];
      if (piece) {
        const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.4;
        const length = piece.cell * 9;
        this.cut = { piece, t: 0, split: false, x0: piece.x - Math.cos(angle) * length, y0: piece.y - Math.sin(angle) * length, x1: piece.x + Math.cos(angle) * length, y1: piece.y + Math.sin(angle) * length };
      }
      this.nextCutAt = now + 15_000 + Math.random() * 20_000;
    }
  }

  private splitPiece(piece: DriftPiece): void {
    const index = this.pieces.indexOf(piece);
    if (index < 0) return;
    const rows = Math.max(...piece.cells.map((c) => c.row)) + 1;
    const cols = Math.max(...piece.cells.map((c) => c.col)) + 1;
    const vertical = cols >= rows;
    const seam = vertical ? Math.max(1, Math.floor(cols / 2)) : Math.max(1, Math.floor(rows / 2));
    const first = piece.cells.filter((c) => (vertical ? c.col < seam : c.row < seam));
    const second = piece.cells.filter((c) => (vertical ? c.col >= seam : c.row >= seam));
    const make = (cells: typeof piece.cells, direction: number): DriftPiece => ({
      ...piece,
      cells,
      vx: piece.vx + (vertical ? direction * 9 : direction * 3),
      vy: piece.vy + (vertical ? direction * 3 : direction * 9),
      vr: piece.vr + direction * 0.25,
      life: 3.2,
    });
    const halves = [first.length ? make(first, -1) : null, second.length ? make(second, 1) : null].filter((half): half is DriftPiece => Boolean(half));
    this.pieces.splice(index, 1, ...halves);
    window.setTimeout(() => { if (this.enabled) this.pieces.push(this.spawnPiece(Math.random(), true)); }, 2500);
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const glow = this.pulseLevel;

    for (const piece of this.pieces) {
      const px = piece.x + this.parallaxX * piece.depth;
      const py = piece.y + this.parallaxY * piece.depth;
      const fade = piece.life !== null ? Math.min(1, piece.life / 1.2) : 1;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(piece.rot);
      ctx.globalAlpha = (piece.alpha + glow * 0.06) * fade;
      for (const cell of piece.cells) {
        const x = (cell.col - 1) * piece.cell;
        const y = (cell.row - 1) * piece.cell;
        const size = piece.cell * 0.9;
        ctx.fillStyle = piece.tone;
        this.roundRect(x, y, size, size, size * 0.2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        this.roundRect(x + size * 0.1, y + size * 0.06, size * 0.8, size * 0.14, size * 0.07);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const mote of this.motes) {
      ctx.globalAlpha = mote.alpha + glow * 0.15;
      ctx.fillStyle = '#dfe6ec';
      ctx.beginPath();
      ctx.arc(mote.x + this.parallaxX * mote.depth, mote.y + this.parallaxY * mote.depth, mote.size, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.cut) {
      const t = Math.min(1, this.cut.t);
      const head = Math.min(1, t * 1.25);
      const tail = Math.max(0, head - 0.35);
      const x0 = this.cut.x0 + (this.cut.x1 - this.cut.x0) * tail;
      const y0 = this.cut.y0 + (this.cut.y1 - this.cut.y0) * tail;
      const x1 = this.cut.x0 + (this.cut.x1 - this.cut.x0) * head;
      const y1 = this.cut.y0 + (this.cut.y1 - this.cut.y0) * head;
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, 'rgba(255,255,255,0.55)');
      ctx.globalAlpha = this.cut.t > 1 ? Math.max(0, 1 - (this.cut.t - 1) / 0.6) : 1;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
