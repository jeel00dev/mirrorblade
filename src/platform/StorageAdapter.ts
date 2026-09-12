import { SAVE_DEBOUNCE_MS } from '../config/gameplay';
import { decodeSave, encodeSave } from '../progression/SaveCodec';
import type { SaveData } from '../progression/SaveData';

export const SAVE_KEY = 'mirrorblade.save';
/** V1 stored under a versioned key; it is read once and migrated by the codec. */
export const LEGACY_SAVE_KEY = 'mirrorblade.save.v1';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class StorageAdapter {
  private timeout: number | null = null;
  private pending: SaveData | null = null;

  public constructor(private readonly backend: StorageBackend) {}

  /** True when nothing has ever been saved (used to seed settings from OS preferences once). */
  public hasSave(): boolean {
    try { return Boolean(this.backend.getItem(SAVE_KEY) ?? this.backend.getItem(LEGACY_SAVE_KEY)); } catch { return false; }
  }

  public load(): SaveData {
    try {
      const current = this.backend.getItem(SAVE_KEY);
      if (current) return decodeSave(current);
      return decodeSave(this.backend.getItem(LEGACY_SAVE_KEY));
    } catch {
      return decodeSave(null);
    }
  }

  public save(save: SaveData): void {
    this.pending = save;
    if (this.timeout !== null) window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  }

  public flush(): void {
    if (!this.pending) return;
    try { this.backend.setItem(SAVE_KEY, encodeSave(this.pending)); } catch { /* storage can be unavailable */ }
    this.pending = null;
    if (this.timeout !== null) window.clearTimeout(this.timeout);
    this.timeout = null;
  }
}

export function localStorageBackend(): StorageBackend {
  return {
    getItem: (key) => { try { return window.localStorage.getItem(key); } catch { return null; } },
    setItem: (key, value) => { window.localStorage.setItem(key, value); },
  };
}
