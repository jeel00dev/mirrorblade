import { CLUTCH, FRACTURE } from '../config/modes';

export type FracturePhase = 'idle' | 'warning' | 'active';

export interface FractureSnapshot {
  readonly phase: FracturePhase;
  /** Milliseconds until the current phase deadline. */
  readonly remainingMs: number;
  readonly windowMs: number;
}

export interface FractureConditions {
  readonly placements: number;
  readonly occupancy: number;
  readonly stallMoves: number;
  readonly legalOptions: number;
  readonly tutorialComplete: boolean;
  readonly overdriveActive: boolean;
}

/**
 * Fracture State: a fair pressure phase. It only arms when the board is dense, the player has stalled,
 * options are scarce and a legal move still exists. Each placement (or cut) resets the window;
 * any line clear escapes. All times are run-clock times.
 */
export class Fracture {
  private phase: FracturePhase = 'idle';
  private deadline = 0;
  private cooldownRemaining = 0;
  private escapes = 0;
  private clutches = 0;

  public snapshot(now: number): FractureSnapshot {
    if (this.phase === 'idle') return { phase: 'idle', remainingMs: 0, windowMs: FRACTURE.placementWindowMs };
    return {
      phase: this.phase,
      remainingMs: Math.max(0, this.deadline - now),
      windowMs: this.phase === 'warning' ? FRACTURE.warningMs : FRACTURE.placementWindowMs,
    };
  }

  public currentPhase(): FracturePhase {
    return this.phase;
  }

  public escapeCount(): number {
    return this.escapes;
  }

  public clutchCount(): number {
    return this.clutches;
  }

  /** Evaluate after a move resolves. Returns true when the warning phase begins. */
  public evaluate(conditions: FractureConditions, now: number): boolean {
    if (this.phase !== 'idle') return false;
    if (this.cooldownRemaining > 0) { this.cooldownRemaining -= 1; return false; }
    const eligible = conditions.tutorialComplete
      && !conditions.overdriveActive
      && conditions.placements >= FRACTURE.minPlacements
      && conditions.occupancy >= FRACTURE.occupancyThreshold
      && conditions.stallMoves >= FRACTURE.stallMoves
      && conditions.legalOptions > 0
      && conditions.legalOptions <= FRACTURE.maxLegalOptions;
    if (!eligible) return false;
    this.phase = 'warning';
    this.deadline = now + FRACTURE.warningMs;
    return true;
  }

  /** Test/debug hook: arms the warning phase regardless of conditions or cooldown. */
  public forceWarning(now: number): void {
    this.cooldownRemaining = 0;
    this.phase = 'warning';
    this.deadline = now + FRACTURE.warningMs;
  }

  /** Advance the clock. Returns 'active' when warning turns into the timed phase, 'timeout' when the run ends. */
  public update(now: number): 'active' | 'timeout' | null {
    if (this.phase === 'idle') return null;
    if (now < this.deadline) return null;
    if (this.phase === 'warning') {
      this.phase = 'active';
      this.deadline = now + FRACTURE.placementWindowMs;
      return 'active';
    }
    this.phase = 'idle';
    return 'timeout';
  }

  /**
   * A placement or cut happened. `cleared` escapes; otherwise the window resets.
   * Returns whether the escape was a Clutch (cleared with under the threshold remaining in the active phase).
   */
  public onAction(kind: 'place' | 'cut', cleared: boolean, now: number): { escaped: boolean; clutch: boolean } {
    if (this.phase === 'idle') return { escaped: false, clutch: false };
    if (cleared) {
      const clutch = this.phase === 'active' && this.deadline - now <= CLUTCH.thresholdMs && this.deadline - now >= 0;
      this.phase = 'idle';
      this.cooldownRemaining = FRACTURE.cooldownMoves;
      this.escapes += 1;
      if (clutch) this.clutches += 1;
      return { escaped: true, clutch };
    }
    if (this.phase === 'active' && (kind === 'place' || FRACTURE.cutResetsWindow)) this.deadline = now + FRACTURE.placementWindowMs;
    return { escaped: false, clutch: false };
  }

  public reset(): void {
    this.phase = 'idle';
    this.deadline = 0;
    this.cooldownRemaining = 0;
    this.escapes = 0;
    this.clutches = 0;
  }
}
