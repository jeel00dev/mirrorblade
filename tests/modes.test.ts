import { describe, expect, it } from 'vitest';
import { CLUTCH, FRACTURE, OVERDRIVE, PLACEMENT_DEADLINE } from '../src/config/modes';
import { SCORING } from '../src/config/scoring';
import { Fracture } from '../src/game/Fracture';
import { Overdrive } from '../src/game/Overdrive';
import { PlacementDeadline, placementWindowMs } from '../src/game/PlacementDeadline';
import { RunClock } from '../src/game/RunClock';
import { ScoreSystem } from '../src/game/ScoreSystem';
import type { SkillEvent } from '../src/game/SkillEvents';

const clearEvent = (chain: number, extras: Partial<SkillEvent> = {}): SkillEvent => ({
  tier: chain > 0 ? 'clear' : 'none', lineCount: chain > 0 ? 1 : 0, perfectMirror: false, perfectClear: false, chain, ...extras,
});

describe('run clock', () => {
  it('only advances while every gate is open', () => {
    let time = 0;
    const clock = new RunClock(() => time);
    clock.reset();
    time = 1000;
    expect(clock.now()).toBe(1000);
    clock.gate('hidden', false);
    time = 5000;
    expect(clock.now()).toBe(1000);
    clock.gate('menu', false);
    clock.gate('hidden', true);
    time = 6000;
    expect(clock.now()).toBe(1000);
    clock.gate('menu', true);
    time = 6500;
    expect(clock.now()).toBe(1500);
    expect(clock.isRunning()).toBe(true);
  });
});

describe('progressive placement deadline', () => {
  it('maps the Director base level to the exact 30→10 second anchor curve', () => {
    expect([0, 0.25, 0.5, 0.75, 1].map(placementWindowMs)).toEqual([30_000, 25_000, 20_000, 15_000, 10_000]);
    expect(placementWindowMs(-3)).toBe(PLACEMENT_DEADLINE.startMs);
    expect(placementWindowMs(4)).toBe(PLACEMENT_DEADLINE.minMs);
    expect(placementWindowMs(Number.NaN)).toBe(PLACEMENT_DEADLINE.startMs);
  });

  it('shows 5 through 1 only in the final five seconds and emits expiry once', () => {
    const deadline = new PlacementDeadline();
    deadline.arm(1_000, 0);
    expect(deadline.snapshot(25_999).warning).toBe(false);
    expect(deadline.snapshot(26_000)).toMatchObject({ active: true, remainingMs: 5_000, seconds: 5, warning: true, expired: false });
    expect(deadline.snapshot(30_001).seconds).toBe(1);
    expect(deadline.snapshot(31_000).expired).toBe(true);
    expect(deadline.update(31_000)).toBe('expired');
    expect(deadline.update(31_001)).toBeNull();
    expect(deadline.snapshot(31_001).active).toBe(false);
  });

  it('re-arms a full score-scaled window after placement and can be cleared', () => {
    const deadline = new PlacementDeadline();
    deadline.arm(0, 0);
    deadline.arm(29_000, 1);
    expect(deadline.snapshot(29_000)).toMatchObject({ active: true, remainingMs: 10_000, windowMs: 10_000, warning: false });
    deadline.clear();
    expect(deadline.snapshot(40_000).active).toBe(false);
  });

  it('inherits hidden/menu fairness from the active run clock', () => {
    let time = 0;
    const clock = new RunClock(() => time);
    const deadline = new PlacementDeadline();
    clock.reset();
    deadline.arm(clock.now(), 0);
    time = 24_000;
    clock.gate('hidden', false);
    const remaining = deadline.snapshot(clock.now()).remainingMs;
    time = 200_000;
    expect(deadline.snapshot(clock.now()).remainingMs).toBe(remaining);
    clock.gate('hidden', true);
    time = 201_000;
    expect(deadline.snapshot(clock.now()).remainingMs).toBe(remaining - 1_000);
  });
});

describe('refraction overdrive', () => {
  it('ignites deterministically at the chain trigger and lasts the configured duration', () => {
    const overdrive = new Overdrive();
    expect(overdrive.onMove(clearEvent(1), 0)).toBe(false);
    expect(overdrive.onMove(clearEvent(2), 0)).toBe(false);
    expect(overdrive.onMove(clearEvent(OVERDRIVE.chainTrigger), 100)).toBe(true);
    expect(overdrive.multiplier()).toBe(SCORING.overdriveMultiplier);
    expect(overdrive.snapshot(100).remainingMs).toBe(OVERDRIVE.durationMs);
    expect(overdrive.update(100 + OVERDRIVE.durationMs - OVERDRIVE.finalWarningMs)).toBe('final');
    expect(overdrive.update(100 + OVERDRIVE.durationMs - 1)).toBeNull();
    expect(overdrive.update(100 + OVERDRIVE.durationMs)).toBe('ended');
    expect(overdrive.multiplier()).toBe(1);
    expect(overdrive.ignitionCount()).toBe(1);
    expect(overdrive.activeMilliseconds()).toBe(OVERDRIVE.durationMs);
  });

  it('applies exactly 2× to the move score', () => {
    const score = new ScoreSystem();
    const single = score.addMove(4, clearEvent(1), { multiplier: 1 });
    const doubled = score.addMove(4, clearEvent(1), { multiplier: 2 });
    expect(doubled.total).toBe(single.total * 2);
    expect(score.current()).toBe(single.total * 3);
  });

  it('does not re-arm until the chain resets', () => {
    const overdrive = new Overdrive();
    overdrive.onMove(clearEvent(3), 0);
    overdrive.update(OVERDRIVE.durationMs);
    expect(overdrive.onMove(clearEvent(4), OVERDRIVE.durationMs + 1)).toBe(false);
    overdrive.onMove(clearEvent(0), OVERDRIVE.durationMs + 2);
    overdrive.onMove(clearEvent(1), OVERDRIVE.durationMs + 3);
    overdrive.onMove(clearEvent(2), OVERDRIVE.durationMs + 4);
    expect(overdrive.onMove(clearEvent(3), OVERDRIVE.durationMs + 5)).toBe(true);
  });

  it('a perfect clear ignites immediately', () => {
    const overdrive = new Overdrive();
    expect(overdrive.onMove(clearEvent(1, { perfectClear: true }), 0)).toBe(true);
  });

  it('pauses with the run clock', () => {
    let time = 0;
    const clock = new RunClock(() => time);
    clock.reset();
    const overdrive = new Overdrive();
    overdrive.onMove(clearEvent(3), clock.now());
    time = 4000;
    clock.gate('hidden', false);
    time = 60_000;
    expect(overdrive.update(clock.now())).toBeNull();
    expect(overdrive.snapshot(clock.now()).remainingMs).toBe(OVERDRIVE.durationMs - 4000);
    clock.gate('hidden', true);
    time = 60_000 + OVERDRIVE.durationMs;
    expect(overdrive.update(clock.now())).toBe('ended');
  });
});

describe('fracture state', () => {
  const eligible = { placements: 10, occupancy: 0.7, stallMoves: 5, legalOptions: 6, tutorialComplete: true, overdriveActive: false };

  it('arms only when every fairness condition holds', () => {
    expect(new Fracture().evaluate({ ...eligible, tutorialComplete: false }, 0)).toBe(false);
    expect(new Fracture().evaluate({ ...eligible, overdriveActive: true }, 0)).toBe(false);
    expect(new Fracture().evaluate({ ...eligible, placements: FRACTURE.minPlacements - 1 }, 0)).toBe(false);
    expect(new Fracture().evaluate({ ...eligible, occupancy: FRACTURE.occupancyThreshold - 0.01 }, 0)).toBe(false);
    expect(new Fracture().evaluate({ ...eligible, stallMoves: FRACTURE.stallMoves - 1 }, 0)).toBe(false);
    expect(new Fracture().evaluate({ ...eligible, legalOptions: 0 }, 0)).toBe(false);
    expect(new Fracture().evaluate({ ...eligible, legalOptions: FRACTURE.maxLegalOptions + 1 }, 0)).toBe(false);
    expect(new Fracture().evaluate(eligible, 0)).toBe(true);
  });

  it('runs warning then a per-placement window, resets on placement and times out', () => {
    const fracture = new Fracture();
    fracture.evaluate(eligible, 0);
    expect(fracture.snapshot(0)).toEqual({ phase: 'warning', remainingMs: FRACTURE.warningMs, windowMs: FRACTURE.warningMs });
    expect(fracture.update(FRACTURE.warningMs - 1)).toBeNull();
    expect(fracture.update(FRACTURE.warningMs)).toBe('active');
    const placedAt = FRACTURE.warningMs + 5000;
    fracture.onAction('place', false, placedAt);
    expect(fracture.snapshot(placedAt).remainingMs).toBe(FRACTURE.placementWindowMs);
    expect(fracture.update(placedAt + FRACTURE.placementWindowMs - 1)).toBeNull();
    expect(fracture.update(placedAt + FRACTURE.placementWindowMs)).toBe('timeout');
    expect(fracture.currentPhase()).toBe('idle');
  });

  it('a cut resets the window when configured', () => {
    const fracture = new Fracture();
    fracture.evaluate(eligible, 0);
    fracture.update(FRACTURE.warningMs);
    fracture.onAction('cut', false, FRACTURE.warningMs + 3000);
    expect(fracture.snapshot(FRACTURE.warningMs + 3000).remainingMs).toBe(FRACTURE.cutResetsWindow ? FRACTURE.placementWindowMs : FRACTURE.placementWindowMs - 3000);
  });

  it('a line clear escapes and starts a cooldown; clutch only inside the threshold', () => {
    const fracture = new Fracture();
    fracture.evaluate(eligible, 0);
    fracture.update(FRACTURE.warningMs);
    const start = FRACTURE.warningMs;
    const early = fracture.onAction('place', true, start + 2000);
    expect(early).toEqual({ escaped: true, clutch: false });
    expect(fracture.currentPhase()).toBe('idle');
    for (let move = 0; move < FRACTURE.cooldownMoves; move += 1) expect(fracture.evaluate(eligible, start + 3000 + move)).toBe(false);
    expect(fracture.evaluate(eligible, start + 9000)).toBe(true);
    fracture.update(start + 9000 + FRACTURE.warningMs);
    const deadline = start + 9000 + FRACTURE.warningMs + FRACTURE.placementWindowMs;
    const clutch = fracture.onAction('place', true, deadline - CLUTCH.thresholdMs + 1);
    expect(clutch).toEqual({ escaped: true, clutch: true });
    expect(fracture.clutchCount()).toBe(1);
    expect(fracture.escapeCount()).toBe(2);
  });

  it('a clear during the warning phase escapes without clutch', () => {
    const fracture = new Fracture();
    fracture.evaluate(eligible, 0);
    expect(fracture.onAction('place', true, 500)).toEqual({ escaped: true, clutch: false });
  });

  it('does not tick while the tab is hidden', () => {
    let time = 0;
    const clock = new RunClock(() => time);
    clock.reset();
    const fracture = new Fracture();
    fracture.evaluate(eligible, clock.now());
    fracture.update(FRACTURE.warningMs);
    time = FRACTURE.warningMs;
    clock.gate('hidden', false);
    time = 999_999;
    expect(fracture.update(clock.now())).toBeNull();
    expect(fracture.snapshot(clock.now()).remainingMs).toBe(FRACTURE.placementWindowMs);
  });
});
