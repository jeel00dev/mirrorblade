import { screenHead, segmented, settingRow, slider, toggle, button } from '../components';
import { element, type ScreenContext } from './context';

export function buildSettingsScreen(ctx: ScreenContext, backAction: string): HTMLElement {
  const s = ctx.save.settings;
  return element(`
    <section aria-label="Settings">
      ${screenHead('Settings', backAction)}
      <div class="screen-body narrow">
        <div class="section-label">Audio</div>
        <div class="panel settings-group">
          ${settingRow('sound', 'Master volume', '', slider('masterVolume', s.masterVolume, 'Master volume'))}
          ${settingRow('effect', 'Sound effects', '', slider('soundVolume', s.soundVolume, 'Sound effects volume'))}
          ${settingRow('music', 'Music', 'Ambient layers that respond to play.', slider('musicVolume', s.musicVolume, 'Music volume'))}
          ${settingRow('sound', 'Mute everything', '', toggle('muted', s.muted, 'Mute everything'))}
        </div>
        <div class="section-label">Feedback</div>
        <div class="panel settings-group">
          ${settingRow('haptics', 'Haptics', 'Short vibrations on supported phones.', toggle('haptics', s.haptics, 'Haptics'))}
          ${settingRow('effect', 'Screen shake', 'Tiny board nudges on big clears.', toggle('screenShake', s.screenShake, 'Screen shake'))}
        </div>
        <div class="section-label">Visual</div>
        <div class="panel settings-group">
          ${settingRow('graphics', 'Quality', 'Auto picks a profile for this device.', segmented('quality', s.quality, [{ value: 'auto', label: 'Auto' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Med' }, { value: 'high', label: 'High' }], 'Quality'), true)}
          ${settingRow('motion', 'Reduced motion', 'Removes shake, pulses and travel; keeps every signal readable.', toggle('reducedMotion', s.reducedMotion, 'Reduced motion'))}
          ${settingRow('blocks', 'Colour-accessible blocks', 'Distinct hues plus an embossed symbol per colour.', toggle('accessibleColors', s.accessibleColors, 'Colour-accessible blocks'))}
          ${settingRow('contrast', 'High contrast', 'Stronger cell edges and text.', toggle('highContrast', s.highContrast, 'High contrast'))}
        </div>
        <div class="section-label">Gameplay</div>
        <div class="panel settings-group">
          ${settingRow('howto', 'Tutorial', ctx.save.onboardingComplete ? 'Show the guided first moves again on the next run.' : 'Guidance will appear on your next run.', button('Reset', 'reset-tutorial', { variant: 'quiet', small: true, disabled: !ctx.save.onboardingComplete }))}
        </div>
        <div class="section-label">Platform</div>
        <div class="panel settings-footer">
          <p>MIRRORBLADE runs on the CrazyGames platform SDK. Progress is stored with your CrazyGames account when available, otherwise on this device. No accounts, tracking or external advertising code are included in the game itself.</p>
          <div class="links">${button('About & credits', 'about', { variant: 'quiet', small: true })}</div>
        </div>
      </div>
    </section>`);
}
