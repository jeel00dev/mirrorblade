import { COSMETICS, COSMETIC_CATEGORIES, DEFAULT_EQUIPPED, type CosmeticCategory, type CosmeticDefinition } from '../../config/cosmetics';
import { BoardView } from '../../render/BoardView';
import { pieceMarkup } from '../../render/blocks';
import { EffectsLayer } from '../../render/EffectsLayer';
import type { BladeScene } from '../../render/BladeScene';
import { button, screenHead, shardsPill } from '../components';
import { icon } from '../Icons';
import { element, type ScreenContext } from './context';
import { katanaArtwork } from '../katanaArtwork';

const CATEGORY_ICON: Record<CosmeticCategory, string> = { blocks: 'blocks', boards: 'board', blades: 'blade', trails: 'trail', effects: 'effect', sounds: 'music' };

export interface PreviewHandle {
  play?: () => void;
  dispose: () => void;
}

export function buildCatalogScreen(ctx: ScreenContext, mode: 'shop' | 'collection'): HTMLElement {
  const { category, selected } = ctx.shop;
  const items = COSMETICS.filter((item) => item.category === category && (mode === 'shop' || ctx.inventory.owns(item.id)));
  const current = items.find((item) => item.id === selected) ?? items.find((item) => ctx.save.equipped[category] === item.id) ?? items[0] ?? null;
  const loadout = mode === 'collection'
    ? `<div class="loadout" aria-label="Equipped loadout">${COSMETIC_CATEGORIES.map((entry) => {
      const equipped = ctx.inventory.equipped(entry.id);
      return `<button type="button" data-action="catalog-category" data-value="${entry.id}" aria-pressed="${entry.id === category}"><span>${entry.short}</span><b>${equipped.name}</b></button>`;
    }).join('')}</div>`
    : '';
  const nav = mode === 'shop'
    ? `<div class="category-nav" role="tablist" aria-label="Categories">${COSMETIC_CATEGORIES.map((entry) =>
      `<button type="button" role="tab" aria-selected="${entry.id === category}" data-action="catalog-category" data-value="${entry.id}">${icon(CATEGORY_ICON[entry.id])}${entry.label}</button>`).join('')}</div>`
    : '';
  const strip = items.length === 0
    ? `<div class="empty-state">${icon('collection')}<b>Nothing owned in this category yet.</b>${button('Browse the shop', 'shop', { variant: 'quiet', small: true })}</div>`
    : `<div class="item-strip${category === 'blades' ? ' katana-strip' : ''}" role="listbox" aria-label="${mode === 'shop' ? 'Items for sale' : 'Owned items'}">${items.map((item) => itemCard(ctx, item, current?.id === item.id)).join('')}</div>`;
  return element(`
    <section aria-label="${mode === 'shop' ? 'Shop' : 'Collection'}">
      ${screenHead(mode === 'shop' ? 'Shop' : 'Collection', 'home', shardsPill(ctx.save.currency, 'catalog-shards'))}
      <div class="screen-body">
        <div class="catalog${category === 'blades' ? ' katana-catalog' : ''}">
          ${nav}${loadout}
          ${current ? previewCard(ctx, current, mode) : '<div></div>'}
          ${strip}
        </div>
      </div>
    </section>`);
}

function itemCard(ctx: ScreenContext, item: CosmeticDefinition, selected: boolean): string {
  const owned = ctx.inventory.owns(item.id);
  const equipped = ctx.save.equipped[item.category] === item.id;
  const locked = !owned && ctx.save.currency < item.cost;
  const state = equipped ? `<span class="item-state is-equipped" title="Equipped">${icon('equipped')}</span>`
    : owned ? `<span class="item-state is-owned" title="Owned">${icon('owned')}</span>`
      : locked ? `<span class="item-state is-locked" title="Not enough shards yet">${icon('lock')}</span>` : '';
  const vars = item.colors.map((color, index) => `--c${index + 1}:${color}`).join(';');
  return `<button type="button" class="item-card${locked ? ' is-locked' : ''}${item.katana ? ' katana-item' : ''}" role="option" aria-selected="${selected}" aria-pressed="${selected}" data-action="catalog-select" data-value="${item.id}" style="${vars}">
    ${item.katana ? `<span class="katana-tier"><b>0${item.katana.tier}</b>${item.katana.rank}</span>` : ''}
    <span class="swatch">${swatch(item)}</span>${state}
    <span class="item-name">${item.name}</span>
    <span class="item-price">${owned ? (equipped ? 'Equipped' : 'Owned') : `${item.cost} shards`}</span>
  </button>`;
}

function swatch(item: CosmeticDefinition): string {
  switch (item.category) {
    case 'blocks': {
      const [cyan = '#43c2c7', coral = '#ea7d78', amber = '#ecb455', violet = '#8e60d8'] = item.colors;
      return `<span class="swatch-blocks" style="--cell:18px;--block-cyan:${cyan};--block-coral:${coral};--block-amber:${amber};--block-violet:${violet}">${(['cyan', 'coral', 'amber', 'violet'] as const).map((tone) => `<span class="pc"><i class="blk tone-${tone}"></i></span>`).join('')}</span>`;
    }
    case 'boards': return `<span class="swatch-board">${'<i></i>'.repeat(9)}</span>`;
    case 'blades': return item.katana ? katanaArtwork(item.katana) : katanaSilhouette(item.colors);
    case 'sounds': return '<span class="swatch-wave"><i></i><i></i><i></i><i></i></span>';
    case 'effects': return `<span class="swatch-effect swatch-effect-${item.effect ?? 'shatter'}"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><b></b></span>`;
    case 'trails': return `<span class="swatch-trail swatch-trail-${item.trail ?? 'glow'}"><b></b><i></i><i></i><i></i><i></i><i></i></span>`;
    default: return '<span class="swatch-dots"><i></i><i></i><i></i></span>';
  }
}

/** Small katana silhouette in the skin's colours for item cards. */
export function katanaSilhouette(colors: readonly string[]): string {
  const [steel = '#e6eaeb', fittings = '#2b2f36', wrap = '#1e2024', accent = '#43c2c7'] = colors;
  return `<svg class="swatch-katana" viewBox="0 0 64 64" aria-hidden="true">
    <g transform="rotate(-38 32 32)">
      <path d="M31 4 C 34 12, 34.5 26, 33.5 40 L 30.5 40 C 29.5 26, 30 12, 31 4 Z" fill="${steel}"/>
      <path d="M31 4 C 32.6 12, 32.8 26, 32.2 40 L 30.5 40 C 29.5 26, 30 12, 31 4 Z" fill="rgba(255,255,255,0.45)"/>
      <rect x="29.6" y="40" width="4.8" height="2.6" fill="#8f7a55"/>
      <rect x="27" y="42.6" width="10" height="2.4" rx="1" fill="${fittings}"/>
      <rect x="29.4" y="45" width="5.2" height="15" rx="1.6" fill="${wrap}"/>
      <path d="M29.6 47 l5 3 M29.6 51 l5 3 M29.6 55 l5 3 M34.4 47 l-5 3 M34.4 51 l-5 3 M34.4 55 l-5 3" stroke="rgba(255,255,255,0.22)" stroke-width="0.7"/>
      <rect x="31.4" y="50" width="1.4" height="3.2" rx="0.6" fill="${accent}"/>
      <rect x="29.2" y="60" width="5.6" height="2" rx="0.8" fill="${fittings}"/>
    </g></svg>`;
}

function previewCard(ctx: ScreenContext, item: CosmeticDefinition, mode: 'shop' | 'collection'): string {
  const owned = ctx.inventory.owns(item.id);
  const equipped = ctx.save.equipped[item.category] === item.id;
  const isDefault = DEFAULT_EQUIPPED[item.category] === item.id;
  const canAfford = ctx.save.currency >= item.cost;
  const actions = equipped
    ? (isDefault ? button('Equipped', 'noop', { variant: 'secondary', disabled: true, icon: 'equipped' }) : button('Equipped', 'noop', { variant: 'secondary', disabled: true, icon: 'equipped' }) + button('Use default', 'catalog-unequip', { variant: 'quiet', value: item.category }))
    : owned
      ? button('Equip', 'equip', { variant: 'primary', value: item.id, icon: 'confirm' })
      : mode === 'shop'
        ? button(`Buy · ${item.cost}`, 'purchase', { variant: 'primary', value: item.id, icon: 'shard', disabled: !canAfford })
        : '';
  const preview = item.category === 'effects' || item.category === 'sounds'
    ? button(item.category === 'effects' ? 'Preview effect' : 'Play sample', item.category === 'effects' ? 'preview-effect' : 'preview-sound', { variant: 'quiet', value: item.id, icon: 'play' })
    : '';
  const price = owned
    ? `<span class="price is-owned">${icon('owned')} Owned</span>`
    : `<span class="price">${icon('shard')}<span class="num">${item.cost.toLocaleString()}</span>${!canAfford ? `<small class="t-caption"> · need ${(item.cost - ctx.save.currency).toLocaleString()} more</small>` : ''}</span>`;
  const vars = item.colors.map((color, index) => `--c${index + 1}:${color}`).join(';');
  const design = item.katana;
  const bladeTools = design ? `<div class="katana-tools">
    <button type="button" data-action="blade-detail" aria-pressed="false">${icon('katana')}<span>Inspect fittings</span></button>
    <button type="button" data-action="blade-motion" aria-pressed="false" aria-label="Pause blade animation">${icon('pause')}<span>Pause</span></button>
  </div>` : '';
  return `<div class="panel preview-card${ctx.shop.revealing === item.id ? ' is-revealing' : ''}" data-preview-category="${item.category}" data-preview-id="${item.id}" style="${vars}">
    <div class="preview-stage" id="preview-stage">${design ? `<div class="katana-stage-label"><span>Katana collection</span><b>0${design.tier}<small> / 05</small></b></div><div class="katana-viewport"></div>${bladeTools}` : ''}${staticPreview(item)}</div>
    <div class="preview-info">
      <span class="style-tag">${design ? `${design.rank} · Japanese katana` : `${item.style} · ${COSMETIC_CATEGORIES.find((c) => c.id === item.category)?.short ?? ''}`}</span>
      <h2>${item.name}</h2>
      ${design ? `<span class="katana-epithet">${design.epithet}</span>` : ''}
      <p>${item.description}</p>
      ${design ? `<ul class="katana-details">${design.details.map((detail) => `<li>${detail}</li>`).join('')}</ul><button type="button" class="katana-replay" data-action="blade-replay">${icon('play')}<span>${design.flourish}<small>Replay signature animation</small></span></button>` : ''}
      ${price}
      <div class="preview-actions">${actions}${preview}</div>
    </div>
  </div>`;
}

function staticPreview(item: CosmeticDefinition): string {
  switch (item.category) {
    case 'blocks': {
      const [cyan = '#43c2c7', coral = '#ea7d78', amber = '#ecb455', violet = '#8e60d8'] = item.colors;
      return `<div class="preview-blocks" style="--block-cyan:${cyan};--block-coral:${coral};--block-amber:${amber};--block-violet:${violet}">
        ${pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }], tone: 'cyan' })}
        ${pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }], tone: 'coral' })}
        ${pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], tone: 'amber' })}
        ${pieceMarkup({ cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }], tone: 'violet' })}
      </div>`;
    }
    case 'boards': return '<div class="preview-board" data-board-preview></div>';
    case 'effects': return '<div class="preview-effect"><div data-board-preview data-board-dense></div><div class="effects-host" data-effects-host></div></div>';
    case 'trails': return `<div class="preview-trail">${pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], tone: 'amber' })}${Array.from({ length: 7 }, (_, index) => `<i style="left:${20 + index * 9}%;top:${60 - index * 6}%;animation-delay:${index * 0.18}s;background:${item.colors[index % item.colors.length]}"></i>`).join('')}</div>`;
    case 'sounds': return '<div class="preview-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
    default: return '';
  }
}

/**
 * Populates live previews after the screen is in the DOM: mini boards, effect playback and the 3D blade.
 * Returns a handle the caller disposes when leaving or re-rendering.
 */
export function mountCatalogPreview(root: HTMLElement, item: CosmeticDefinition, bladeScene: BladeScene, equippedBlockColors: readonly string[]): PreviewHandle {
  const stage = root.querySelector<HTMLElement>('#preview-stage');
  if (!stage) return { dispose: () => undefined };
  const boardHost = stage.querySelector<HTMLElement>('[data-board-preview]');
  let effects: EffectsLayer | null = null;
  let board: BoardView | null = null;
  if (boardHost) {
    board = new BoardView(boardHost);
    const [frame, cell, gap, axis] = item.category === 'boards' ? item.colors : ['#181b20', '#24282f', '#0f1216', '#353940'];
    board.element.style.setProperty('--board-frame', frame ?? '#181b20');
    board.element.style.setProperty('--grid-empty', cell ?? '#24282f');
    board.element.style.setProperty('--grid-gap', gap ?? '#0f1216');
    board.element.style.setProperty('--mirror-axis', axis ?? '#353940');
    const [c0, c1, c2, c3] = equippedBlockColors;
    board.element.style.setProperty('--block-cyan', c0 ?? '#43c2c7');
    board.element.style.setProperty('--block-coral', c1 ?? '#ea7d78');
    board.element.style.setProperty('--block-amber', c2 ?? '#ecb455');
    board.element.style.setProperty('--block-violet', c3 ?? '#8e60d8');
    board.element.style.boxShadow = 'var(--shadow-2)';
    board.setBoard(sampleBoard(boardHost.hasAttribute('data-board-dense')));
  }
  const effectsHost = stage.querySelector<HTMLElement>('[data-effects-host]');
  if (effectsHost && board) {
    effects = new EffectsLayer(effectsHost);
    effects.configure({ budget: 90, effect: item.effect, effectColors: item.colors });
  }
  if (item.category === 'blades') {
    bladeScene.setSkin(item);
    bladeScene.setState({ charges: 3, energy: 0, hover: false, overdrive: false, fracture: false });
    bladeScene.mount(stage.querySelector<HTMLElement>('.katana-viewport') ?? stage, { hero: true, pose: 'showcase' });
  }
  return {
    play: effects && board ? () => {
      const rect = effects!.canvas.getBoundingClientRect();
      const grid = board!.gridRect();
      const cell = board!.cellSize();
      const origin = { x: grid.left - rect.left, y: grid.top - rect.top };
      const points = Array.from({ length: 9 }, (_, col) => ({ x: origin.x + (col + 0.5) * cell, y: origin.y + 4.5 * cell }));
      board!.animateClear(Array.from({ length: 9 }, (_, col) => ({ row: 4, col })), false);
      effects!.lineClear([{ horizontal: true, index: 4 }], points, cell, origin, 0.9);
      window.setTimeout(() => board!.setBoard(sampleBoard(true)), 500);
    } : undefined,
    dispose: () => {
      effects?.dispose();
      if (item.category === 'blades') bladeScene.unmount();
    },
  };
}

function sampleBoard(dense: boolean): ({ tone: 'cyan' | 'coral' | 'amber' | 'violet'; pieceId: string } | null)[][] {
  const tones = ['cyan', 'coral', 'amber', 'violet'] as const;
  const grid: ({ tone: 'cyan' | 'coral' | 'amber' | 'violet'; pieceId: string } | null)[][] = Array.from({ length: 9 }, () => Array<null>(9).fill(null));
  const put = (row: number, col: number, tone: (typeof tones)[number]): void => { grid[row]![col] = { tone, pieceId: 'p' }; grid[row]![8 - col] = { tone, pieceId: 'p' }; };
  put(1, 1, 'cyan'); put(1, 2, 'cyan'); put(2, 1, 'cyan');
  put(3, 0, 'coral'); put(4, 0, 'coral'); put(4, 1, 'coral');
  put(7, 1, 'violet'); put(8, 1, 'violet'); put(8, 2, 'violet');
  put(5, 3, 'amber'); put(5, 4, 'amber');
  if (dense) for (let col = 0; col < 9; col += 1) grid[4]![col] = { tone: tones[col % 4]!, pieceId: 'row' };
  return grid;
}
