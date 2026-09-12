import { icon } from './Icons';

export function button(label: string, action: string, options: { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; icon?: string; value?: string; extra?: string; disabled?: boolean; small?: boolean; block?: boolean } = {}): string {
  const classes = ['btn', options.variant ? `btn-${options.variant}` : '', options.small ? 'btn-sm' : '', options.block ? 'btn-block' : '', options.extra ?? ''].filter(Boolean).join(' ');
  return `<button type="button" class="${classes}" data-action="${action}"${options.value ? ` data-value="${options.value}"` : ''}${options.disabled ? ' disabled' : ''}>${options.icon ? icon(options.icon) : ''}<span>${label}</span></button>`;
}

export function toggle(key: string, checked: boolean, label: string): string {
  return `<button type="button" class="toggle" role="switch" aria-checked="${checked}" aria-label="${label}" data-setting-toggle="${key}"></button>`;
}

export function slider(key: string, value: number, label: string): string {
  const percent = Math.round(value * 100);
  return `<div class="slider" style="--value:${percent}%"><input type="range" min="0" max="1" step="0.05" value="${value}" aria-label="${label}" data-setting-range="${key}"><output aria-hidden="true">${percent}%</output></div>`;
}

export function segmented(key: string, value: string, options: readonly { value: string; label: string }[], label: string): string {
  return `<div class="segmented" role="group" aria-label="${label}">${options.map((option) =>
    `<button type="button" aria-pressed="${option.value === value}" data-setting-choice="${key}" data-value="${option.value}">${option.label}</button>`,
  ).join('')}</div>`;
}

export function settingRow(iconName: string, title: string, detail: string, control: string, stacked = false): string {
  return `<div class="setting-row${stacked ? ' is-stacked' : ''}">${icon(iconName)}<div class="setting-text"><b>${title}</b>${detail ? `<small>${detail}</small>` : ''}</div><div class="setting-control">${control}</div></div>`;
}

export function screenHead(title: string, backAction: string, right = ''): string {
  return `<header class="screen-head"><button type="button" class="icon-button" data-action="${backAction}" aria-label="Back">${icon('back')}</button><h1>${title}</h1><div class="head-right">${right}</div></header>`;
}

export function shardsPill(amount: number, id = ''): string {
  return `<span class="shards"${id ? ` id="${id}"` : ''}>${icon('shard')}<b class="num">${amount.toLocaleString()}</b></span>`;
}

export function wordmark(size: 'lg' | 'sm' = 'lg'): string {
  return `<div class="wordmark ${size}" aria-label="MIRRORBLADE"><span>MIRROR</span><span>BLADE</span></div>`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}
