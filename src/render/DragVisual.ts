import type { Piece } from '../game/Piece';
import { pieceDimensions } from '../game/Piece';
import { pieceMarkup } from './blocks';

/**
 * The lifted piece. It grows from tray scale to board scale on pickup so the player sees the real footprint,
 * is offset above a touch point, and carries the cut guide when hovering the blade.
 */
export class DragVisual {
  public readonly element: HTMLElement;
  private readonly piece: Piece;
  private x = 0;
  private y = 0;

  public constructor(piece: Piece, sourceRect: DOMRect, boardCell: number, trayCell: number) {
    this.piece = piece;
    this.element = document.createElement('div');
    this.element.className = 'drag-visual';
    this.element.style.setProperty('--cell', `${boardCell}px`);
    this.element.style.setProperty('--lift-from', String(Math.max(0.2, trayCell / boardCell)));
    this.element.innerHTML = pieceMarkup(piece);
    document.body.append(this.element);
    this.moveTo(sourceRect.left + sourceRect.width / 2, sourceRect.top + sourceRect.height / 2);
    requestAnimationFrame(() => this.element.classList.add('is-lifted'));
  }

  public moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  public position(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public rect(): DOMRect {
    return (this.element.firstElementChild as HTMLElement).getBoundingClientRect();
  }

  /** Cell size of the visual in CSS px (accounts for the lift scale). */
  public footprint(): { rows: number; cols: number } {
    return pieceDimensions(this.piece);
  }

  public setCutGuide(orientation: 'horizontal' | 'vertical' | null, seamRatio = 0.5, valid = true): void {
    const guide = this.element.querySelector<HTMLElement>('.cut-guide');
    if (!guide) return;
    guide.className = `cut-guide${orientation ? ` is-visible is-${orientation}` : ''}${valid ? '' : ' is-invalid'}`;
    guide.style.setProperty('--seam', `${seamRatio * 100}%`);
  }

  public setOverBlade(over: boolean): void {
    this.element.classList.toggle('is-over-blade', over);
  }

  /** Animates back to the tray, then removes itself. */
  public returnTo(rect: DOMRect, trayCell: number, boardCell: number): void {
    this.element.classList.add('is-returning');
    this.element.style.setProperty('--lift-from', String(Math.max(0.2, trayCell / boardCell)));
    this.moveTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
    window.setTimeout(() => this.element.remove(), 260);
  }

  public settleAndRemove(delay = 0): void {
    this.element.classList.add('is-placed');
    window.setTimeout(() => this.element.remove(), delay);
  }

  public cutAndRemove(): void {
    this.element.classList.add('is-cutting');
    window.setTimeout(() => this.element.remove(), 260);
  }

  public remove(): void {
    this.element.remove();
  }
}
