import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { KATANA_DESIGNS, hamonAt } from '../src/config/katanas';
import { COSMETICS } from '../src/config/cosmetics';
import { buildKatana, disposeKatana, type KatanaMaterials } from '../src/render/KatanaModel';
import { sampleKatanaMotion } from '../src/render/KatanaMotion';
import { decodeSave, encodeSave } from '../src/progression/SaveCodec';

describe('katana collection', () => {
  it('preserves all five existing purchases and equipment without a save migration', () => {
    const ids = ['surgical-chrome', 'black-titanium', 'frost-blade', 'prism-edge', 'golden-edge'];
    const items = COSMETICS.filter((item) => item.category === 'blades');
    expect(items.map((item) => item.id)).toEqual(ids);
    expect(items.map((item) => item.cost)).toEqual([0, 170, 220, 260, 360]);
    for (const id of ids) {
      const save = decodeSave(JSON.stringify({ version: 2, currency: 123, ownedCosmetics: ids, equipped: { blades: id } }));
      const restored = decodeSave(encodeSave(save));
      expect(restored.equipped.blades).toBe(id);
      expect(restored.currency).toBe(123);
      expect(restored.ownedCosmetics).toEqual(expect.arrayContaining(ids));
    }
  });

  for (const design of KATANA_DESIGNS) {
    it(`${design.name}: builds finite detailed geometry within the 15k triangle / 8 material budget`, () => {
      const materials: KatanaMaterials = {
        steel: new THREE.MeshPhysicalMaterial(), fittings: new THREE.MeshStandardMaterial(),
        habaki: new THREE.MeshStandardMaterial(), wrap: new THREE.MeshStandardMaterial(),
        same: new THREE.MeshStandardMaterial(), inlay: new THREE.MeshStandardMaterial(),
        accent: new THREE.MeshStandardMaterial(), edge: new THREE.MeshBasicMaterial(),
      };
      const { group, triangles } = buildKatana(materials, design);
      expect(triangles).toBeLessThan(15000);
      expect(group.children.length).toBeLessThanOrEqual(8);
      const bounds = new THREE.Box3().setFromObject(group);
      expect(bounds.max.y - bounds.min.y).toBeGreaterThan(5);
      expect(bounds.max.y - bounds.min.y).toBeLessThan(5.4);
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          for (const attribute of Object.values(object.geometry.attributes)) {
            expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
          }
        }
      });
      for (let i = 0; i <= 100; i++) {
        const h = hamonAt(design, i / 100);
        expect(h).toBeGreaterThan(0.1);
        expect(h).toBeLessThan(0.6);
      }
      disposeKatana(group, materials);
    });

    it(`${design.name}: animates, settles, stays entirely still, and starts the same loop again`, () => {
      const middle = sampleKatanaMotion(design, design.duration * 0.4);
      expect(middle.phase).toBe('flourish');
      expect(middle.strength).toBeGreaterThan(0.5);
      const hold = sampleKatanaMotion(design, design.duration + 0.2);
      expect(hold.phase).toBe('hold');
      expect(hold.strength).toBe(0);
      expect(sampleKatanaMotion(design, design.duration + design.hold - 0.01)).toEqual(hold);
      const next = sampleKatanaMotion(design, design.duration + design.hold + design.duration * 0.4);
      expect(next.yaw).toBeCloseTo(middle.yaw);
      expect(next.strength).toBeCloseTo(middle.strength);
      expect(sampleKatanaMotion(design, design.duration * 0.4, true)).toEqual(hold);
    });
  }
});
