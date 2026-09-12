import { describe, expect, it } from 'vitest';
import { decodeSave, encodeSave } from '../src/progression/SaveCodec';
import { createDefaultSave, SAVE_VERSION } from '../src/progression/SaveData';
import { Inventory } from '../src/progression/Inventory';
import { AchievementSystem } from '../src/progression/AchievementSystem';

describe('save codec', () => {
  it('serializes and deserializes progression', () => {
    const save = createDefaultSave();
    save.currency = 123;
    save.stats.bestScore = 4567;
    save.stats.clutches = 3;
    save.ownedCosmetics.push('frosted-glass');
    save.hints.overdrive = true;
    const decoded = decodeSave(encodeSave(save));
    expect(decoded.currency).toBe(123);
    expect(decoded.stats.bestScore).toBe(4567);
    expect(decoded.stats.clutches).toBe(3);
    expect(decoded.ownedCosmetics).toContain('frosted-glass');
    expect(decoded.hints.overdrive).toBe(true);
    expect(decoded.version).toBe(SAVE_VERSION);
  });

  it('recovers defaults from corrupt input', () => {
    expect(decodeSave('{bad json')).toEqual(createDefaultSave());
    expect(decodeSave('[]')).toEqual(createDefaultSave());
  });

  it('clamps values and removes unknown inventory ids', () => {
    const decoded = decodeSave(JSON.stringify({
      version: 2,
      currency: -500,
      ownedCosmetics: ['stolen-unknown'],
      settings: { soundVolume: 7, musicVolume: -4, quality: 'impossible', masterVolume: 'loud' },
      stats: { bestScore: -1, clutches: 2.7 },
    }));
    expect(decoded.currency).toBe(0);
    expect(decoded.settings.soundVolume).toBe(1);
    expect(decoded.settings.musicVolume).toBe(0);
    expect(decoded.settings.masterVolume).toBe(createDefaultSave().settings.masterVolume);
    expect(decoded.settings.quality).toBe('auto');
    expect(decoded.stats.clutches).toBe(2);
    expect(decoded.ownedCosmetics).not.toContain('stolen-unknown');
  });

  it('migrates a V1 save: keeps currency, inventory and equipment, renames achievements, archives the old best', () => {
    const v1 = {
      version: 1,
      currency: 410,
      ownedCosmetics: ['classic-spectrum', 'frosted-glass', 'black-titanium'],
      equipped: { blocks: 'frosted-glass', blades: 'black-titanium' },
      settings: { soundVolume: 0.5, haptics: false },
      onboardingComplete: true,
      achievements: ['first-reflection', 'surgeon', 'chain-reaction'],
      stats: { bestScore: 3200, totalRuns: 9, piecesCut: 4 },
      daily: { streak: 3, bestDailyScore: 800 },
    };
    const decoded = decodeSave(JSON.stringify(v1));
    expect(decoded.version).toBe(SAVE_VERSION);
    expect(decoded.currency).toBe(410);
    expect(decoded.ownedCosmetics).toEqual(expect.arrayContaining(['frosted-glass', 'black-titanium']));
    expect(decoded.equipped.blocks).toBe('frosted-glass');
    expect(decoded.equipped.blades).toBe('black-titanium');
    expect(decoded.equipped.boards).toBe('midnight');
    expect(decoded.settings.soundVolume).toBe(0.5);
    expect(decoded.settings.haptics).toBe(false);
    expect(decoded.settings.screenShake).toBe(true);
    expect(decoded.onboardingComplete).toBe(true);
    expect(decoded.achievements).toEqual(['first-reflection', 'first-cut', 'chain-master']);
    expect(decoded.stats.legacyBestScore).toBe(3200);
    expect(decoded.stats.bestScore).toBe(0);
    expect(decoded.stats.totalRuns).toBe(9);
    expect(decoded.stats.piecesCut).toBe(4);
    expect(decoded.stats.bladesForged).toBe(0);
    expect(decoded.daily.streak).toBe(3);
    expect(decoded.daily.bestDailyScore).toBe(0);
  });

  it('persists cosmetic purchases, equipped choices and category reset', () => {
    const save = createDefaultSave();
    save.currency = 500;
    const inventory = new Inventory(save);
    expect(inventory.purchase('frosted-glass').ok).toBe(true);
    expect(inventory.purchase('frosted-glass')).toEqual({ ok: false, reason: 'owned' });
    expect(inventory.purchase('golden-edge')).toEqual({ ok: false, reason: 'funds' });
    expect(inventory.equip('frosted-glass')).toBe(true);
    expect(inventory.equip('golden-edge')).toBe(false);
    const restored = decodeSave(encodeSave(save));
    expect(restored.ownedCosmetics).toContain('frosted-glass');
    expect(restored.equipped.blocks).toBe('frosted-glass');
    expect(restored.currency).toBe(340);
    inventory.resetCategory('blocks');
    expect(save.equipped.blocks).toBe('classic-spectrum');
  });

  it('unlocks V2 achievements once and pays their reward', () => {
    const save = createDefaultSave();
    const achievements = new AchievementSystem(save);
    expect(achievements.evaluate({ type: 'blade-forged' }).map((a) => a.id)).toEqual(['surgeon']);
    expect(achievements.evaluate({ type: 'blade-forged' })).toHaveLength(0);
    expect(achievements.evaluate({ type: 'clutch' }).map((a) => a.id)).toEqual(['last-second']);
    expect(achievements.evaluate({ type: 'clear', rows: [1].length, columns: 2, mirroredPair: true, chain: 5, lineCount: 3, perfectMirror: false, perfectClear: false }).map((a) => a.id))
      .toEqual(['reflection', 'double-vision', 'chain-master']);
    expect(achievements.evaluate({ type: 'fracture-escape', lifetimeEscapes: 4 })).toHaveLength(0);
    expect(achievements.evaluate({ type: 'fracture-escape', lifetimeEscapes: 5 }).map((a) => a.id)).toEqual(['escape-artist']);
    expect(save.currency).toBeGreaterThan(0);
  });
});
