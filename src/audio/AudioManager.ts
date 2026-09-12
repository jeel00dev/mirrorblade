import type { SoundTheme } from '../config/cosmetics';
import type { PlayerSettings } from '../progression/SaveData';

export type SoundName =
  | 'tap' | 'pickup' | 'rotate' | 'place' | 'mirror' | 'invalid' | 'return' | 'blade-hover' | 'cut'
  | 'clear' | 'double' | 'triple' | 'max' | 'perfect-mirror' | 'perfect-clear' | 'chain'
  | 'energy-milestone' | 'blade-forged' | 'overdrive-start' | 'overdrive-tick' | 'overdrive-end'
  | 'fracture-warn' | 'fracture-start' | 'fracture-tick' | 'clutch' | 'escape' | 'game-over' | 'best' | 'purchase' | 'equip'
  | 'contract-offer' | 'contract-complete' | 'precision-spawn' | 'precision-hit' | 'milestone' | 'slice';

export type MusicLayer = 'chain' | 'overdrive' | 'fracture' | 'tension' | 'pulse';

interface Tone { f: number; end?: number; d: number; type?: OscillatorType; v: number; delay?: number; }

interface ThemeProfile { pitch: number; decay: number; body: OscillatorType; sparkle: OscillatorType; impact: OscillatorType; }

const THEMES: Record<SoundTheme, ThemeProfile> = {
  studio: { pitch: 1, decay: 1, body: 'sine', sparkle: 'triangle', impact: 'triangle' },
  crystal: { pitch: 1.25, decay: 1.6, body: 'sine', sparkle: 'sine', impact: 'sine' },
  machine: { pitch: 0.8, decay: 0.8, body: 'triangle', sparkle: 'square', impact: 'sawtooth' },
};

/**
 * Fully synthesized audio: short SFX plus three music layers that follow the run state.
 * Nothing plays before a user gesture unlocks the context; every path respects master / SFX / music /
 * mute / platform mute, and the whole graph suspends with the tab.
 */
export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private layerGains = new Map<MusicLayer | 'base', GainNode>();
  private layerNodes: AudioScheduledSourceNode[] = [];
  private pulseTimer: number | null = null;
  private platformMuted = false;
  private theme: ThemeProfile = THEMES.studio;
  private activeLayers = new Set<MusicLayer>();
  private lastPlayed = new Map<SoundName, number>();
  private noiseBuffer: AudioBuffer | null = null;
  private intensity = 0;
  private chainDepth = 0;

  public constructor(private readonly settings: PlayerSettings) {}

  public async unlock(): Promise<void> {
    if (!this.context) this.createGraph();
    if (this.context?.state === 'suspended') { try { await this.context.resume(); } catch { /* blocked until gesture */ } }
    this.updateLevels();
  }

  public setTheme(theme: SoundTheme): void {
    this.theme = THEMES[theme] ?? THEMES.studio;
  }

  public play(name: SoundName): void {
    if (!this.context || !this.sfxGain || this.settings.muted || this.platformMuted) return;
    const now = this.context.currentTime;
    const last = this.lastPlayed.get(name) ?? -1;
    if (now - last < 0.03) return;
    this.lastPlayed.set(name, now);
    for (const tone of this.tonesFor(name)) this.tone(tone, now);
    if (name === 'cut' || name === 'slice') this.whoosh(now);
  }

  /** Short band-passed noise burst: the air moving around the katana. */
  private whoosh(now: number): void {
    const context = this.context!;
    if (!this.noiseBuffer) {
      const length = Math.floor(context.sampleRate * 0.25);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      this.noiseBuffer = buffer;
    }
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.18);
    filter.Q.value = 0.9;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    source.connect(filter).connect(gain).connect(this.sfxGain!);
    source.start(now);
    source.stop(now + 0.22);
  }

  public setLayer(layer: MusicLayer, active: boolean): void {
    if (active) this.activeLayers.add(layer); else this.activeLayers.delete(layer);
    this.applyLayers();
  }

  public clearLayers(): void {
    this.activeLayers.clear();
    this.applyLayers();
  }

  /** Chain depth 0+: the harmonic pad grows with consecutive clears. */
  public setChainDepth(chain: number): void {
    this.chainDepth = Math.max(0, Math.min(6, chain));
    this.applyLayers();
  }

  /** Run intensity 0–1 from the Difficulty Director: adds a soft pulse from ~0.4 and a percussive tick from ~0.7. */
  public setIntensity(level: number): void {
    this.intensity = Math.max(0, Math.min(1, level));
    if (this.intensity >= 0.35) this.activeLayers.add('pulse'); else this.activeLayers.delete('pulse');
    this.applyLayers();
  }

  public updateLevels(): void {
    if (!this.master || !this.musicGain || !this.sfxGain || !this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted || this.platformMuted ? 0 : this.settings.masterVolume * 0.9, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume * 0.16, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.soundVolume, now, 0.03);
  }

  public setPlatformMuted(muted: boolean): void {
    this.platformMuted = muted;
    this.updateLevels();
  }

  public setSuspended(suspended: boolean): void {
    if (!this.context) return;
    if (suspended && this.context.state === 'running') void this.context.suspend();
    else if (!suspended && this.context.state === 'suspended') void this.context.resume();
  }

  public vibrate(pattern: number | number[]): void {
    if (!this.settings.haptics || this.settings.reducedMotion) return;
    try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
  }

  public dispose(): void {
    if (this.pulseTimer !== null) window.clearInterval(this.pulseTimer);
    this.layerNodes.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } });
    void this.context?.close();
    this.context = null;
  }

  private tone(tone: Tone, now: number): void {
    const context = this.context!;
    const start = now + (tone.delay ?? 0);
    const duration = tone.d * this.theme.decay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type ?? this.theme.body;
    const f = tone.f * this.theme.pitch;
    oscillator.frequency.setValueAtTime(f, start);
    if (tone.end) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, tone.end * this.theme.pitch), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.v, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.sfxGain!);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private tonesFor(name: SoundName): Tone[] {
    const t = this.theme;
    switch (name) {
      case 'tap': return [{ f: 420, end: 380, d: 0.045, v: 0.05 }];
      case 'pickup': return [{ f: 300, end: 440, d: 0.07, v: 0.08 }];
      case 'rotate': return [{ f: 520, end: 640, d: 0.05, v: 0.06, type: t.sparkle }, { f: 780, d: 0.03, v: 0.03, delay: 0.03 }];
      case 'place': return [{ f: 140, end: 92, d: 0.09, v: 0.16, type: t.impact }];
      case 'mirror': return [{ f: 660, end: 900, d: 0.12, v: 0.05 }, { f: 495, d: 0.16, v: 0.02, delay: 0.06 }];
      case 'invalid': return [{ f: 150, end: 105, d: 0.09, v: 0.035, type: 'square' }];
      case 'return': return [{ f: 270, end: 180, d: 0.1, v: 0.06 }];
      case 'blade-hover': return [{ f: 880, end: 1080, d: 0.05, v: 0.03 }];
      case 'cut': return [{ f: 1400, end: 380, d: 0.16, v: 0.08, type: 'sawtooth' }, { f: 2600, end: 1800, d: 0.09, v: 0.03, type: t.sparkle, delay: 0.02 }];
      case 'clear': return [{ f: 560, end: 1100, d: 0.24, v: 0.1 }, { f: 840, end: 1260, d: 0.2, v: 0.04, delay: 0.05 }];
      case 'double': return [{ f: 560, end: 1100, d: 0.24, v: 0.1 }, { f: 700, end: 1400, d: 0.26, v: 0.06, delay: 0.04 }, { f: 1050, d: 0.3, v: 0.03, delay: 0.1, type: t.sparkle }];
      case 'triple': return [{ f: 520, end: 1040, d: 0.28, v: 0.1 }, { f: 660, end: 1320, d: 0.3, v: 0.07, delay: 0.04 }, { f: 880, end: 1760, d: 0.34, v: 0.05, delay: 0.08 }, { f: 1600, d: 0.2, v: 0.03, delay: 0.14, type: t.sparkle }];
      case 'max': return [{ f: 440, end: 880, d: 0.32, v: 0.11, type: t.impact }, { f: 660, end: 1320, d: 0.34, v: 0.08, delay: 0.05 }, { f: 880, end: 1760, d: 0.38, v: 0.06, delay: 0.1 }, { f: 1320, end: 2640, d: 0.4, v: 0.04, delay: 0.15, type: t.sparkle }];
      case 'perfect-mirror': return [{ f: 1320, end: 1980, d: 0.3, v: 0.05, type: t.sparkle }, { f: 990, d: 0.4, v: 0.04, delay: 0.05 }, { f: 1980, d: 0.5, v: 0.025, delay: 0.1, type: t.sparkle }];
      case 'perfect-clear': return [{ f: 330, end: 660, d: 0.5, v: 0.1 }, { f: 495, end: 990, d: 0.5, v: 0.07, delay: 0.08 }, { f: 660, end: 1320, d: 0.6, v: 0.06, delay: 0.16 }, { f: 2640, d: 0.7, v: 0.03, delay: 0.24, type: t.sparkle }];
      case 'chain': return [{ f: 700, end: 1000, d: 0.12, v: 0.045 }];
      case 'energy-milestone': return [{ f: 900, end: 1300, d: 0.18, v: 0.035, type: t.sparkle }];
      case 'blade-forged': return [{ f: 600, end: 1800, d: 0.36, v: 0.08, type: 'sawtooth' }, { f: 2400, d: 0.5, v: 0.04, delay: 0.12, type: t.sparkle }, { f: 3200, d: 0.4, v: 0.02, delay: 0.2, type: t.sparkle }];
      case 'overdrive-start': return [{ f: 220, end: 440, d: 0.5, v: 0.09 }, { f: 330, end: 660, d: 0.55, v: 0.06, delay: 0.1 }, { f: 1760, d: 0.6, v: 0.03, delay: 0.3, type: t.sparkle }];
      case 'overdrive-tick': return [{ f: 1100, d: 0.05, v: 0.03, type: t.sparkle }];
      case 'overdrive-end': return [{ f: 660, end: 330, d: 0.5, v: 0.05 }];
      case 'fracture-warn': return [{ f: 196, end: 180, d: 0.6, v: 0.07 }, { f: 98, d: 0.7, v: 0.05, delay: 0.05 }];
      case 'fracture-start': return [{ f: 110, end: 70, d: 0.4, v: 0.1, type: t.impact }, { f: 1200, end: 600, d: 0.2, v: 0.025, type: 'square', delay: 0.02 }];
      case 'fracture-tick': return [{ f: 160, end: 120, d: 0.08, v: 0.05, type: t.impact }];
      case 'clutch': return [{ f: 80, d: 0.12, v: 0.12, type: t.impact }, { f: 880, end: 1760, d: 0.4, v: 0.08, delay: 0.14 }, { f: 1320, end: 2640, d: 0.45, v: 0.05, delay: 0.2, type: t.sparkle }];
      case 'escape': return [{ f: 200, end: 800, d: 0.4, v: 0.07 }, { f: 1200, d: 0.3, v: 0.03, delay: 0.15, type: t.sparkle }];
      case 'game-over': return [{ f: 440, end: 110, d: 0.9, v: 0.08 }, { f: 330, end: 82, d: 1, v: 0.05, delay: 0.1 }];
      case 'best': return [{ f: 520, end: 1560, d: 0.4, v: 0.08 }, { f: 780, end: 2080, d: 0.45, v: 0.05, delay: 0.1, type: t.sparkle }];
      case 'purchase': return [{ f: 660, end: 990, d: 0.15, v: 0.06 }, { f: 990, end: 1320, d: 0.2, v: 0.05, delay: 0.1, type: t.sparkle }];
      case 'equip': return [{ f: 500, end: 750, d: 0.12, v: 0.05 }];
      case 'contract-offer': return [{ f: 740, d: 0.12, v: 0.04, type: t.sparkle }, { f: 988, d: 0.16, v: 0.035, type: t.sparkle, delay: 0.09 }];
      case 'contract-complete': return [{ f: 660, end: 990, d: 0.18, v: 0.06 }, { f: 990, end: 1320, d: 0.22, v: 0.05, delay: 0.1 }, { f: 1980, d: 0.3, v: 0.03, delay: 0.2, type: t.sparkle }];
      case 'precision-spawn': return [{ f: 1480, d: 0.1, v: 0.025, type: t.sparkle }];
      case 'precision-hit': return [{ f: 1180, end: 1760, d: 0.2, v: 0.05, type: t.sparkle }, { f: 2350, d: 0.3, v: 0.03, delay: 0.08, type: t.sparkle }];
      case 'milestone': return [{ f: 330, end: 660, d: 0.4, v: 0.07 }, { f: 495, end: 990, d: 0.45, v: 0.05, delay: 0.1 }, { f: 1320, d: 0.5, v: 0.03, delay: 0.25, type: t.sparkle }];
      case 'slice': return [{ f: 1800, end: 300, d: 0.14, v: 0.06, type: 'sawtooth' }, { f: 3200, end: 2200, d: 0.08, v: 0.03, type: t.sparkle, delay: 0.01 }];
      default: return [];
    }
  }

  private createGraph(): void {
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.context.destination);

    // Base: a very low, filtered drone.
    const base = this.layer('base', 1);
    const drone = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    drone.type = 'sine';
    drone.frequency.value = 55;
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    drone.connect(filter).connect(base);
    drone.start();
    this.layerNodes.push(drone);

    // Chain: a soft tonal pad a fifth up, slowly wobbling.
    const chain = this.layer('chain', 0);
    const pad = this.context.createOscillator();
    const pad2 = this.context.createOscillator();
    const padFilter = this.context.createBiquadFilter();
    pad.type = 'triangle'; pad.frequency.value = 164.8;
    pad2.type = 'sine'; pad2.frequency.value = 247.2;
    padFilter.type = 'lowpass'; padFilter.frequency.value = 900;
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.frequency.value = 0.35; lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(padFilter.frequency);
    pad.connect(padFilter); pad2.connect(padFilter); padFilter.connect(chain);
    pad.start(); pad2.start(); lfo.start();
    this.layerNodes.push(pad, pad2, lfo);

    // Overdrive and Fracture are pulsed layers driven by a scheduler.
    this.layer('overdrive', 0);
    this.layer('fracture', 0);
    this.layer('pulse', 0);
    // Tension: a low filtered saw drone that fades in with Mirror Stress.
    const tension = this.layer('tension', 0);
    const saw = this.context.createOscillator();
    const sawFilter = this.context.createBiquadFilter();
    saw.type = 'sawtooth'; saw.frequency.value = 41.2;
    sawFilter.type = 'lowpass'; sawFilter.frequency.value = 220; sawFilter.Q.value = 2;
    saw.connect(sawFilter).connect(tension);
    saw.start();
    this.layerNodes.push(saw);
    this.pulseTimer = window.setInterval(() => this.schedulePulses(), 250);
    this.updateLevels();
  }

  private layer(name: MusicLayer | 'base', initial: number): GainNode {
    const gain = this.context!.createGain();
    gain.gain.value = initial;
    gain.connect(this.musicGain!);
    this.layerGains.set(name, gain);
    return gain;
  }

  private applyLayers(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.layerGains.get('chain')?.gain.setTargetAtTime(this.activeLayers.has('chain') ? 0.4 + Math.min(0.5, this.chainDepth * 0.12) : 0, now, 0.4);
    this.layerGains.get('overdrive')?.gain.setTargetAtTime(this.activeLayers.has('overdrive') ? 1 : 0, now, 0.3);
    this.layerGains.get('fracture')?.gain.setTargetAtTime(this.activeLayers.has('fracture') ? 1 : 0, now, 0.3);
    this.layerGains.get('tension')?.gain.setTargetAtTime(this.activeLayers.has('tension') && !this.activeLayers.has('fracture') ? 0.35 : 0, now, 0.8);
    this.layerGains.get('pulse')?.gain.setTargetAtTime(this.activeLayers.has('pulse') && !this.activeLayers.has('overdrive') && !this.activeLayers.has('fracture') ? 0.3 + this.intensity * 0.5 : 0, now, 0.6);
    this.layerGains.get('base')?.gain.setTargetAtTime(this.activeLayers.has('fracture') ? 0.4 : 1, now, 0.5);
  }

  private nextPulse = 0;

  private schedulePulses(): void {
    if (!this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (this.nextPulse < now) this.nextPulse = now + 0.05;
    const horizon = now + 0.6;
    while (this.nextPulse < horizon) {
      const t = this.nextPulse;
      if (this.activeLayers.has('overdrive')) {
        // 128 bpm eighth-note pulse: alternating bright tick and low thump.
        const beat = Math.round(t / 0.234) % 2 === 0;
        this.pulse('overdrive', t, beat ? 82 : 1320, beat ? 0.11 : 0.05, beat ? 'sine' : this.theme.sparkle, beat ? 0.12 : 0.02);
        this.nextPulse = t + 0.234;
      } else if (this.activeLayers.has('fracture')) {
        // Heartbeat: two low thumps, then rest (~66 bpm).
        this.pulse('fracture', t, 58, 0.14, 'sine', 0.2);
        this.pulse('fracture', t + 0.22, 52, 0.12, 'sine', 0.14);
        this.nextPulse = t + 0.9;
      } else if (this.activeLayers.has('pulse')) {
        // Intensity pulse: soft 84 bpm thump; above 0.7 a quiet tick on the off-beat.
        const beat = Math.round(t / 0.357) % 2 === 0;
        if (beat) this.pulse('pulse', t, 64, 0.16, 'sine', 0.06 + this.intensity * 0.05);
        else if (this.intensity >= 0.7) this.pulse('pulse', t, 2400, 0.03, this.theme.sparkle, 0.012);
        this.nextPulse = t + 0.357;
      } else {
        this.nextPulse = t + 0.25;
      }
    }
  }

  private pulse(layer: MusicLayer, at: number, frequency: number, duration: number, type: OscillatorType, volume: number): void {
    const context = this.context!;
    const destination = this.layerGains.get(layer);
    if (!destination) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.7), at + duration);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }
}
