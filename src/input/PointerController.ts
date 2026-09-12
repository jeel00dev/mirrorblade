import { DRAG_START_THRESHOLD, TRAY_TOUCH_DRAG_HOLD_MS } from '../config/gameplay';

export interface DragPointer {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
}

export interface PointerCallbacks {
  /** A press became a drag. Return false to refuse (e.g. wrong phase). */
  start: (pieceId: string, point: DragPointer, element: HTMLElement) => boolean;
  move: (point: DragPointer) => void;
  end: (point: DragPointer, cancelled: boolean) => void;
  /** A press released without moving: tap-to-rotate. */
  tap: (pieceId: string, element: HTMLElement) => void;
  resize: (point: DragPointer | null) => void;
  /** Pointer capture was revoked mid-drag (browser UI, OS gesture): timed play should pause. */
  interrupted: () => void;
}

/**
 * One Pointer Events path for mouse, touch and stylus. A press on a tray piece is a tap until it travels
 * DRAG_START_THRESHOLD px, then it becomes a drag with capture. Keyboard Enter/Space also taps.
 */
export class PointerController {
  private activePointerId: number | null = null;
  private pressed: { pieceId: string; element: HTMLElement; origin: DragPointer; startedAt: number; tray: HTMLElement | null; scrollTop: number } | null = null;
  private dragging = false;
  private scrolling = false;
  private lastPoint: DragPointer | null = null;

  public constructor(private readonly surface: HTMLElement, private readonly callbacks: PointerCallbacks) {
    surface.addEventListener('pointerdown', this.onPointerDown);
    surface.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('blur', this.onBlur);
  }

  public isDragging(): boolean {
    return this.dragging;
  }

  public cancel(): void {
    if (this.dragging && this.lastPoint) this.callbacks.end(this.lastPoint, true);
    this.release();
  }

  public dispose(): void {
    this.cancel();
    this.surface.removeEventListener('pointerdown', this.onPointerDown);
    this.surface.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('blur', this.onBlur);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-piece-id]') : null;
    const pieceId = element?.dataset.pieceId;
    if (!element || !pieceId) return;
    event.preventDefault();
    const point = this.toPoint(event);
    this.activePointerId = event.pointerId;
    const tray = element.closest<HTMLElement>('.tray');
    this.pressed = { pieceId, element, origin: point, startedAt: performance.now(), tray, scrollTop: tray?.scrollTop ?? 0 };
    this.lastPoint = point;
    this.dragging = false;
    try { element.setPointerCapture(event.pointerId); } catch { /* detached elements can reject capture */ }
    element.addEventListener('lostpointercapture', this.onLostCapture, { once: true });
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId || !this.pressed) return;
    const point = this.toPoint(event);
    this.lastPoint = point;
    if (!this.dragging) {
      if (this.scrolling) {
        const deltaY = point.clientY - this.pressed.origin.clientY;
        this.pressed.tray!.scrollTop = this.pressed.scrollTop - deltaY;
        event.preventDefault();
        return;
      }
      const distance = Math.hypot(point.clientX - this.pressed.origin.clientX, point.clientY - this.pressed.origin.clientY);
      if (distance < DRAG_START_THRESHOLD) return;
      const deltaX = point.clientX - this.pressed.origin.clientX;
      const deltaY = point.clientY - this.pressed.origin.clientY;
      const tray = this.pressed.tray;
      const canScroll = tray && tray.scrollHeight > tray.clientHeight + 1;
      const scrollTarget = tray ? Math.max(0, Math.min(tray.scrollHeight - tray.clientHeight, this.pressed.scrollTop - deltaY)) : 0;
      const quickVerticalTouch = point.pointerType === 'touch'
        && canScroll
        && Math.abs(deltaY) > Math.abs(deltaX) * 1.15
        && performance.now() - this.pressed.startedAt < TRAY_TOUCH_DRAG_HOLD_MS
        && Math.abs(scrollTarget - this.pressed.scrollTop) > 0.5;
      if (quickVerticalTouch) {
        this.scrolling = true;
        tray.scrollTop = scrollTarget;
        event.preventDefault();
        return;
      }
      // A refused start (board still resolving the previous move) keeps the press alive and retries on the next move,
      // so quick players never lose a grab.
      if (!this.callbacks.start(this.pressed.pieceId, this.pressed.origin, this.pressed.element)) return;
      this.dragging = true;
    }
    event.preventDefault();
    this.callbacks.move(point);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId || !this.pressed) return;
    const point = this.toPoint(event);
    if (this.dragging) this.callbacks.end(point, false);
    else if (this.scrolling) { /* scroll gesture, never rotate */ }
    else this.callbacks.tap(this.pressed.pieceId, this.pressed.element);
    this.release();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    if (this.dragging) this.callbacks.end(this.toPoint(event), true);
    this.release();
  };

  private readonly onLostCapture = (): void => {
    // Window-level listeners keep the transaction alive; timed play still pauses until the pointer settles.
    if (this.dragging) this.callbacks.interrupted();
  };

  private readonly onBlur = (): void => {
    if (this.dragging && this.lastPoint) this.callbacks.end(this.lastPoint, true);
    this.release();
  };

  private readonly onResize = (): void => {
    this.callbacks.resize(this.dragging ? this.lastPoint : null);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-piece-id]') : null;
    const pieceId = element?.dataset.pieceId;
    if (!element || !pieceId) return;
    event.preventDefault();
    this.callbacks.tap(pieceId, element);
  };

  private release(): void {
    if (this.pressed && this.activePointerId !== null) {
      this.pressed.element.removeEventListener('lostpointercapture', this.onLostCapture);
      try { this.pressed.element.releasePointerCapture(this.activePointerId); } catch { /* already released */ }
    }
    this.activePointerId = null;
    this.pressed = null;
    this.dragging = false;
    this.scrolling = false;
    this.lastPoint = null;
  }

  private toPoint(event: PointerEvent): DragPointer {
    return { pointerId: event.pointerId, pointerType: event.pointerType, clientX: event.clientX, clientY: event.clientY };
  }
}
