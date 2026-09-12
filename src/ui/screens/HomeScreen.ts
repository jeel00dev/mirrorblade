import { pieceMarkup } from '../../render/blocks';
import { effectiveStreak, isCompleted } from '../../game/DailyCalendar';
import { button, shardsPill, streakBadge, wordmark } from '../components';
import { icon, iconButton } from '../Icons';
import { element, type ScreenContext } from './context';

export function buildHomeScreen(ctx: ScreenContext): HTMLElement {
  const blade = ctx.inventory.equipped('blades');
  const design = blade.katana;
  const best = ctx.save.stats.bestScore;
  const daily = ctx.save.daily;
  const streak = effectiveStreak(daily, ctx.today);
  const dailyDone = isCompleted(daily, ctx.today);
  const heroPieces = [
    pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }], tone: 'cyan' }),
    pieceMarkup({ cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }], tone: 'cyan' }),
    pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], tone: 'amber' }),
    pieceMarkup({ cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], tone: 'amber' }),
  ].join('');
  return element(`
    <section aria-label="Home">
      <div class="home-top">
        ${wordmark('lg')}
        <div class="home-meta">${shardsPill(ctx.save.currency)}${iconButton('settings', 'Settings', 'settings')}</div>
      </div>
      <div class="home-hero">
        <div class="hero-stage" id="hero-stage"><span class="hero-mirror" aria-hidden="true"></span><div class="hero-blocks" aria-hidden="true">${heroPieces}</div></div>
        <div class="hero-blade-caption" data-equipped-blade="${blade.id}" style="--blade-accent:${blade.colors[3]}"><span>Equipped katana · 0${design?.tier ?? 1}</span><b>${blade.name}<small>${design?.epithet ?? ''}</small></b></div>
        <div class="home-records">
          <div class="record"><span>Best score</span><strong>${icon('crest')}<span class="num">${best.toLocaleString()}</span></strong></div>
          <div class="record record-shards"><span>Mirror Shards</span><strong>${icon('shard')}<span class="num">${ctx.save.currency.toLocaleString()}</span></strong></div>
        </div>
      </div>
      <div class="home-actions">
        ${ctx.activeRun
          ? button('Continue run', 'resume', { variant: 'primary', icon: 'play' }) + button('New run', 'quick-play', { variant: 'secondary', icon: 'restart' })
          : button('Play', 'quick-play', { variant: 'primary', icon: 'play' })}
        <button type="button" class="btn btn-secondary btn-daily" data-action="daily">${icon('daily')}<span>Daily Mirror${dailyDone ? '<small class="done">✓ today done</small>' : ''}</span>${streakBadge(streak, { compact: true })}</button>
      </div>
      <nav class="home-nav" aria-label="Menu">
        <button type="button" class="nav-item" data-action="shop">${icon('shop')}<span>Shop</span></button>
        <button type="button" class="nav-item" data-action="collection">${icon('collection')}<span>Collection</span></button>
        <button type="button" class="nav-item" data-action="stats">${icon('stats')}<span>Stats</span></button>
        <button type="button" class="nav-item" data-action="achievements">${icon('achievements')}<span>Awards</span></button>
        <button type="button" class="nav-item" data-action="howto">${icon('howto')}<span>Guide</span></button>
      </nav>
    </section>`);
}
