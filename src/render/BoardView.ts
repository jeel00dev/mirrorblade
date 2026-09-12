import { BOARD_SIZE, MIRROR_COLUMN } from '../config/gameplay';
import type { BoardCell } from '../game/BoardState';
import { cellKey, type BlockTone, type GridCell } from '../game/Piece';
import { blockMarkup } from './blocks';

/**
 * The 9×9 board as DOM: frame > grid > 81 cells, each holding an optional block and a ghost slot.
 * Blocks are keyed by cell so a clear can animate the exact cells that resolved.
 */
export class BoardView {
  public readonly element: HTMLElement;
  public readonly grid: HTMLElement;
  private readonly cells: HTMLElement[] = [];
  private readonly blocks: (HTMLElement | null)[] = [];
  private snapshot: readonly (readonly (BoardCell | null)[])[] = [];

  public constructor(host: HTMLElement) {
    this.element = host;
    this.element.classList.add('board');
    this.element.innerHTML = `<div class="board-grid" data-testid="board" role="grid" aria-label="Nine by nine mirror board"></div><div class="board-rim" aria-hidden="true"></div>`;
    this.grid = this.element.querySelector<HTMLElement>('.board-grid')!;
    for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
      const row = Math.floor(index / BOARD_SIZE);
      const col = index % BOARD_SIZE;
      const cell = document.createElement('div');
      cell.className = `cell${col === MIRROR_COLUMN ? ' is-axis' : ''}`;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('role', 'gridcell');
      cell.innerHTML = '<span class="ghost"></span>';
      this.cells.push(cell);
      this.blocks.push(null);
      this.grid.append(cell);
    }
  }

  /** Reconciles DOM blocks with the model. Cells listed in `settle` play the placement animation. */
  public setBoard(snapshot: readonly (readonly (BoardCell | null)[])[], settle: readonly GridCell[] = []): void {
    this.snapshot = snapshot;
    const settling = new Set(settle.map(cellKey));
    for (let index = 0; index < this.cells.length; index += 1) {
      const row = Math.floor(index / BOARD_SIZE);
      const col = index % BOARD_SIZE;
      const model = snapshot[row]?.[col] ?? null;
      const existing = this.blocks[index] ?? null;
      if (!model) {
        existing?.remove();
        this.blocks[index] = null;
        continue;
      }
      if (existing && existing.dataset.tone === model.tone) continue;
      existing?.remove();
      const cell = this.cells[index]!;
      cell.insertAdjacentHTML('beforeend', blockMarkup(model.tone));
      const block = cell.lastElementChild as HTMLElement;
      block.dataset.tone = model.tone;
      if (settling.has(`${row}:${col}`)) block.classList.add('is-settling');
      this.blocks[index] = block;
    }
  }

  public currentSnapshot(): readonly (readonly (BoardCell | null)[])[] {
    return this.snapshot;
  }

  public showGhost(original: readonly GridCell[], mirrored: readonly GridCell[], valid: boolean, tone: BlockTone): void {
    this.clearGhost();
    const toneVar = `var(--block-${tone})`;
    for (const cell of original) this.markCell(cell, valid ? 'ghost-original' : 'ghost-invalid', toneVar);
    for (const cell of mirrored) this.markCell(cell, valid ? 'ghost-mirror' : 'ghost-invalid', toneVar);
  }

  /** Marks a mirrored pair of Precision Cells (or clears them with null). */
  public setPrecision(cells: readonly GridCell[] | null): void {
    this.cells.forEach((cell) => cell.classList.remove('is-precision'));
    if (!cells) return;
    for (const cell of cells) {
      const element = this.cells[cell.row * BOARD_SIZE + cell.col];
      element?.classList.add('is-precision');
    }
  }

  public clearGhost(): void {
    for (const cell of this.cells) {
      if (cell.classList.contains('ghost-original') || cell.classList.contains('ghost-mirror') || cell.classList.contains('ghost-invalid')) {
        cell.classList.remove('ghost-original', 'ghost-mirror', 'ghost-invalid');
      }
    }
  }

  /**
   * Plays the line-clear animation on the given cells; blocks are removed afterwards by setBoard.
   * `anticipationMs` brightens the blocks first so strong events read as one gathered beat.
   */
  public animateClear(cells: readonly GridCell[], axisClear: boolean, anticipationMs = 0): void {
    const blocks = cells.map((cell) => this.blockAt(cell)).filter((block): block is HTMLElement => Boolean(block));
    const start = (): void => {
      blocks.forEach((block) => { block.classList.remove('is-priming'); block.classList.add('is-clearing'); });
      if (axisClear) this.element.classList.add('axis-flash');
      window.setTimeout(() => this.element.classList.remove('axis-flash'), 700);
    };
    if (anticipationMs > 0) {
      blocks.forEach((block) => block.classList.add('is-priming'));
      window.setTimeout(start, anticipationMs);
    } else start();
  }

  /** Perfect events: the board dims for a beat while the axis flashes, then releases. */
  public perfectDim(): void {
    this.element.classList.remove('is-perfect');
    void this.element.offsetWidth;
    this.element.classList.add('is-perfect');
    window.setTimeout(() => this.element.classList.remove('is-perfect'), 900);
  }

  public pulse(kind: 'place' | 'double' | 'triple' | 'max' | 'perfect'): void {
    this.element.classList.remove('pulse-place', 'pulse-double', 'pulse-triple', 'pulse-max', 'pulse-perfect');
    void this.element.offsetWidth;
    this.element.classList.add(`pulse-${kind}`);
  }

  public cellSize(): number {
    return this.grid.getBoundingClientRect().width / BOARD_SIZE;
  }

  public gridRect(): DOMRect {
    return this.grid.getBoundingClientRect();
  }

  /** Board cell under a client point, or null outside the grid (with a small tolerance). */
  public cellFromPoint(clientX: number, clientY: number, tolerance = 0): GridCell | null {
    const rect = this.gridRect();
    if (clientX < rect.left - tolerance || clientX > rect.right + tolerance || clientY < rect.top - tolerance || clientY > rect.bottom + tolerance) return null;
    const size = rect.width / BOARD_SIZE;
    return { row: Math.floor((clientY - rect.top) / size), col: Math.floor((clientX - rect.left) / size) };
  }

  public cellCenter(cell: GridCell): { x: number; y: number } {
    const rect = this.gridRect();
    const size = rect.width / BOARD_SIZE;
    return { x: rect.left + (cell.col + 0.5) * size, y: rect.top + (cell.row + 0.5) * size };
  }

  private markCell(cell: GridCell, className: string, toneVar: string): void {
    if (cell.row < 0 || cell.row >= BOARD_SIZE || cell.col < 0 || cell.col >= BOARD_SIZE) return;
    const element = this.cells[cell.row * BOARD_SIZE + cell.col]!;
    element.classList.add(className);
    element.style.setProperty('--ghost-tone', toneVar);
  }

  private blockAt(cell: GridCell): HTMLElement | null {
    return this.blocks[cell.row * BOARD_SIZE + cell.col] ?? null;
  }
}
