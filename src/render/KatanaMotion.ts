import type { KatanaDesign } from '../config/katanas';
export interface KatanaMotion {
  phase: 'flourish' | 'hold';
  progress: number;
  strength: number;
  yaw: number;
  tilt: number;
  lift: number;
}
/** Explicit choreography; the hold has zero drift, particles or pulsing. */
export function sampleKatanaMotion(design: KatanaDesign, elapsed: number, still = false): KatanaMotion {
  const t = Math.max(0, elapsed) % (design.duration + design.hold);
  const rest: KatanaMotion = { phase: 'hold', progress: 1, strength: 0, yaw: 0.32, tilt: 0, lift: 0 };
  if (still || t >= design.duration) return rest;
  const progress = t / design.duration;
  const envelope = Math.sin(Math.PI * progress) ** 2;
  return {
    phase: 'flourish', progress, strength: envelope,
    yaw: rest.yaw + Math.sin(progress * Math.PI * 2) * (0.3 + design.tier * 0.065) * envelope,
    tilt: Math.sin(progress * Math.PI * 2) * (0.025 + design.tier * 0.012) * envelope,
    lift: Math.sin(progress * Math.PI) * (0.03 + design.tier * 0.014) * envelope,
  };
}
