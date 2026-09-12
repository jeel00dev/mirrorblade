import type { Game } from '../core/Game';
import type { BlockTone, GridCell } from '../game/Piece';

declare global {
  interface Window {
    __MIRRORBLADE_TEST__?: {
      game: Game;
      state: () => Record<string, unknown>;
      setBlades: (value: number) => void;
      setEnergy: (value: number) => void;
      setScore: (value: number) => void;
      forcePiece: (definitionId: string, tone?: BlockTone) => void;
      fillBoard: (cells: readonly GridCell[], tone?: BlockTone) => void;
      endRun: (reason?: 'stuck' | 'fracture' | 'timeout') => void;
      setPlacementDeadline: (remainingMs: number) => void;
      skipCinematic: () => boolean;
      forceOverdrive: () => void;
      forceFracture: () => void;
    };
  }
}

export {};
