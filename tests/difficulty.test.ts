import { describe, expect, it } from 'vitest';
import { BLADE_ENERGY } from '../src/config/blade';
import { DIFFICULTY, PRECISION } from '../src/config/difficulty';
import { applyEnergy, chargeTier, createRack, energyProgress, rechargeCost, spendBlade } from '../src/game/BladeEnergy';
import { BoardState } from '../src/game/BoardState';
import { Contracts } from '../src/game/Contracts';
import { DifficultyDirector } from '../src/game/DifficultyDirector';
import { averageRatingAt, easyShareAt, PieceGenerator } from '../src/game/PieceGenerator';
import { PIECE_LIBRARY } from '../src/game/PieceLibrary';
import { PrecisionCells } from '../src/game/PrecisionCells';
import { SeededRandom } from '../src/game/SeededRandom';

describe('difficulty director', () => {
  it('follows the published score curve and caps at 1', () => {
    expect(DifficultyDirector.levelForScore(0)).toBe(0);
    expect(DifficultyDirector.levelForScore(1_250)).toBeCloseTo(0.125);
    expect(DifficultyDirector.levelForScore(2_500)).toBe(0.25);
    expect(DifficultyDirector.levelForScore(7_500)).toBe(0.5);
    expect(DifficultyDirector.levelForScore(30_000)).toBe(1);
    expect(DifficultyDirector.levelForScore(9_999_999)).toBe(1);
    expect(DifficultyDirector.stageFor(0)).toBe(1);
    expect(DifficultyDirector.stageFor(0.25)).toBe(2);
    expect(DifficultyDirector.stageFor(0.99)).toBe(4);
    expect(DifficultyDirector.stageFor(1)).toBe(5);
  });

  it('builds Mirror Stress on stalls after a grace period and relieves it with clears, bounded', () => {
    const director = new DifficultyDirector();
    const stall = { score: 0, lineCount: 0, occupancy: 0.3, legalOptions: 40 };
    director.observe(stall); director.observe(stall);
    expect(director.currentStress()).toBe(0);
    director.observe(stall);
    expect(director.currentStress()).toBeCloseTo(DIFFICULTY.stress.perStallMove);
    for (let move = 0; move < 20; move += 1) director.observe(stall);
    expect(director.currentStress()).toBe(1);
    expect(director.observe({ ...stall, score: 30_000 }).level).toBe(1);
    director.observe({ ...stall, lineCount: 1 });
    expect(director.currentStress()).toBeCloseTo(1 - DIFFICULTY.stress.relief.single);
    director.observe({ ...stall, lineCount: 3 });
    expect(director.currentStress()).toBe(0);
  });

  it('stress raises the effective level by at most the configured influence', () => {
    const director = new DifficultyDirector();
    for (let move = 0; move < 10; move += 1) director.observe({ score: 2_500, lineCount: 0, occupancy: 0.5, legalOptions: 10 });
    const state = director.state();
    expect(state.base).toBe(0.25);
    expect(state.level).toBeCloseTo(0.25 + DIFFICULTY.stressInfluence);
  });

  it('reports each milestone exactly once', () => {
    const director = new DifficultyDirector();
    expect(director.observe({ score: 2_600, lineCount: 1, occupancy: 0.2, legalOptions: 50 }).milestone).toBe(0);
    expect(director.observe({ score: 2_700, lineCount: 1, occupancy: 0.2, legalOptions: 50 }).milestone).toBeNull();
    expect(director.observe({ score: 16_000, lineCount: 1, occupancy: 0.2, legalOptions: 50 }).milestone).toBe(2);
    expect(director.observe({ score: 16_100, lineCount: 1, occupancy: 0.2, legalOptions: 50 }).milestone).toBeNull();
  });
});

describe('blade recharge scaling', () => {
  it('costs rise per blade forged and cap', () => {
    expect(rechargeCost(0)).toBe(100);
    expect(rechargeCost(1)).toBe(115);
    expect(rechargeCost(2)).toBe(135);
    expect(rechargeCost(3)).toBe(160);
    expect(rechargeCost(4)).toBe(190);
    expect(rechargeCost(5)).toBe(BLADE_ENERGY.recharge.max);
    expect(rechargeCost(40)).toBe(BLADE_ENERGY.recharge.max);
    expect(chargeTier(createRack(3))).toBe(1);
    expect(chargeTier({ blades: 3, energy: 0, bladesEarned: 40 })).toBe(5);
  });

  it('the ring shows progress against the current cost and forging raises the next cost', () => {
    let rack = createRack(3);
    expect(energyProgress({ ...rack, energy: 50 })).toBe(0.5);
    const first = applyEnergy({ ...rack, energy: 96 }, 6);
    expect(first.gain.bladesForged).toBe(1);
    expect(first.gain.costBefore).toBe(100);
    expect(first.gain.costAfter).toBe(115);
    rack = first.rack;
    expect(rack).toEqual({ blades: 4, energy: 2, bladesEarned: 1 });
    expect(energyProgress({ ...rack, energy: 57.5 })).toBeCloseTo(0.5);
    const second = applyEnergy({ ...rack, energy: 110 }, 6);
    expect(second.gain.bladesForged).toBe(1);
    expect(second.rack.bladesEarned).toBe(2);
    expect(second.rack.energy).toBe(1);
  });

  it('banks a full meter at the current cost when the rack is full and redeems it on spend', () => {
    const full = applyEnergy({ blades: BLADE_ENERGY.maxBlades, energy: 100, bladesEarned: 2 }, 60);
    expect(full.gain.bladesForged).toBe(0);
    expect(full.rack.energy).toBe(rechargeCost(2));
    const spent = spendBlade(full.rack);
    expect(spent.redeemed).toBe(true);
    expect(spent.rack).toEqual({ blades: BLADE_ENERGY.maxBlades, energy: 0, bladesEarned: 3 });
  });
});

describe('piece distribution', () => {
  it('every library piece has a rating and the easy share falls with level but never disappears', () => {
    expect(PIECE_LIBRARY.every((piece) => piece.rating >= 1 && piece.rating <= 5)).toBe(true);
    const early = easyShareAt(0);
    const mid = easyShareAt(0.5);
    const late = easyShareAt(1);
    expect(early).toBeGreaterThan(0.6);
    expect(mid).toBeLessThan(early);
    expect(late).toBeLessThan(mid);
    expect(late).toBeGreaterThanOrEqual(0.12);
    expect(late).toBeLessThanOrEqual(0.25);
    expect(averageRatingAt(1)).toBeGreaterThan(averageRatingAt(0) + 1);
    expect(DifficultyDirector.pieceWeightMultiplier(5, 0)).toBe(0);
    expect(DifficultyDirector.pieceWeightMultiplier(5, 1)).toBe(1);
  });

  it('the generator draws harder pieces at higher levels over many batches', () => {
    const board = new BoardState();
    const rating = (level: number): number => {
      const generator = new PieceGenerator(new SeededRandom(42));
      let sum = 0; let count = 0;
      for (let batch = 0; batch < 200; batch += 1) for (const piece of generator.nextBatch(board, level)) { sum += PIECE_LIBRARY.find((d) => d.id === piece.definitionId)!.rating; count += 1; }
      return sum / count;
    };
    expect(rating(0)).toBeLessThan(2.4);
    expect(rating(1)).toBeGreaterThan(3.2);
    expect(rating(0.5)).toBeGreaterThan(rating(0));
    expect(rating(1)).toBeGreaterThan(rating(0.5));
  });
});

describe('mirror contracts', () => {
  const random = new SeededRandom(7);
  const context = { level: 0.5, stage: 3, fracture: false, overdrive: false, blades: 2 };

  it('offers only after the minimum level, outside Fracture/Overdrive, on the configured cadence', () => {
    const contracts = new Contracts();
    for (let move = 0; move < 30; move += 1) expect(contracts.tick({ ...context, level: 0.1 }, random)).toBeNull();
    for (let move = 0; move < 30; move += 1) expect(contracts.tick({ ...context, fracture: true }, random)).toBeNull();
    let offered = null;
    for (let move = 0; move < 20 && !offered; move += 1) offered = contracts.tick(context, random);
    expect(offered).not.toBeNull();
    expect(contracts.current()).toBe(offered);
    expect(contracts.tick(context, random)).toBeNull();
  });

  it('completes, progresses and lapses without punishment', () => {
    const contracts = new Contracts();
    let offered = null;
    for (let move = 0; move < 20 && !offered; move += 1) offered = contracts.tick(context, random);
    const contract = offered!;
    const win = { 'clear-lines': { lineCount: 3, rotated: false, fragment: false }, double: { lineCount: 2, rotated: false, fragment: false }, 'rotated-clear': { lineCount: 1, rotated: true, fragment: false }, 'fragment-clear': { lineCount: 1, rotated: false, fragment: true } }[contract.kind];
    const result = contracts.onMove(win);
    expect(result.outcome).toBe('completed');
    expect(contracts.current()).toBeNull();
    expect(contracts.summary().completed).toBe(1);
    expect(contract.reward.score).toBeGreaterThan(0);

    let next = null;
    for (let move = 0; move < 40 && !next; move += 1) next = contracts.tick(context, random);
    const lapse = next!;
    const window = lapse.movesLeft;
    let outcome = null;
    for (let move = 0; move < window + 1 && outcome !== 'lapsed'; move += 1) outcome = contracts.onMove({ lineCount: 0, rotated: false, fragment: false }).outcome;
    expect(outcome).toBe('lapsed');
    expect(contracts.summary().lapsed).toBe(1);
  });
});

describe('precision cells', () => {
  it('only marks mirrored empty pairs in nearly complete lines and pays out when both clear', () => {
    const board = new BoardState();
    // Row 3 has 7 of 9 filled: columns 1 and 7 (a mirrored pair) are empty.
    board.occupy([0, 2, 3, 4, 5, 6, 8].map((col) => ({ row: 3, col })), { tone: 'cyan', pieceId: 'x' });
    const cells = new PrecisionCells();
    const random = new SeededRandom(3);
    let target = null;
    for (let move = 0; move < 20 && !target; move += 1) target = cells.tick(board, 0.5, random);
    expect(target).not.toBeNull();
    expect(target!.cells[0]).toEqual({ row: 3, col: 1 });
    expect(target!.cells[1]).toEqual({ row: 3, col: 7 });
    expect(cells.onMove([{ row: 3, col: 1 }])).toBeNull();
    expect(cells.onMove(Array.from({ length: 9 }, (_, col) => ({ row: 3, col })))).toBe('hit');
    expect(cells.summary().hit).toBe(1);
  });

  it('does not spawn below the minimum level or without a plausible line, and expires', () => {
    const empty = new BoardState();
    const cells = new PrecisionCells();
    const random = new SeededRandom(5);
    for (let move = 0; move < 40; move += 1) expect(cells.tick(empty, 1, random)).toBeNull();
    const board = new BoardState();
    board.occupy([0, 2, 3, 4, 5, 6, 8].map((col) => ({ row: 3, col })), { tone: 'cyan', pieceId: 'x' });
    for (let move = 0; move < 40; move += 1) expect(cells.tick(board, 0.2, random)).toBeNull();
    let target = null;
    for (let move = 0; move < 20 && !target; move += 1) target = cells.tick(board, 0.9, random);
    expect(target).not.toBeNull();
    let result = null;
    for (let move = 0; move < PRECISION.lifetimeMoves; move += 1) result = cells.onMove([]);
    expect(result).toBe('expired');
    expect(cells.current()).toBeNull();
  });
});
