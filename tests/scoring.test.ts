import { describe, expect, it } from 'vitest';
import { SCORING } from '../src/config/scoring';
import { ComboSystem } from '../src/game/ComboSystem';
import { ScoreSystem } from '../src/game/ScoreSystem';
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
    expect(result.multiLine).toBe(SCORING.multiLineBonus[2]);
    expect(result.chain).toBe(SCORING.chainStepBonus);
    expect(result.perfectMirror).toBe(SCORING.perfectMirrorBonus);
    expect(result.perfectClear).toBe(SCORING.perfectClearBonus);
    expect(result.clutch).toBe(SCORING.clutchBonus);
    expect(result.total).toBe(result.placement + result.lines + result.multiLine + result.chain + result.perfectMirror + result.perfectClear + result.clutch);
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
