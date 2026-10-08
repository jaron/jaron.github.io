// Sound as data: cues derived from the same timing as the animation. The engine fires the cues that fall
// in each frame's window while playing forward; any seek or pause flushes, so scrubbing never replays sounds.
import type { Cue } from '../core/types';
import { VOICES } from './voices';
import { createMix, type Mix } from './mix';
import { Bed, type BedParams } from './bed';

const LOOKAHEAD = 0.12;   // schedule this far ahead of the playhead (seconds)

/** How much of a sound goes into the room: ticks stay dry, bells and chords bloom, and 2026 is roomier than 1996. */
export const roomSend = (voice: Cue['voice'], e: number) => (voice === 'type' ? 0.05 : voice === 'morph' || voice === 'transition' ? 0.2 : 0.12 + 0.3 * e);

/** Plays one cue on any audio context (live or offline). */
export function playCue(ctx: BaseAudioContext, mix: Mix, cue: Cue, when: number, e: number) {
  VOICES[cue.voice](ctx, mix.input(roomSend(cue.voice, e), cue.pan), when, cue.gain ?? 1, cue.pitch ?? 1, e);
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private mix: Mix | null = null;
  private bed: Bed | null = null;
  private lastBed = -1;
  private next = 0;                 // index of the next unfired cue
  private lastT = 0;
  muted = true;
  /** number of cues actually played (for checks) */
  fired = 0;
  private cues: Cue[];

  /** `eraAt(t)` says how far into 2026 the film is at time t (0 = 1996, 1 = 2026); it picks each cue's timbre. */
  constructor(cues: Cue[], private eraAt: (t: number) => number = () => 0, private bedAt: ((t: number) => BedParams) | null = null) { this.cues = [...cues].sort((a, b) => a.t - b.t); }

  /** First call must come from a user gesture (browser autoplay policy). */
  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.mix = createMix(this.ctx, this.ctx.destination);
      if (this.bedAt) this.bed = new Bed(this.ctx, this.mix);
    }
    await this.ctx.resume();
    this.muted = false;
    return true;
  }

  disable() { this.muted = true; this.bed?.silence(this.ctx!.currentTime); this.lastBed = -1; }

  /** The bed follows the film's time, ten times a second; it fades away on pause and mute. */
  private updateBed(t: number, playing: boolean, seeked: boolean) {
    if (!this.bed || !this.ctx || !this.bedAt) return;
    if (this.muted) return;
    const now = this.ctx.currentTime;
    if (!playing) { if (this.lastBed >= 0) { this.bed.silence(now, 0.15); this.lastBed = -1; } return; }
    if (!seeked && this.lastBed >= 0 && now - this.lastBed < 0.1) return;
    this.bed.set(this.bedAt(t), now, seeked ? 0.4 : 0.3);
    this.lastBed = now;
  }

  private seekTo(t: number) {
    let lo = 0, hi = this.cues.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.cues[m]!.t < t) lo = m + 1; else hi = m; }
    this.next = lo;
  }

  /** Call once per frame with the film time, whether it is advancing, and whether time jumped. */
  update(t: number, playing: boolean, seeked: boolean) {
    this.updateBed(t, playing, seeked);
    if (seeked || !playing || t < this.lastT) { this.seekTo(t); this.lastT = t; return; }
    this.lastT = t;
    const horizon = t + LOOKAHEAD;
    while (this.next < this.cues.length && this.cues[this.next]!.t <= horizon) {
      const cue = this.cues[this.next++]!;
      if (this.muted || !this.ctx || !this.mix || cue.t < t - 0.05) continue;   // stale (frame hitch): skip
      const when = this.ctx.currentTime + Math.max(0, cue.t - t);
      this.fired++;
      playCue(this.ctx, this.mix, cue, when, this.eraAt(cue.t));
    }
  }
}
