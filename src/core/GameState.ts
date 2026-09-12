/**
 * Interaction phase of the current run. Navigation (which screen is showing) is tracked separately by the
 * ScreenManager, so opening a menu can never corrupt a placement transaction.
 *
 * CINEMATIC is the game-over sequence: the run is already decided and committed, nothing on the board is
 * interactive, and the only input that does anything is a skip.
 */
export type RunPhase = 'IDLE' | 'PLAYING' | 'DRAGGING' | 'CUTTING' | 'RESOLVING' | 'CINEMATIC' | 'OVER';

const TRANSITIONS: Record<RunPhase, readonly RunPhase[]> = {
  IDLE: ['PLAYING'],
  PLAYING: ['DRAGGING', 'RESOLVING', 'CINEMATIC', 'OVER', 'PLAYING'],
  DRAGGING: ['PLAYING', 'CUTTING', 'RESOLVING', 'CINEMATIC'],
  CUTTING: ['PLAYING', 'CINEMATIC', 'OVER'],
  RESOLVING: ['PLAYING', 'CINEMATIC', 'OVER'],
  CINEMATIC: ['OVER'],
  OVER: ['PLAYING', 'IDLE'],
};

export class RunPhaseMachine {
  private phase: RunPhase = 'IDLE';

  public current(): RunPhase {
    return this.phase;
  }

  public is(...phases: RunPhase[]): boolean {
    return phases.includes(this.phase);
  }

  public transition(next: RunPhase): void {
    if (next === this.phase) return;
    if (!TRANSITIONS[this.phase].includes(next)) throw new Error(`Invalid run phase transition ${this.phase} -> ${next}`);
    this.phase = next;
  }

  /** True while a board transaction is still animating and navigation must wait. */
  public isBusy(): boolean {
    return this.phase === 'RESOLVING' || this.phase === 'CUTTING' || this.phase === 'DRAGGING';
  }

  /** True while the game-over cinematic owns the screen: input is a skip at most, navigation is refused. */
  public isCinematic(): boolean {
    return this.phase === 'CINEMATIC';
  }
}
