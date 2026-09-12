/**
 * One active-time clock for a run. It advances only while every gate is open (visible tab, gameplay screen,
 * no ad, pointer intact, not resizing). Timed systems read `now()` so a hidden tab, a menu or a frame stall
 * never costs the player reaction time.
 */
export class RunClock {
  private accumulated = 0;
  private segmentStart: number | null = null;
  private readonly closedGates = new Set<string>();

  public constructor(private readonly source: () => number = () => performance.now()) {}

  public reset(): void {
    this.accumulated = 0;
    this.segmentStart = this.closedGates.size === 0 ? this.source() : null;
  }

  public gate(name: string, open: boolean): void {
    if (open) this.closedGates.delete(name);
    else this.closedGates.add(name);
    const shouldRun = this.closedGates.size === 0;
    if (shouldRun && this.segmentStart === null) this.segmentStart = this.source();
    else if (!shouldRun && this.segmentStart !== null) {
      this.accumulated += this.source() - this.segmentStart;
      this.segmentStart = null;
    }
  }

  public isRunning(): boolean {
    return this.segmentStart !== null;
  }

  /** Active milliseconds since reset. */
  public now(): number {
    return this.accumulated + (this.segmentStart === null ? 0 : this.source() - this.segmentStart);
  }

  public closedGateNames(): string[] {
    return [...this.closedGates];
  }
}
