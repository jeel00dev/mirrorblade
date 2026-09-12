import { describe, expect, it } from 'vitest';
import { BLADE_ENERGY } from '../src/config/blade';
import { applyEnergy, energyForEvent, rechargeCost, spendBlade } from '../src/game/BladeEnergy';
import { classifyClear } from '../src/game/SkillEvents';

const event = (lineCount: number, chain = 1, extras: Partial<{ perfectMirror: boolean; perfectClear: boolean }> = {}) => ({
  tier: lineCount === 0 ? 'none' as const : lineCount === 1 ? 'clear' as const : lineCount === 2 ? 'double' as const : lineCount === 3 ? 'triple' as const : 'max' as const,
  lineCount,
  perfectMirror: false,
  perfectClear: false,
  chain,
  ...extras,
});

describe('blade energy', () => {
  it('awards configured gains per tier and extras', () => {
    expect(energyForEvent(event(0, 0))).toBe(0);
    expect(energyForEvent(event(1))).toBe(BLADE_ENERGY.gains.single);
    expect(energyForEvent(event(2))).toBe(BLADE_ENERGY.gains.double);
    expect(energyForEvent(event(3))).toBe(BLADE_ENERGY.gains.triple);
    expect(energyForEvent(event(4))).toBe(BLADE_ENERGY.gains.max);
    expect(energyForEvent(event(5))).toBe(BLADE_ENERGY.gains.max);
    expect(energyForEvent(event(1, 1, { perfectMirror: true }))).toBe(BLADE_ENERGY.gains.single + BLADE_ENERGY.gains.perfectMirror);
    expect(energyForEvent(event(1, 1, { perfectClear: true }))).toBe(BLADE_ENERGY.gains.single + BLADE_ENERGY.gains.perfectClear);
    expect(energyForEvent(event(1), true)).toBe(BLADE_ENERGY.gains.single + BLADE_ENERGY.gains.clutch);
  });

  it('chain bonus grows per link and is capped', () => {
    expect(energyForEvent(event(1, 2))).toBe(BLADE_ENERGY.gains.single + BLADE_ENERGY.gains.chainPerLink);
    expect(energyForEvent(event(1, 99))).toBe(BLADE_ENERGY.gains.single + BLADE_ENERGY.gains.chainCap);
  });

  it('reaching exactly the first cost forges exactly one blade and resets to zero', () => {
    const { rack, gain } = applyEnergy({ blades: 3, energy: 92, bladesEarned: 0 }, 8);
    expect(gain.bladesForged).toBe(1);
    expect(rack.blades).toBe(4);
    expect(rack.energy).toBe(0);
    expect(rack.bladesEarned).toBe(1);
  });

  it('overflow carries into the next (more expensive) meter', () => {
    const { rack, gain } = applyEnergy({ blades: 2, energy: 90, bladesEarned: 0 }, 45);
    expect(gain.bladesForged).toBe(1);
    expect(rack).toEqual({ blades: 3, energy: 35, bladesEarned: 1 });
    expect(gain.costAfter).toBe(rechargeCost(1));
  });

  it('never forges more than one blade per move even with huge gains', () => {
    const { rack } = applyEnergy({ blades: 0, energy: 0, bladesEarned: 0 }, 400);
    expect(rack.blades).toBe(1);
    expect(rack.energy).toBe(rechargeCost(1));
  });

  it('respects the maximum blade count and banks a full meter', () => {
    const { rack, gain } = applyEnergy({ blades: BLADE_ENERGY.maxBlades, energy: 80, bladesEarned: 0 }, 45);
    expect(gain.bladesForged).toBe(0);
    expect(rack.blades).toBe(BLADE_ENERGY.maxBlades);
    expect(rack.energy).toBe(rechargeCost(0));
    const spent = spendBlade(rack);
    expect(spent.redeemed).toBe(true);
    expect(spent.rack).toEqual({ blades: BLADE_ENERGY.maxBlades, energy: 0, bladesEarned: 1 });
  });

  it('spending with no blades does nothing', () => {
    expect(spendBlade({ blades: 0, energy: 40, bladesEarned: 0 })).toEqual({ rack: { blades: 0, energy: 40, bladesEarned: 0 }, redeemed: false });
    expect(spendBlade({ blades: 2, energy: 40, bladesEarned: 0 }).rack).toEqual({ blades: 1, energy: 40, bladesEarned: 0 });
  });

  it('classifies clears, perfect mirror and perfect clear', () => {
    const base = { rows: [] as number[], columns: [] as number[], cells: [], lineCount: 0 };
    expect(classifyClear({ ...base, rows: [1, 2], lineCount: 2 }, 3, false).tier).toBe('double');
    expect(classifyClear({ ...base, columns: [4], lineCount: 1 }, 1, false).perfectMirror).toBe(true);
    expect(classifyClear({ ...base, columns: [3, 5], lineCount: 2 }, 1, false).perfectMirror).toBe(false);
    expect(classifyClear({ ...base, rows: [0], lineCount: 1 }, 1, true).perfectClear).toBe(true);
    expect(classifyClear(base, 0, true).perfectClear).toBe(false);
    expect(classifyClear({ ...base, rows: [0, 1, 2, 3], lineCount: 4 }, 2, false).tier).toBe('max');
  });
});
