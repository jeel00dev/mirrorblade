import { MOTION } from '../config/motion';

export type ScreenId = 'boot' | 'home' | 'gameplay' | 'pause' | 'settings' | 'shop' | 'collection' | 'daily' | 'stats' | 'achievements' | 'howto' | 'gameover' | 'about';

export interface ScreenOptions {
  direction?: 'forward' | 'back';
  /** Overlays keep the gameplay screen visible (dimmed, inert) underneath. */
  overlay?: boolean;
  onLeave?: () => void;
  /** Screens that need focus management can name their initial focus target. */
  focus?: string;
}

interface ActiveScreen {
  id: ScreenId;
  element: HTMLElement;
  overlay: boolean;
  onLeave?: () => void;
}

/**
 * Owns the screen stack. The gameplay screen is persistent; every other screen is built on enter and
 * removed after its leave animation. Direction-aware transitions, reduced-motion aware, focus restored.
 */
export class ScreenManager {
  private active: ActiveScreen | null = null;
  private reducedMotion = false;

  public constructor(private readonly host: HTMLElement, private readonly gameplay: HTMLElement) {
    this.gameplay.hidden = true;
  }

  public setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  public current(): ScreenId {
    return this.active?.id ?? 'gameplay';
  }

  public isOverlayOpen(): boolean {
    return Boolean(this.active?.overlay);
  }

  /** Shows the persistent gameplay screen and removes whatever is on top. */
  public showGameplay(direction: 'forward' | 'back' = 'back'): void {
    const previous = this.active;
    this.active = null;
    this.gameplay.hidden = false;
    this.gameplay.classList.remove('is-underlay');
    this.gameplay.removeAttribute('inert');
    this.gameplay.setAttribute('aria-hidden', 'false');
    document.body.dataset.screen = 'gameplay';
    if (previous) this.leave(previous, direction);
    else this.gameplay.classList.add('is-entering');
    window.setTimeout(() => this.gameplay.classList.remove('is-entering'), this.duration());
  }

  public show(id: ScreenId, build: () => HTMLElement, options: ScreenOptions = {}): HTMLElement {
    const direction = options.direction ?? 'forward';
    const previous = this.active;
    const element = build();
    element.classList.add('screen', `screen-${id}`, 'is-entering');
    if (options.overlay) element.classList.add('is-overlay');
    element.dataset.screen = id;
    element.dataset.direction = direction;
    element.setAttribute('role', options.overlay ? 'dialog' : 'region');
    element.setAttribute('aria-modal', options.overlay ? 'true' : 'false');
    this.host.append(element);
    this.active = { id, element, overlay: Boolean(options.overlay), onLeave: options.onLeave };
    document.body.dataset.screen = id;

    if (options.overlay) {
      this.gameplay.hidden = false;
      this.gameplay.classList.add('is-underlay');
      this.gameplay.setAttribute('inert', '');
      this.gameplay.setAttribute('aria-hidden', 'true');
    } else {
      // Full screens hide gameplay after the crossfade so the board never renders behind them.
      window.setTimeout(() => { if (this.active?.id === id) this.gameplay.hidden = true; }, this.duration());
      this.gameplay.setAttribute('inert', '');
      this.gameplay.setAttribute('aria-hidden', 'true');
    }
    if (previous) this.leave(previous, direction);
    window.setTimeout(() => element.classList.remove('is-entering'), this.duration());
    const focusTarget = options.focus ? element.querySelector<HTMLElement>(options.focus) : null;
    (focusTarget ?? element.querySelector<HTMLElement>('button, [tabindex="0"]'))?.focus({ preventScroll: true });
    this.attachScrollFade(element);
    return element;
  }

  /** Scrollable bodies get a bottom fade while more content is below. */
  private attachScrollFade(screen: HTMLElement): void {
    const body = screen.querySelector<HTMLElement>('.screen-body');
    if (!body) return;
    const fade = document.createElement('div');
    fade.className = 'scroll-fade';
    screen.append(fade);
    const update = (): void => {
      const more = body.scrollHeight - body.clientHeight - body.scrollTop > 8;
      fade.classList.toggle('is-visible', more);
    };
    body.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(body);
    requestAnimationFrame(update);
  }

  /** Re-renders the active screen in place (no transition), e.g. after a purchase. */
  public refresh(id: ScreenId, build: () => HTMLElement): void {
    if (this.active?.id !== id) return;
    const next = build();
    next.className = this.active.element.className.replace('is-entering', '').trim();
    next.dataset.screen = id;
    next.setAttribute('role', this.active.element.getAttribute('role') ?? 'region');
    const scroll = this.active.element.querySelector<HTMLElement>('.screen-body')?.scrollTop ?? 0;
    this.active.element.replaceWith(next);
    this.active.element = next;
    const body = next.querySelector<HTMLElement>('.screen-body');
    if (body) body.scrollTop = scroll;
    this.attachScrollFade(next);
  }

  public activeElement(): HTMLElement | null {
    return this.active?.element ?? null;
  }

  private leave(screen: ActiveScreen, direction: 'forward' | 'back'): void {
    screen.onLeave?.();
    screen.element.classList.remove('is-entering');
    screen.element.classList.add('is-leaving');
    screen.element.dataset.direction = direction;
    screen.element.setAttribute('inert', '');
    window.setTimeout(() => screen.element.remove(), this.duration());
  }

  private duration(): number {
    return this.reducedMotion ? MOTION.reducedMotionMs : MOTION.standard + 20;
  }
}
