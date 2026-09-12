import { icon } from './Icons';

export class Toasts {
  private readonly rail: HTMLElement;

  public constructor(host: HTMLElement) {
    this.rail = document.createElement('div');
    this.rail.className = 'toast-rail';
    this.rail.setAttribute('aria-live', 'polite');
    host.append(this.rail);
  }

  public show(title: string, detail: string, iconName = 'info'): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-mark">${icon(iconName)}</span><div><b>${title}</b><small>${detail}</small></div>`;
    this.rail.append(toast);
    while (this.rail.children.length > 3) this.rail.firstElementChild?.remove();
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 260);
    }, 2600);
  }
}
