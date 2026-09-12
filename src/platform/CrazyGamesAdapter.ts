import { GAMEPLAY_FLAGS } from '../config/gameplay';
import type { CrazyGamesSDK } from './CrazyGamesTypes';

export interface AdHooks {
  onStart: () => void;
  onFinish: (rewarded: boolean) => void;
}

const INIT_TIMEOUT_MS = 4000;
const AD_TIMEOUT_MS = 90_000;

/** The only module that touches window.CrazyGames.SDK. Every call degrades silently to a playable local game. */
export class CrazyGamesAdapter {
  private sdk: CrazyGamesSDK | null = null;
  private initialized = false;
  private gameplayActive = false;
  private reportedCompletion = -1;

  public async init(): Promise<void> {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    // Docs: only use the SDK in the `local` and `crazygames` environments; elsewhere every call throws.
    if (sdk.environment === 'disabled') return;
    try {
      await Promise.race([
        sdk.init(),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('SDK init timeout')), INIT_TIMEOUT_MS)),
      ]);
      this.sdk = sdk;
      this.initialized = true;
    } catch {
      this.sdk = null;
      this.initialized = false;
    }
  }

  public isAvailable(): boolean {
    return this.initialized;
  }

  public loadingStart(): void { if (this.initialized) this.safe(() => this.sdk?.game?.loadingStart()); }
  public loadingStop(): void { if (this.initialized) this.safe(() => this.sdk?.game?.loadingStop()); }

  public gameplayStart(): void {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    if (this.initialized) this.safe(() => this.sdk?.game?.gameplayStart());
  }

  public gameplayStop(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    if (this.initialized) this.safe(() => this.sdk?.game?.gameplayStop());
  }

  public happyTime(): void { if (this.initialized) this.safe(() => this.sdk?.game?.happytime()); }

  /** Endless game: completion is defined as the Mirror Level milestones reached in a run (0–100, monotonic per run). */
  public reportCompletion(percentage: number): void {
    const value = Math.max(0, Math.min(100, Math.round(percentage)));
    if (value <= this.reportedCompletion) return;
    this.reportedCompletion = value;
    if (this.initialized) this.safe(() => this.sdk?.game?.reportGameCompletedPercentage?.(value));
  }

  /** A new run starts the completion measure again. */
  public resetCompletion(): void {
    this.reportedCompletion = -1;
  }

  public getStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'> | null {
    if (!this.initialized || !this.sdk?.data) return null;
    try {
      // Probe once: a disabled Data Module throws or returns nothing usable.
      this.sdk.data.getItem('mirrorblade.probe');
      return this.sdk.data;
    } catch {
      return null;
    }
  }

  public observeMuteAudio(listener: (muted: boolean) => void): () => void {
    const game = this.sdk?.game;
    listener(Boolean(game?.settings?.muteAudio));
    const settingsListener = (settings: { muteAudio?: boolean }): void => listener(Boolean(settings.muteAudio));
    this.safe(() => game?.addSettingsChangeListener?.(settingsListener));
    return () => this.safe(() => game?.removeSettingsChangeListener?.(settingsListener));
  }

  public requestMidgameAd(hooks: AdHooks): Promise<boolean> {
    if (!GAMEPLAY_FLAGS.adsEnabled) return Promise.resolve(false);
    return this.requestAd('midgame', hooks);
  }

  public requestRewardedAd(hooks: AdHooks): Promise<boolean> {
    if (!GAMEPLAY_FLAGS.adsEnabled || !GAMEPLAY_FLAGS.rewardedAdsEnabled) return Promise.resolve(false);
    return this.requestAd('rewarded', hooks);
  }

  private requestAd(type: 'midgame' | 'rewarded', hooks: AdHooks): Promise<boolean> {
    if (!this.initialized || !this.sdk?.ad) return Promise.resolve(false);
    return new Promise((resolve) => {
      let started = false;
      let settled = false;
      const settle = (result: boolean, finished: boolean): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (started || finished) hooks.onFinish(result && type === 'rewarded');
        resolve(result);
      };
      const timer = window.setTimeout(() => settle(false, false), AD_TIMEOUT_MS);
      try {
        this.sdk!.ad!.requestAd(type, {
          adStarted: () => { started = true; hooks.onStart(); },
          adFinished: () => settle(true, true),
          adError: () => settle(false, false),
        });
      } catch {
        settle(false, false);
      }
    });
  }

  private safe(action: () => void): void {
    try { action(); } catch { /* optional platform features degrade silently */ }
  }
}
