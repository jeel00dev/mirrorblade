import { PLACEMENT_DEADLINE } from '../config/modes';

export interface PlacementDeadlineSnapshot {
  readonly active: boolean;
  readonly remainingMs: number;
  readonly seconds: number;
  readonly warning: boolean;
  readonly expired: boolean;
  readonly windowMs: number;
}

/** Maps the Difficulty Director's base level to a whole-second 30→10 second placement window. */
export function placementWindowMs(baseLevel: number): number {
  const level = Number.isFinite(baseLevel) ? Math.max(0, Math.min(1, baseLevel)) : 0;
  const exact = PLACEMENT_DEADLINE.startMs - (PLACEMENT_DEADLINE.startMs - PLACEMENT_DEADLINE.minMs) * level;
  return Math.max(PLACEMENT_DEADLINE.minMs, Math.min(PLACEMENT_DEADLINE.startMs, Math.round(exact / 1_000) * 1_000));
}

/**
 * One absolute deadline on the active run clock. `update` emits expiry once and disarms the instance;
 * snapshots are pure, which keeps UI and tests independent from animation-frame cadence.
 */
export class PlacementDeadline {
  private expiresAt: number | null = null;
  private windowMs: number = PLACEMENT_DEADLINE.startMs;

  public arm(now: number, baseLevel: number): PlacementDeadlineSnapshot {
    this.windowMs = placementWindowMs(baseLevel);
    this.expiresAt = this.safeNow(now) + this.windowMs;
    return this.snapshot(now);
  }

  public clear(): void {
    this.expiresAt = null;
  }

  public isActive(): boolean {
    return this.expiresAt !== null;
  }

  public snapshot(now: number): PlacementDeadlineSnapshot {
    if (this.expiresAt === null) return { active: false, remainingMs: 0, seconds: 0, warning: false, expired: false, windowMs: this.windowMs };
    const remainingMs = Math.max(0, this.expiresAt - this.safeNow(now));
    const expired = remainingMs <= 0;
    return {
      active: true,
      remainingMs,
      seconds: expired ? 0 : Math.ceil(remainingMs / 1_000),
      warning: !expired && remainingMs <= PLACEMENT_DEADLINE.finalWarningMs,
      expired,
      windowMs: this.windowMs,
    };
  }

  /** Returns `expired` once, then disarms so a delayed frame cannot end the run twice. */
  public update(now: number): 'expired' | null {
    if (this.expiresAt === null || this.safeNow(now) < this.expiresAt) return null;
    this.expiresAt = null;
    return 'expired';
  }

  /** Development/test hook that keeps the current score-derived full window but moves its endpoint. */
  public forceRemaining(now: number, remainingMs: number): void {
    const remaining = Number.isFinite(remainingMs) ? Math.max(0, remainingMs) : 0;
    this.expiresAt = this.safeNow(now) + remaining;
  }

  public reset(): void {
    this.expiresAt = null;
    this.windowMs = PLACEMENT_DEADLINE.startMs;
  }

  private safeNow(now: number): number {
    return Number.isFinite(now) ? Math.max(0, now) : 0;
  }
}
