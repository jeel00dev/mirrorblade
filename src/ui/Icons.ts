/**
 * MIRRORBLADE icon family. One grammar for every glyph: 24×24 grid, 1.75px round-capped strokes,
 * 18–20px optical silhouette, no fills except the crest and currency, which are solid on purpose.
 */
const PATHS: Record<string, string> = {
  home: '<path d="M4.5 11.2 12 4.8l7.5 6.4"/><path d="M6.5 10v9h11v-9"/><path d="M10 19v-5h4v5"/>',
  play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 6v12M16 6v12"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4.2h4.2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/>',
  shop: '<path d="M5 9h14l-1 10.5H6z"/><path d="M8.5 9V7.8a3.5 3.5 0 0 1 7 0V9"/>',
  collection: '<path d="M4.5 7.5 12 4l7.5 3.5v9L12 20l-7.5-3.5z"/><path d="M12 11.2V20M4.5 7.5 12 11.2l7.5-3.7"/>',
  stats: '<path d="M5 19.5V13M12 19.5V6M19 19.5v-9"/>',
  achievements: '<circle cx="12" cy="9" r="5"/><path d="m8.8 13.3-1.6 6.2 4.8-2.3 4.8 2.3-1.6-6.2"/>',
  daily: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5"/><path d="m12 12.6 1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.3z" fill="currentColor" stroke="none"/>',
  back: '<path d="m14.5 5.5-6.5 6.5 6.5 6.5"/>',
  close: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
  confirm: '<path d="m5.5 12.5 4 4 9-9.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>',
  sound: '<path d="M5 9.5v5h3l4 3.5v-12l-4 3.5z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M17.8 7a6.5 6.5 0 0 1 0 10"/>',
  music: '<path d="M9 18.5V6.8l10-2.3v11.5"/><circle cx="6.8" cy="18.5" r="2.3"/><circle cx="16.8" cy="16" r="2.3"/>',
  haptics: '<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 9.5v5M19.5 9.5v5M12 17.5v.3"/>',
  graphics: '<rect x="3.5" y="5" width="17" height="12" rx="2"/><path d="M8.5 20h7M12 17v3"/><path d="m6.5 14 3.5-4 2.5 2.8 2-1.8 3 3"/>',
  motion: '<path d="M4 12h6M4 7h4M4 17h4"/><circle cx="16" cy="12" r="4"/>',
  contrast: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor" stroke="none"/>',
  shard: '<path d="M12 2.5 18 9l-6 12.5L6 9z" fill="currentColor" stroke="none"/><path d="M12 2.5v19M6 9h12" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>',
  blade: '<path d="M12 2.5c2.2 3.8 3 7.2 3 9.5s-.8 5.7-3 9.5c-2.2-3.8-3-7.2-3-9.5s.8-5.7 3-9.5z"/><path d="M12 9.5v5"/>',
  rotate: '<path d="M18.5 12a6.5 6.5 0 1 1-1.9-4.6"/><path d="M18.8 4.5v3.9h-3.9"/>',
  lock: '<rect x="6" y="10.5" width="12" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  owned: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.2"/>',
  equipped: '<path d="m12 3.5 2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.5l-5.1 2.8 1.1-5.8-4.3-4 5.8-.7z" fill="currentColor" stroke="none"/>',
  howto: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.1 1-1.1 1.9M12 16.6v.3"/>',
  share: '<circle cx="18" cy="5.5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="18.5" r="2.2"/><path d="m8 11 8-4.5M8 13l8 4.5"/>',
  mirror: '<path d="M12 3v18"/><path d="M4.5 7.5 9 12l-4.5 4.5M19.5 7.5 15 12l4.5 4.5"/>',
  energy: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  overdrive: '<path d="M12 3.5c1.5 3 4.5 5 4.5 8.5a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-5 .3 1.5 1 2.5 2 3 .2-2.5.5-4.5.5-6.5z"/>',
  fracture: '<path d="M12 3.5 9 9l3 2-2.5 4 3.5 2-1 4.5"/><path d="M6 6.5 4 9.5M18 6.5l2 3M5 16l-2 2M19 16l2 2"/>',
  clutch: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 1.5M10 3.5h4M12 3.5V6"/>',
  chain: '<path d="M10 14 14 10"/><path d="M8.5 15.5 7 17a2.8 2.8 0 0 1-4-4l3-3a2.8 2.8 0 0 1 4 0"/><path d="M15.5 8.5 17 7a2.8 2.8 0 0 1 4 4l-3 3a2.8 2.8 0 0 1-4 0"/>',
  crest: '<path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11z" fill="currentColor" stroke="none"/><path d="M6 20.5h12" stroke-width="2"/>',
  score: '<path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11z" fill="currentColor" stroke="none"/><path d="M6 20.5h12" stroke-width="2"/>',
  about: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.3"/>',
  trail: '<path d="M4 17c3-6 6-8 9-8 2.5 0 4 1.5 7 1.5"/><path d="M7 20c2-3 4-4 6-4"/>',
  effect: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5 9 9M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/>',
  board: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16"/>',
  blocks: '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4.2h4.2"/>',
  time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  best: '<path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11z" fill="currentColor" stroke="none"/><path d="M6 20.5h12" stroke-width="2"/>',
  contract: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M14 3.5v4h4M9 12.5h6M9 16h4"/>',
  precision: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
  stage: '<path d="M5 19.5v-7M9.5 19.5v-10M14 19.5v-13M18.5 19.5v-16"/>',
  katana: '<path d="M4.5 19.5 16 8"/><path d="m16 8 3.5-3.5c.6-.6.6-1.2 0-1.5L17.8 2.5 14 6.3"/><path d="m7 17 3 3M5.5 15.5l-2 2 2 2 2-2"/>',
};

export type IconName = keyof typeof PATHS;

export function icon(name: string, className = ''): string {
  const path = PATHS[name] ?? PATHS.info!;
  return `<svg class="icon${className ? ` ${className}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

export const icons = new Proxy({} as Record<string, string>, { get: (_, name: string) => icon(name) });

export function iconButton(action: string, label: string, name: string, extraClass = '', value?: string): string {
  return `<button class="icon-button${extraClass ? ` ${extraClass}` : ''}" type="button" data-action="${action}"${value ? ` data-value="${value}"` : ''} aria-label="${label}" title="${label}">${icon(name)}</button>`;
}
