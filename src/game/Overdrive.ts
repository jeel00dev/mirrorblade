import { OVERDRIVE } from '../config/modes';
import { SCORING } from '../config/scoring';
import type { SkillEvent } from './SkillEvents';

export type OverdrivePhase = 'idle' | 'active' | 'final';

export interface OverdriveSnapshot {
  readonly phase: OverdrivePhase;
  readonly remainingMs: number;
  readonly multiplier: number;
  readonly progress: number;
}

/**
 * Refraction Overdrive: a deterministic, skill-triggered 2× window on the run clock.
 * `update(now)` must be called before reading; it reports edge events for presentation.
 */
export class Overdrive {
  private endsAt: number | null = null;
  private armed = true;
  private ignitions = 0;
  private activeMsTotal = 0;
  private lastTick = 0;

  public snapshot(now: number): OverdriveSnapshot {
    if (this.endsAt === null) return { phase: 'idle', remainingMs: 0, multiplier: 1, progress: 0 };
    const remainingMs = Math.max(0, this.endsAt - now);
    return {
      phase: remainingMs <= OVERDRIVE.finalWarningMs ? 'final' : 'active',
      remainingMs,
      multiplier: SCORING.overdriveMultiplier,
      progress: remainingMs / OVERDRIVE.durationMs,
    };
  }

  public isActive(): boolean {
    return this.endsAt !== null;
  }

  public multiplier(): number {
    return this.endsAt === null ? 1 : SCORING.overdriveMultiplier;
  }

  public ignitionCount(): number {
    return this.ignitions;
  }

  public activeMilliseconds(): number {
    return this.activeMsTotal;
  }

  /** Called after each committed move. Returns true when this move ignited Overdrive. */
  public onMove(event: SkillEvent, now: number): boolean {
    if (event.chain === 0 && OVERDRIVE.rearmRequiresChainReset) this.armed = true;
    if (this.endsAt !== null || !this.armed) return false;
    const trigger = event.chain >= OVERDRIVE.chainTrigger || (OVERDRIVE.perfectClearTriggers && event.perfectClear);
    if (!trigger) return false;
    this.endsAt = now + OVERDRIVE.durationMs;
    this.armed = !OVERDRIVE.rearmRequiresChainReset;
    this.ignitions += 1;
    this.lastTick = now;
    return true;
  }

  /** Advances the timer. Returns 'ended' on the frame the window closes, 'final' on entering the last seconds. */
  public update(now: number): 'ended' | 'final' | null {
    if (this.endsAt === null) return null;
    const before = this.snapshot(this.lastTick).phase;
    this.activeMsTotal += Math.max(0, Math.min(now, this.endsAt) - this.lastTick);
    this.lastTick = now;
    if (now >= this.endsAt) {
      this.endsAt = null;
      return 'ended';
    }
    return before === 'active' && this.snapshot(now).phase === 'final' ? 'final' : null;
  }

  public reset(): void {
    this.endsAt = null;
    this.armed = true;
    this.ignitions = 0;
    this.activeMsTotal = 0;
    this.lastTick = 0;
  }
}
