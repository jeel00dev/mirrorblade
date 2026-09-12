import { hasQuarterSymmetry, type Piece } from '../game/Piece';
import { pieceMarkup } from './blocks';

/** The piece tray. Pieces are the same block component as the board, at --tray-cell scale. */
export class TrayView {
  public constructor(public readonly element: HTMLElement) {
    this.element.classList.add('tray');
    this.element.setAttribute('aria-label', 'Piece tray');
    this.element.dataset.testid = 'tray';
  }

  public render(pieces: readonly Piece[], options: { arriving?: readonly string[] } = {}): void {
    const arriving = new Set(options.arriving ?? []);
    this.element.innerHTML = pieces.map((piece) =>
      `<div class="tray-slot${arriving.has(piece.id) ? ' is-arriving' : ''}" data-slot-piece="${piece.id}">${pieceMarkup(piece, { interactive: true })}</div>`,
    ).join('');
    this.element.style.setProperty('--piece-count', String(pieces.length));
    this.element.classList.toggle('is-crowded', pieces.length > 3);
  }

  /** Re-renders one piece after a rotation with a quarter-turn settle animation (skipped for symmetric shapes). */
  public rotated(piece: Piece, previousCells: Piece['cells']): void {
    const slot = this.slot(piece.id);
    if (!slot) return;
    const symmetric = hasQuarterSymmetry({ cells: previousCells });
    slot.innerHTML = pieceMarkup(piece, { interactive: true });
    if (!symmetric) {
      const element = slot.firstElementChild as HTMLElement;
      element.classList.add('is-rotating');
      element.addEventListener('animationend', () => element.classList.remove('is-rotating'), { once: true });
    } else slot.classList.add('is-nudged');
    window.setTimeout(() => slot.classList.remove('is-nudged'), 200);
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
}
