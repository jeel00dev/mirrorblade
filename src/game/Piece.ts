export interface GridCell {
  readonly row: number;
  readonly col: number;
}

export type BlockTone = 'cyan' | 'coral' | 'amber' | 'violet';
export type Rotation = 0 | 1 | 2 | 3;

export interface Piece {
  readonly id: string;
  readonly definitionId: string;
  /** Normalized cells for the current orientation. */
  readonly cells: readonly GridCell[];
  readonly tone: BlockTone;
  /** How many cuts produced this piece: 0 for a tray original, 1+ for fragments. Fragments can be cut again. */
  readonly cutGeneration: number;
  readonly parentId?: string;
  readonly sourceSetId: number;
  /** Quarter turns clockwise applied by the player. */
  readonly rotation: Rotation;
}

let nextPieceId = 1;

export function cellKey(cell: GridCell): string {
  return `${cell.row}:${cell.col}`;
}

export function normalizeCells(cells: readonly GridCell[]): GridCell[] {
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  return cells
    .map(({ row, col }) => ({ row: row - minRow, col: col - minCol }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

export function createPiece(
  definitionId: string,
  cells: readonly GridCell[],
  tone: BlockTone,
  sourceSetId: number,
  cutGeneration = 0,
  parentId?: string,
): Piece {
  return {
    id: `piece-${nextPieceId++}`,
    definitionId,
    cells: normalizeCells(cells),
    tone,
    cutGeneration,
    parentId,
    sourceSetId,
    rotation: 0,
  };
}

export function pieceDimensions(piece: Pick<Piece, 'cells'>): { rows: number; cols: number } {
  return {
    rows: Math.max(...piece.cells.map((cell) => cell.row)) + 1,
    cols: Math.max(...piece.cells.map((cell) => cell.col)) + 1,
  };
}

/** Rotates a normalized cell set 90° clockwise: (row, col) -> (col, rows - 1 - row). */
export function rotateCellsClockwise(cells: readonly GridCell[]): GridCell[] {
  const { rows } = pieceDimensions({ cells });
  return normalizeCells(cells.map(({ row, col }) => ({ row: col, col: rows - 1 - row })));
}

/** Returns the same tray piece (same id, tone, lineage) one quarter turn clockwise. Free — never costs a blade. */
export function rotatePiece(piece: Piece): Piece {
  return {
    ...piece,
    cells: rotateCellsClockwise(piece.cells),
    rotation: ((piece.rotation + 1) % 4) as Rotation,
  };
}

/** True when a quarter turn changes nothing visible (single, square), so the UI can skip the rotation animation. */
export function hasQuarterSymmetry(piece: Pick<Piece, 'cells'>): boolean {
  return sameCells(piece.cells, rotateCellsClockwise(piece.cells));
}

export function sameCells(a: readonly GridCell[], b: readonly GridCell[]): boolean {
  if (a.length !== b.length) return false;
  const keys = new Set(a.map(cellKey));
  return b.every((cell) => keys.has(cellKey(cell)));
}

/** All distinct orientations of a cell set (1, 2 or 4 entries). */
export function distinctOrientations(cells: readonly GridCell[]): GridCell[][] {
  const result: GridCell[][] = [];
  let current = normalizeCells(cells);
  for (let turn = 0; turn < 4; turn += 1) {
    if (!result.some((known) => sameCells(known, current))) result.push(current);
    current = rotateCellsClockwise(current);
  }
  return result;
}

export function cellsAreConnected(cells: readonly GridCell[]): boolean {
  if (cells.length === 0) return false;
  const keys = new Set(cells.map(cellKey));
  const visited = new Set<string>();
  const queue: GridCell[] = [cells[0]!];
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = cellKey(cell);
    if (visited.has(key)) continue;
    visited.add(key);
    const neighbors = [
      { row: cell.row - 1, col: cell.col },
      { row: cell.row + 1, col: cell.col },
      { row: cell.row, col: cell.col - 1 },
      { row: cell.row, col: cell.col + 1 },
    ];
    neighbors.forEach((neighbor) => {
      const neighborKey = cellKey(neighbor);
      if (keys.has(neighborKey) && !visited.has(neighborKey)) queue.push(neighbor);
    });
  }
  return visited.size === cells.length;
}
