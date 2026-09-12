import { BLADE_ENERGY } from '../config/blade';
import type { SkillEvent } from './SkillEvents';

export interface EnergyGain {
  readonly amount: number;
  /** Blades forged by this gain (0 or 1 — one forge per move keeps the celebration legible). */
  readonly bladesForged: number;
  readonly energyBefore: number;
  readonly energyAfter: number;
  /** Cost that applied before this gain (what "100 %" meant on the ring). */
  readonly costBefore: number;
  readonly costAfter: number;
}

export interface BladeRack {
  readonly blades: number;
  /** Raw energy toward the current forge. */
  readonly energy: number;
  /** Blades forged so far this run — drives the rising recharge cost. */
  readonly bladesEarned: number;
}

export function createRack(blades: number): BladeRack {
  return { blades, energy: 0, bladesEarned: 0 };
}

/** Energy required to forge the next blade after `bladesEarned` forges: rises and caps. */
export function rechargeCost(bladesEarned: number): number {
  const { base, step, curve, max } = BLADE_ENERGY.recharge;
  const n = Math.max(0, bladesEarned);
  return Math.min(max, base + step * n + curve * (n * (n - 1)) / 2);
}

/** 0–1 progress toward the current forge, which is what the ring shows. */
export function energyProgress(rack: BladeRack): number {
  return Math.max(0, Math.min(1, rack.energy / rechargeCost(rack.bladesEarned)));
}

/** Charge tier for presentation: I at base cost, rising as the cost rises (never more than V). */
export function chargeTier(rack: BladeRack): 1 | 2 | 3 | 4 | 5 {
  const { base, max } = BLADE_ENERGY.recharge;
  const t = (rechargeCost(rack.bladesEarned) - base) / Math.max(1, max - base);
  return Math.max(1, Math.min(5, 1 + Math.round(t * 4))) as 1 | 2 | 3 | 4 | 5;
}

export function energyForEvent(event: SkillEvent, clutch = false): number {
  const gains = BLADE_ENERGY.gains;
  let amount = event.tier === 'clear' ? gains.single
    : event.tier === 'double' ? gains.double
      : event.tier === 'triple' ? gains.triple
        : event.tier === 'max' ? gains.max : 0;
  if (event.perfectMirror) amount += gains.perfectMirror;
  if (event.perfectClear) amount += gains.perfectClear;
  if (event.chain > 1) amount += Math.min(gains.chainCap, (event.chain - 1) * gains.chainPerLink);
  if (clutch) amount += gains.clutch;
  return amount;
}

export function applyEnergy(rack: BladeRack, amount: number): { rack: BladeRack; gain: EnergyGain } {
  const energyBefore = rack.energy;
  const costBefore = rechargeCost(rack.bladesEarned);
  let energy = rack.energy + amount;
  let blades = rack.blades;
  let bladesEarned = rack.bladesEarned;
  let bladesForged = 0;
  if (energy >= costBefore && blades < BLADE_ENERGY.maxBlades) {
    energy -= costBefore;
    blades += 1;
    bladesEarned += 1;
    bladesForged = 1;
  }
  const costAfter = rechargeCost(bladesEarned);
  // Rack full: hold a full meter (banked) rather than throwing the achievement away.
  if (blades >= BLADE_ENERGY.maxBlades) energy = Math.min(energy, BLADE_ENERGY.bankWhileFull ? costAfter : costAfter - 1);
  energy = Math.max(0, Math.min(costAfter, energy));
  return { rack: { blades, energy, bladesEarned }, gain: { amount, bladesForged, energyBefore, energyAfter: energy, costBefore, costAfter } };
}

/** Spending a blade redeems a banked full meter immediately (the redeemed blade counts as forged). */
export function spendBlade(rack: BladeRack): { rack: BladeRack; redeemed: boolean } {
  if (rack.blades <= 0) return { rack, redeemed: false };
  let blades = rack.blades - 1;
  let energy = rack.energy;
  let bladesEarned = rack.bladesEarned;
  let redeemed = false;
  const cost = rechargeCost(bladesEarned);
  if (energy >= cost && blades < BLADE_ENERGY.maxBlades) {
    energy -= cost;
    blades += 1;
    bladesEarned += 1;
    redeemed = true;
  }
  return { rack: { blades, energy, bladesEarned }, redeemed };
}
