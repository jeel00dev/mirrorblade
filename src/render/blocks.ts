import { pieceDimensions, type BlockTone, type GridCell, type Piece } from '../game/Piece';

/** One block face. Identical markup everywhere so tray and board colour can never diverge. */
export function blockMarkup(tone: BlockTone): string {
  return `<i class="blk tone-${tone}"></i>`;
}

export interface PieceMarkupOptions {
  /** CSS pixel size of one cell; omit to inherit --cell from the container. */
  cellPx?: number;
  interactive?: boolean;
  extraClass?: string;
}

export function pieceMarkup(piece: Pick<Piece, 'cells' | 'tone'> & Partial<Pick<Piece, 'id' | 'definitionId' | 'cutGeneration' | 'rotation'>>, options: PieceMarkupOptions = {}): string {
  const dimensions = pieceDimensions(piece);
  const cells = piece.cells.map((cell) =>
    `<span class="pc" style="--row:${cell.row + 1};--col:${cell.col + 1}">${blockMarkup(piece.tone)}</span>`,
  ).join('');
  const style = `--rows:${dimensions.rows};--cols:${dimensions.cols};${options.cellPx ? `--cell:${options.cellPx}px;` : ''}`;
  const attrs = options.interactive && piece.id
    ? ` data-piece-id="${piece.id}" role="button" tabindex="0" aria-label="${describePiece(piece)}"`
    : '';
  const classes = ['piece', (piece.cutGeneration ?? 0) > 0 ? 'is-fragment' : '', options.extraClass ?? ''].filter(Boolean).join(' ');
  return `<div class="${classes}" style="${style}"${attrs}><span class="cut-guide" aria-hidden="true"></span>${cells}</div>`;
}

export function describePiece(piece: Pick<Piece, 'cells' | 'tone'> & Partial<Pick<Piece, 'definitionId' | 'cutGeneration'>>): string {
  const dimensions = pieceDimensions(piece);
  const shape = piece.definitionId?.replace(/-[ab]$/, '') ?? 'piece';
  return `${piece.tone} ${shape}${(piece.cutGeneration ?? 0) > 0 ? ' fragment' : ''}, ${dimensions.rows} by ${dimensions.cols}. Tap to rotate, drag to place.`;
}

export function cellsToMarkup(cells: readonly GridCell[], tone: BlockTone, cellPx?: number): string {
  return pieceMarkup({ cells, tone }, { cellPx });
}
