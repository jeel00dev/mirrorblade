export type CosmeticCategory = 'blocks' | 'boards' | 'blades' | 'trails' | 'effects' | 'sounds';
export type CosmeticStyle = 'essential' | 'refined' | 'signature';
export type EffectStyle = 'shatter' | 'sweep' | 'dissolve' | 'dust' | 'ripple';
export type TrailStyle = 'glow' | 'prism' | 'snow' | 'ember' | 'minimal';
export type SoundTheme = 'studio' | 'crystal' | 'machine';

export interface CosmeticDefinition {
  id: string;
  category: CosmeticCategory;
  name: string;
  cost: number;
  style: CosmeticStyle;
  description: string;
  /**
   * blocks: [cyan, coral, amber, violet] face colours
   * boards: [frame, cell face, cell gap, axis glass]
   * blades: [steel, fittings (tsuba / fuchi / kashira), tsuka wrap, accent (menuki + edge light)]
   * effects / trails: particle colours
   * sounds: swatch colours only
   */
  colors: readonly string[];
  effect?: EffectStyle;
  trail?: TrailStyle;
  sound?: SoundTheme;
}

export const COSMETICS: readonly CosmeticDefinition[] = [
  // Block sets — the default set is sampled from the reference material.
  { id: 'classic-spectrum', category: 'blocks', name: 'Classic Spectrum', cost: 0, style: 'essential', description: 'Polished resin in the four signature mirror tones.', colors: ['#43c2c7', '#ea7d78', '#ecb455', '#8e60d8'] },
  { id: 'frosted-glass', category: 'blocks', name: 'Frosted Glass', cost: 160, style: 'refined', description: 'Cool translucent glass with soft highlights.', colors: ['#8fdbe6', '#d8a0c8', '#e7d9a8', '#9fa8e8'] },
  { id: 'obsidian-blocks', category: 'blocks', name: 'Obsidian', cost: 240, style: 'signature', description: 'Dense volcanic glass with mineral edges.', colors: ['#3f8f9a', '#a04f5a', '#a88a3e', '#5f4e9c'] },
  { id: 'porcelain', category: 'blocks', name: 'Porcelain', cost: 190, style: 'refined', description: 'Warm ceramic blocks with restrained colour.', colors: ['#7fc2c0', '#d99789', '#dcc08a', '#a79bd0'] },
  { id: 'arcade-resin', category: 'blocks', name: 'Arcade Resin', cost: 220, style: 'signature', description: 'Saturated resin inspired by precision arcades.', colors: ['#2ee0d2', '#ff5e7e', '#ffcf3f', '#a55dff'] },
  { id: 'aurora-crystal', category: 'blocks', name: 'Aurora Crystal', cost: 320, style: 'signature', description: 'A northern-spectrum crystalline finish.', colors: ['#5fe3c4', '#6f9dff', '#d98cff', '#ffb27a'] },

  // Board themes
  { id: 'midnight', category: 'boards', name: 'Midnight', cost: 0, style: 'essential', description: 'The original obsidian chamber.', colors: ['#181b20', '#24282f', '#0f1216', '#353940'] },
  { id: 'lunar-steel', category: 'boards', name: 'Lunar Steel', cost: 180, style: 'refined', description: 'Cold machined steel under moonlight.', colors: ['#1a1f26', '#2b323b', '#12161b', '#46505b'] },
  { id: 'frozen-glass', category: 'boards', name: 'Frozen Glass', cost: 240, style: 'signature', description: 'Deep navy glass and glacial reflections.', colors: ['#141c2a', '#1f2a3d', '#0c1119', '#3a5a72'] },
  { id: 'ember-ceramic', category: 'boards', name: 'Ember Ceramic', cost: 260, style: 'signature', description: 'Smoked ceramic with a quiet warm edge.', colors: ['#1f1719', '#2e2226', '#130d0f', '#4d3a3c'] },
  { id: 'deep-space', category: 'boards', name: 'Deep Space', cost: 300, style: 'signature', description: 'Black-violet space glass with distant light.', colors: ['#16141f', '#221e30', '#0d0b13', '#3e3760'] },

  // Blades
  { id: 'surgical-chrome', category: 'blades', name: 'Surgical Chrome', cost: 0, style: 'essential', description: 'Polished steel, dark iron fittings, charcoal wrap. The signature katana.', colors: ['#e6eaeb', '#2b2f36', '#1e2024', '#43c2c7'] },
  { id: 'black-titanium', category: 'blades', name: 'Black Titanium', cost: 170, style: 'refined', description: 'Dark aerospace steel with black fittings and a pale edge light.', colors: ['#8d949b', '#15181c', '#101215', '#d9e0e4'] },
  { id: 'frost-blade', category: 'blades', name: 'Frost Blade', cost: 220, style: 'refined', description: 'Pale ice steel, slate fittings, a cold inner light.', colors: ['#eafbff', '#3f6d80', '#17242b', '#9dd3e6'] },
  { id: 'prism-edge', category: 'blades', name: 'Prism Edge', cost: 260, style: 'signature', description: 'Lilac steel with indigo fittings and a spectral menuki.', colors: ['#e9e4ff', '#3b2f7a', '#1b1633', '#7ef3e4'] },
  { id: 'golden-edge', category: 'blades', name: 'Golden Edge', cost: 360, style: 'signature', description: 'Pale gold steel, bronze fittings, an amber menuki.', colors: ['#f2e2b0', '#6e4f1a', '#2a2010', '#ffd166'] },

  // Clear effects
  { id: 'glass-shatter', category: 'effects', name: 'Glass Shatter', cost: 0, style: 'essential', description: 'Clean crystalline fracture.', colors: ['#dffaff', '#ffffff'], effect: 'shatter' },
  { id: 'light-sweep', category: 'effects', name: 'Light Sweep', cost: 140, style: 'refined', description: 'A restrained band of reflected light.', colors: ['#ffffff', '#8ff0ee'], effect: 'sweep' },
  { id: 'pixel-dissolve', category: 'effects', name: 'Pixel Dissolve', cost: 180, style: 'refined', description: 'Cells resolve into sharp square motes.', colors: ['#c9e6ff', '#7f9bc4'], effect: 'dissolve' },
  { id: 'crystal-dust', category: 'effects', name: 'Crystal Dust', cost: 230, style: 'signature', description: 'A fine wake of glasslike particles.', colors: ['#f3ffff', '#c3b4ff'], effect: 'dust' },
  { id: 'mirror-ripple', category: 'effects', name: 'Mirror Ripple', cost: 290, style: 'signature', description: 'The centre glass answers every clear.', colors: ['#9ef9f2', '#ffffff'], effect: 'ripple' },

  // Trails
  { id: 'soft-glow', category: 'trails', name: 'Soft Glow', cost: 0, style: 'essential', description: 'A low-intensity placement wake.', colors: ['#cffcfb'], trail: 'glow' },
  { id: 'minimal-trail', category: 'trails', name: 'Minimal', cost: 90, style: 'essential', description: 'Barely-there precision.', colors: ['#e2e8ea'], trail: 'minimal' },
  { id: 'snow-dust', category: 'trails', name: 'Snow Dust', cost: 150, style: 'refined', description: 'Cool powdery fragments.', colors: ['#f0fbff', '#b6e2ee'], trail: 'snow' },
  { id: 'prism-ghost', category: 'trails', name: 'Prism Ghost', cost: 170, style: 'refined', description: 'A faint spectrum behind lifted pieces.', colors: ['#7ef5ef', '#bb92ff'], trail: 'prism' },
  { id: 'ember-trail', category: 'trails', name: 'Ember', cost: 190, style: 'refined', description: 'Warm sparks kept deliberately subtle.', colors: ['#ffb46a', '#ff7a6b'], trail: 'ember' },

  // Sound themes
  { id: 'studio-sound', category: 'sounds', name: 'Studio', cost: 0, style: 'essential', description: 'Warm, precise signature sound set.', colors: ['#7be4e0', '#2c5660'], sound: 'studio' },
  { id: 'crystal-sound', category: 'sounds', name: 'Crystal Chamber', cost: 220, style: 'signature', description: 'Airier strikes with longer glass resonance.', colors: ['#d6fbff', '#9caaff'], sound: 'crystal' },
  { id: 'machine-sound', category: 'sounds', name: 'Machine Room', cost: 200, style: 'refined', description: 'Heavier metallic impacts and a deeper pulse.', colors: ['#c9ccd1', '#5a6068'], sound: 'machine' },
];

export const DEFAULT_EQUIPPED: Record<CosmeticCategory, string> = {
  blocks: 'classic-spectrum',
  boards: 'midnight',
  blades: 'surgical-chrome',
  effects: 'glass-shatter',
  trails: 'soft-glow',
  sounds: 'studio-sound',
};

export const COSMETIC_CATEGORIES: readonly { id: CosmeticCategory; label: string; short: string }[] = [
  { id: 'blocks', label: 'Block Sets', short: 'Blocks' },
  { id: 'boards', label: 'Board Themes', short: 'Boards' },
  { id: 'blades', label: 'Blades', short: 'Blades' },
  { id: 'trails', label: 'Trails', short: 'Trails' },
  { id: 'effects', label: 'Clear Effects', short: 'Effects' },
  { id: 'sounds', label: 'Sound Themes', short: 'Sound' },
];

export function cosmeticById(id: string): CosmeticDefinition | undefined {
  return COSMETICS.find((item) => item.id === id);
}

/** Colour-accessible block palette: blue / orange / yellow / purple, each also carrying a unique emboss symbol in CSS. */
export const ACCESSIBLE_BLOCK_COLORS: readonly string[] = ['#4aa8ff', '#ff9440', '#f2dc55', '#c07cff'];
