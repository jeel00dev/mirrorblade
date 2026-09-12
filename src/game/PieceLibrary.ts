import type { GridCell } from './Piece';

export type PieceRating = 1 | 2 | 3 | 4 | 5;

export interface PieceDefinition {
  readonly id: string;
  readonly label: string;
  readonly cells: readonly GridCell[];
  /** Base weight before the Difficulty Director's rating multiplier. */
  readonly weight: number;
  /** 1 = extremely easy … 5 = very difficult to fit symmetrically. */
  readonly rating: PieceRating;
}

const c = (row: number, col: number): GridCell => ({ row, col });

/**
 * With free rotation, mirrored orientations (S/Z, L/J, both line directions) do not need separate entries;
 * the weights below are per shape family. The rating drives the difficulty curve (config/difficulty.ts).
 */
export const PIECE_LIBRARY: readonly PieceDefinition[] = [
  { id: 'single', label: 'Single', cells: [c(0, 0)], weight: 7, rating: 1 },
  { id: 'domino', label: 'Domino', cells: [c(0, 0), c(0, 1)], weight: 12, rating: 1 },
  { id: 'line3', label: 'Three', cells: [c(0, 0), c(0, 1), c(0, 2)], weight: 12, rating: 2 },
  { id: 'l3', label: 'Small L', cells: [c(0, 0), c(1, 0), c(1, 1)], weight: 12, rating: 2 },
  { id: 'square4', label: 'Square', cells: [c(0, 0), c(0, 1), c(1, 0), c(1, 1)], weight: 9, rating: 2 },
  { id: 'line4', label: 'Four', cells: [c(0, 0), c(0, 1), c(0, 2), c(0, 3)], weight: 8, rating: 3 },
  { id: 't4', label: 'T', cells: [c(0, 0), c(0, 1), c(0, 2), c(1, 1)], weight: 9, rating: 3 },
  { id: 'l4', label: 'Long L', cells: [c(0, 0), c(1, 0), c(2, 0), c(2, 1)], weight: 9, rating: 3 },
  { id: 's4', label: 'S', cells: [c(0, 1), c(0, 2), c(1, 0), c(1, 1)], weight: 8, rating: 3 },
  { id: 'p5', label: 'Compact P', cells: [c(0, 0), c(0, 1), c(1, 0), c(1, 1), c(2, 0)], weight: 5, rating: 3 },
  { id: 'line5', label: 'Five', cells: [c(0, 0), c(0, 1), c(0, 2), c(0, 3), c(0, 4)], weight: 5, rating: 4 },
  { id: 'l5', label: 'Large L', cells: [c(0, 0), c(1, 0), c(2, 0), c(3, 0), c(3, 1)], weight: 5, rating: 4 },
  { id: 'u5', label: 'U', cells: [c(0, 0), c(1, 0), c(1, 1), c(1, 2), c(0, 2)], weight: 5, rating: 4 },
  { id: 'n5', label: 'N', cells: [c(0, 0), c(1, 0), c(1, 1), c(2, 1), c(3, 1)], weight: 4, rating: 4 },
  { id: 'w5', label: 'W', cells: [c(0, 0), c(1, 0), c(1, 1), c(2, 1), c(2, 2)], weight: 4, rating: 5 },
  { id: 'plus5', label: 'Plus', cells: [c(0, 1), c(1, 0), c(1, 1), c(1, 2), c(2, 1)], weight: 4, rating: 5 },
  { id: 't5', label: 'Long T', cells: [c(0, 0), c(0, 1), c(0, 2), c(1, 1), c(2, 1)], weight: 4, rating: 5 },
  { id: 'corner3x3', label: 'Big Corner', cells: [c(0, 0), c(1, 0), c(2, 0), c(2, 1), c(2, 2)], weight: 4, rating: 5 },
];

export function getPieceDefinition(id: string): PieceDefinition | undefined {
  return PIECE_LIBRARY.find((definition) => definition.id === id);
}
