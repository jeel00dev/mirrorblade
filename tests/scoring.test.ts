import { describe, expect, it } from 'vitest';
import { SCORING } from '../src/config/scoring';
import { clearShardReward } from '../src/config/economy';
import { ComboSystem } from '../src/game/ComboSystem';
import { lineScore, placementScore, ScoreSystem } from '../src/game/ScoreSystem';
import { headlineFor, type SkillEvent } from '../src/game/SkillEvents';

const event = (lineCount: number, chain: number, extras: Partial<SkillEvent> = {}): SkillEvent => ({
  tier: lineCount === 0 ? 'none' : lineCount === 1 ? 'clear' : lineCount === 2 ? 'double' : lineCount === 3 ? 'triple' : 'max',
  lineCount, perfectMirror: false, perfectClear: false, chain, ...extras,
});

describe('score and symmetry chain', () => {
  it('scores unique mirrored cells', () => {
    const score = new ScoreSystem();
    expect(score.addMove(4, event(0, 0)).placement).toBe(40);
    expect(score.current()).toBe(40);
  });

  it('adds line, multi-line, chain, perfect and clutch rewards', () => {
    const score = new ScoreSystem();
    const result = score.addMove(2, event(2, 2, { perfectMirror: true, perfectClear: true }), { clutch: true });
    expect(result.lines).toBe(200);
    expect(result.multiLine).toBe(SCORING.simultaneousLinePairBonus);
    expect(result.chain).toBe(SCORING.chainStepBonus);
    expect(result.perfectMirror).toBe(SCORING.perfectMirrorBonus);
    expect(result.perfectClear).toBe(SCORING.perfectClearBonus);
    expect(result.clutch).toBe(SCORING.clutchBonus);
    expect(result.total).toBe(result.placement + result.lines + result.multiLine + result.chain + result.perfectMirror + result.perfectClear + result.clutch);
  });

  it('uses formulas for polygon placement and every simultaneous line count', () => {
    expect(placementScore(5)).toBe(50);
    expect(placementScore(Number.NaN)).toBe(0);
    expect([0, 1, 2, 3, 4, 5].map((lines) => lineScore(lines).total)).toEqual([0, 100, 300, 600, 1000, 1500]);
  });

  it('adds fixed score rewards through the public multiplier boundary', () => {
    const score = new ScoreSystem();
    expect(score.addBonus(150, 2)).toBe(300);
    expect(score.current()).toBe(300);
    score.set(42.9);
    expect(score.current()).toBe(42);
  });

  it('earns shards directly from the actual rows and columns cleared together', () => {
    expect([0, 1, 2, 3, 4, 5].map((lines) => clearShardReward(lines).total)).toEqual([0, 1, 4, 9, 16, 25]);
    expect(clearShardReward(3)).toEqual({ lines: 3, multiplier: 3, total: 9 });
    expect(clearShardReward(Number.POSITIVE_INFINITY).total).toBe(0);
  });

  it('increments on consecutive clearing moves and resets otherwise', () => {
    const combo = new ComboSystem();
    expect(combo.resolveMove(1)).toBe(1);
    expect(combo.resolveMove(2)).toBe(2);
    expect(combo.resolveMove(0)).toBe(0);
    expect(combo.resolveMove(1)).toBe(1);
  });

  it('picks a single headline in priority order', () => {
    expect(headlineFor(event(1, 1), false)).toBeNull();
    expect(headlineFor(event(2, 1), false)).toBe('DOUBLE');
    expect(headlineFor(event(3, 1), false)).toBe('TRIPLE');
    expect(headlineFor(event(4, 1), false)).toBe('MAX');
    expect(headlineFor(event(1, 1, { perfectMirror: true }), false)).toBe('PERFECT MIRROR');
    expect(headlineFor(event(4, 1, { perfectMirror: true }), false)).toBe('MAX');
    expect(headlineFor(event(1, 1, { perfectClear: true }), false)).toBe('PERFECT CLEAR');
    expect(headlineFor(event(1, 1), true)).toBe('CLUTCH');
  });
});
