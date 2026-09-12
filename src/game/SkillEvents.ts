import { MIRROR_COLUMN } from '../config/gameplay';
import type { ClearResult } from './ClearResolver';

export type ClearTier = 'none' | 'clear' | 'double' | 'triple' | 'max';

export interface SkillEvent {
  /** Headline tier from the number of lines resolved by one placement. */
  readonly tier: ClearTier;
  readonly lineCount: number;
  /** The mirror axis column itself was cleared. */
  readonly perfectMirror: boolean;
  /** The board is empty after the clear. */
  readonly perfectClear: boolean;
  /** Symmetry Chain value after this move (0 when the move cleared nothing). */
  readonly chain: number;
}

export function classifyClear(result: ClearResult, chain: number, boardEmptyAfter: boolean): SkillEvent {
  const tier: ClearTier = result.lineCount === 0 ? 'none'
    : result.lineCount === 1 ? 'clear'
      : result.lineCount === 2 ? 'double'
        : result.lineCount === 3 ? 'triple' : 'max';
  return {
    tier,
    lineCount: result.lineCount,
    perfectMirror: result.columns.includes(MIRROR_COLUMN),
    perfectClear: result.lineCount > 0 && boardEmptyAfter,
    chain: result.lineCount > 0 ? chain : 0,
  };
}

/** The single dominant callout for a move, so celebrations never stack. */
export function headlineFor(event: SkillEvent, clutch: boolean): string | null {
  if (clutch) return 'CLUTCH';
  if (event.perfectClear) return 'PERFECT CLEAR';
  if (event.tier === 'max') return 'MAX';
  if (event.perfectMirror) return 'PERFECT MIRROR';
  if (event.tier === 'triple') return 'TRIPLE';
  if (event.tier === 'double') return 'DOUBLE';
  return null;
}
