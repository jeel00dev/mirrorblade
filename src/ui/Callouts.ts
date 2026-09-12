export type CalloutTier = 'double' | 'triple' | 'max' | 'perfect' | 'clutch' | 'forge' | 'hint';

/**
 * One headline at a time over the board. The word is revealed outward from the mirror axis in a metal-sheen
 * face with a short glass reflection beneath it; intensity scales with the tier. Strong feedback resolves
 * within ~500–900 ms and never sits in a box.
 */
export class Callouts {
  private current: HTMLElement | null = null;

  public constructor(private readonly host: HTMLElement) {}

  public show(text: string, tier: CalloutTier, sub = ''): void {
    this.current?.remove();
    const element = document.createElement('div');
    element.className = `callout tier-${tier}`;
    element.setAttribute('role', 'status');
    const letters = text.split('').map((char, index) => `<i style="--i:${index}">${char === ' ' ? '&nbsp;' : char}</i>`).join('');
    element.innerHTML = `<span class="axis-line" aria-hidden="true"></span><span class="word" aria-label="${text}">${letters}</span><span class="reflection" aria-hidden="true">${text}</span>${sub ? `<small>${sub}</small>` : ''}`;
    this.host.append(element);
    this.current = element;
    element.addEventListener('animationend', (event) => {
      if (event.target !== element) return;
      element.remove();
      if (this.current === element) this.current = null;
    });
    window.setTimeout(() => { if (element.isConnected) element.remove(); }, 2600);
  }

  public clear(): void {
    this.current?.remove();
    this.current = null;
  }
}
