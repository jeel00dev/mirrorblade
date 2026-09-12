import { COSMETICS, DEFAULT_EQUIPPED, type CosmeticCategory, type CosmeticDefinition } from '../config/cosmetics';
import type { SaveData } from './SaveData';

export class Inventory {
  public constructor(private readonly save: SaveData) {}

  public owns(id: string): boolean {
    return this.save.ownedCosmetics.includes(id);
  }

  public purchase(id: string): { ok: boolean; reason?: 'unknown' | 'owned' | 'funds' } {
    const item = COSMETICS.find((cosmetic) => cosmetic.id === id);
    if (!item) return { ok: false, reason: 'unknown' };
    if (this.owns(id)) return { ok: false, reason: 'owned' };
    if (this.save.currency < item.cost) return { ok: false, reason: 'funds' };
    this.save.currency -= item.cost;
    this.save.ownedCosmetics.push(item.id);
    return { ok: true };
  }

  public equip(id: string): boolean {
    const item = COSMETICS.find((cosmetic) => cosmetic.id === id);
    if (!item || !this.owns(id)) return false;
    this.save.equipped[item.category] = item.id;
    return true;
  }

  /** "Unequip" returns the category to its default finish; there is always something equipped. */
  public resetCategory(category: CosmeticCategory): void {
    this.save.equipped[category] = DEFAULT_EQUIPPED[category];
  }

  public equipped(category: CosmeticCategory): CosmeticDefinition {
    const id = this.save.equipped[category];
    return COSMETICS.find((item) => item.id === id && item.category === category)
      ?? COSMETICS.find((item) => item.category === category && item.cost === 0)!;
  }

  public ownedIn(category: CosmeticCategory): CosmeticDefinition[] {
    return COSMETICS.filter((item) => item.category === category && this.owns(item.id));
  }
}
