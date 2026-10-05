// Sound as data: cues derived from the same timing as the animation. The engine fires the cues that fall
// in each frame's window while playing forward; any seek or pause flushes, so scrubbing never replays sounds.
import type { Cue } from '../core/types';
import { VOICES } from './voices';

const LOOKAHEAD = 0.12;   // schedule this far ahead of the playhead (seconds)
const MASTER = 0.5;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private next = 0;                 // index of the next unfired cue
  private lastT = 0;
  muted = true;
  /** number of cues actually played (for checks) */
  fired = 0;
  private cues: Cue[];

  constructor(cues: Cue[]) { this.cues = [...cues].sort((a, b) => a.t - b.t); }

  /** First call must come from a user gesture (browser autoplay policy). */
  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -14; limiter.ratio.value = 12; limiter.attack.value = 0.002; limiter.release.value = 0.12;
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER;
      this.master.connect(limiter); limiter.connect(this.ctx.destination);
    }
    await this.ctx.resume();
    this.muted = false;
    return true;
  }

  disable() { this.muted = true; }

  private seekTo(t: number) {
    let lo = 0, hi = this.cues.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.cues[m]!.t < t) lo = m + 1; else hi = m; }
    this.next = lo;
  }

  /** Call once per frame with the film time, whether it is advancing, and whether time jumped. */
  update(t: number, playing: boolean, seeked: boolean) {
    if (seeked || !playing || t < this.lastT) { this.seekTo(t); this.lastT = t; return; }
    this.lastT = t;
    const horizon = t + LOOKAHEAD;
    while (this.next < this.cues.length && this.cues[this.next]!.t <= horizon) {
      const cue = this.cues[this.next++]!;
      if (this.muted || !this.ctx || !this.master || cue.t < t - 0.05) continue;   // stale (frame hitch): skip
      const when = this.ctx.currentTime + Math.max(0, cue.t - t);
      this.fire(cue, when);
    }
  }

  private fire(cue: Cue, when: number) {
    this.fired++;
    const ctx = this.ctx!;
    let dest: AudioNode = this.master!;
    if (cue.pan) { const p = ctx.createStereoPanner(); p.pan.value = cue.pan; p.connect(dest); dest = p; }
    VOICES[cue.voice](ctx, dest, when, cue.gain ?? 1, cue.pitch ?? 1);
  }
}
