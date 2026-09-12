import type { CosmeticCategory } from '../../config/cosmetics';
import type { Inventory } from '../../progression/Inventory';
import type { SaveData } from '../../progression/SaveData';

export interface ScreenContext {
  readonly save: SaveData;
  readonly inventory: Inventory;
  readonly activeRun: boolean;
  readonly runScore: number;
  readonly shop: { category: CosmeticCategory; selected: string | null; revealing: string | null };
  readonly dailyView: { year: number; month: number; selected: string };
  readonly today: string;
}

export function element(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}
