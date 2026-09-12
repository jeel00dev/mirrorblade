export class ComboSystem {
  private chain = 0;

  public resolveMove(clearedLineCount: number): number {
    this.chain = clearedLineCount > 0 ? this.chain + 1 : 0;
    return this.chain;
  }

  public current(): number {
    return this.chain;
  }

  public reset(): void {
    this.chain = 0;
  }
}
