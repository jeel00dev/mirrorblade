import { hasQuarterSymmetry, type Piece } from '../game/Piece';
import { calculatePiecePreviewLayout } from './PiecePreviewLayout';
import { pieceMarkup } from './blocks';

export interface TrayRenderOptions {
  arriving?: readonly string[];
  reveal?: readonly string[];
  smoothReveal?: boolean;
}

/** Dynamic, internally scrollable piece tray. Active drags are rendered by DragVisual outside this tree. */
export class TrayView {
  private readonly grid: HTMLElement;
  private readonly fade: HTMLElement;
  private readonly observer: ResizeObserver;
  private readonly pieces = new Map<string, Piece>();
  private layoutFrame = 0;
  private maximumPreviewCell = 42;
  private pendingLayoutCallbacks: (() => void)[] = [];

  public constructor(public readonly element: HTMLElement, private readonly onPieceCountChange: (count: number) => void = () => {}) {
    this.element.classList.add('tray');
    this.element.setAttribute('aria-label', 'Piece tray');
    this.element.setAttribute('tabindex', '0');
    this.element.dataset.testid = 'tray';
    this.element.innerHTML = '<div class="tray-grid"></div><div class="tray-scroll-fade" aria-hidden="true"></div>';
    this.grid = this.element.querySelector<HTMLElement>('.tray-grid')!;
    this.fade = this.element.querySelector<HTMLElement>('.tray-scroll-fade')!;
    this.observer = new ResizeObserver(() => this.scheduleLayout());
    this.observer.observe(this.element);
    this.element.addEventListener('scroll', this.updateOverflowState, { passive: true });
  }

  public render(pieces: readonly Piece[], options: TrayRenderOptions = {}): void {
    const previous = new Map<string, DOMRect>();
    this.grid.querySelectorAll<HTMLElement>('[data-slot-piece]').forEach((slot) => {
      const id = slot.dataset.slotPiece;
      if (id) previous.set(id, slot.getBoundingClientRect());
    });
    const arriving = new Set(options.arriving ?? []);
    this.pieces.clear();
    pieces.forEach((piece) => this.pieces.set(piece.id, piece));
    this.grid.innerHTML = pieces.map((piece) =>
      `<div class="tray-slot${arriving.has(piece.id) ? ' is-arriving' : ''}" data-slot-piece="${piece.id}">${pieceMarkup(piece, { interactive: true })}</div>`,
    ).join('');
    this.observer.disconnect();
    this.observer.observe(this.element);
    this.grid.querySelectorAll<HTMLElement>('.tray-slot').forEach((slot) => this.observer.observe(slot));
    this.onPieceCountChange(pieces.length);
    // Establish the first hitbox before render returns; a player can press a newly dealt/cut piece immediately.
    this.layoutPreviews();
    this.updateOverflowState();
    this.scheduleLayout(() => {
      this.animateReflow(previous, arriving);
      if (options.reveal?.length) {
        window.setTimeout(() => this.reveal(options.reveal!, options.smoothReveal !== false), 40);
      }
    });
  }

  /** Re-renders one piece after rotation, then re-fits it to the same card. */
  public rotated(piece: Piece, previousCells: Piece['cells']): void {
    const slot = this.slot(piece.id);
    if (!slot) return;
    this.pieces.set(piece.id, piece);
    const symmetric = hasQuarterSymmetry({ cells: previousCells });
    slot.innerHTML = pieceMarkup(piece, { interactive: true });
    this.layoutPreviews();
    this.scheduleLayout(() => {
      if (!symmetric) {
        const element = slot.firstElementChild as HTMLElement;
        element.classList.add('is-rotating');
        element.addEventListener('animationend', () => element.classList.remove('is-rotating'), { once: true });
      } else slot.classList.add('is-nudged');
    });
    window.setTimeout(() => slot.classList.remove('is-nudged'), 200);
  }

  public setMaximumPreviewCell(value: number): void {
    if (Math.abs(this.maximumPreviewCell - value) < 0.1) return;
    this.maximumPreviewCell = value;
    this.scheduleLayout();
  }

  public count(): number {
    return this.pieces.size;
  }

  public previewCell(pieceId: string): number | null {
    const piece = this.pieceElement(pieceId);
    if (!piece) return null;
    const value = Number.parseFloat(getComputedStyle(piece).getPropertyValue('--cell'));
    return Number.isFinite(value) ? value : null;
  }

  public markSource(pieceId: string, lifted: boolean): void {
    this.slot(pieceId)?.classList.toggle('is-source', lifted);
  }

  public pieceElement(pieceId: string): HTMLElement | null {
    return this.element.querySelector<HTMLElement>(`[data-piece-id="${pieceId}"]`);
  }

  public slot(pieceId: string): HTMLElement | null {
    return this.element.querySelector<HTMLElement>(`[data-slot-piece="${pieceId}"]`);
  }

  public setUrgent(urgent: boolean): void {
    this.element.classList.toggle('is-urgent', urgent);
  }

  public highlightFirst(): void {
    this.element.classList.add('tutorial-first');
  }

  public clearHighlight(): void {
    this.element.classList.remove('tutorial-first');
  }

  /** Scrolls only enough to expose the complete group of new fragment cards. */
  public reveal(pieceIds: readonly string[], smooth = true): void {
    const cards = pieceIds.map((id) => this.slot(id)).filter((slot): slot is HTMLElement => Boolean(slot));
    if (cards.length === 0 || this.element.scrollHeight <= this.element.clientHeight + 1) return;
    const trayRect = this.element.getBoundingClientRect();
    const rects = cards.map((card) => card.getBoundingClientRect());
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    let target = this.element.scrollTop;
    if (bottom - top > trayRect.height) target += top - trayRect.top;
    else if (top < trayRect.top) target -= trayRect.top - top;
    else if (bottom > trayRect.bottom) target += bottom - trayRect.bottom;
    if (Math.abs(target - this.element.scrollTop) > 1) this.element.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'auto' });
  }

  public dispose(): void {
    if (this.layoutFrame) cancelAnimationFrame(this.layoutFrame);
    this.observer.disconnect();
    this.element.removeEventListener('scroll', this.updateOverflowState);
  }

  private scheduleLayout(after?: () => void): void {
    if (after) this.pendingLayoutCallbacks.push(after);
    if (this.layoutFrame) cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = 0;
      this.layoutPreviews();
      this.updateOverflowState();
      const callbacks = this.pendingLayoutCallbacks;
      this.pendingLayoutCallbacks = [];
      callbacks.forEach((callback) => callback());
    });
  }

  private layoutPreviews(): void {
    const padding = Number.parseFloat(getComputedStyle(this.element).getPropertyValue('--tray-card-padding')) || 8;
    this.pieces.forEach((piece, id) => {
      const slot = this.slot(id);
      const preview = this.pieceElement(id);
      if (!slot || !preview) return;
      const layout = calculatePiecePreviewLayout(piece, slot.clientWidth, slot.clientHeight, {
        padding,
        interactionAllowance: 4,
        maximumPreviewScale: this.maximumPreviewCell,
      });
      preview.style.setProperty('--cell', `${layout.scale}px`);
      preview.style.left = `${layout.offsetX}px`;
      preview.style.top = `${layout.offsetY}px`;
      preview.dataset.previewWidth = layout.boundingWidth.toFixed(2);
      preview.dataset.previewHeight = layout.boundingHeight.toFixed(2);
    });
  }

  private animateReflow(previous: ReadonlyMap<string, DOMRect>, arriving: ReadonlySet<string>): void {
    if (document.body.classList.contains('reduced-motion')) return;
    previous.forEach((oldRect, id) => {
      if (arriving.has(id)) return;
      const slot = this.slot(id);
      if (!slot) return;
      const next = slot.getBoundingClientRect();
      const x = oldRect.left - next.left;
      const y = oldRect.top - next.top;
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
      slot.style.transition = 'none';
      slot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      requestAnimationFrame(() => {
        slot.classList.add('is-reflowing');
        slot.style.removeProperty('transition');
        slot.style.removeProperty('transform');
        window.setTimeout(() => slot.classList.remove('is-reflowing'), 240);
      });
    });
  }

  private readonly updateOverflowState = (): void => {
    const scrollable = this.element.scrollHeight > this.element.clientHeight + 1;
    const atEnd = !scrollable || this.element.scrollTop + this.element.clientHeight >= this.element.scrollHeight - 2;
    this.element.classList.toggle('is-scrollable', scrollable);
    this.element.classList.toggle('is-at-end', atEnd);
    this.fade.hidden = !scrollable;
    this.element.setAttribute('aria-label', scrollable ? 'Piece tray, scroll for more pieces' : 'Piece tray');
  };
}
