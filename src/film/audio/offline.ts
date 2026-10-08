// Renders the film's sound offline, through the same voices and mix as the live player, so it can be exported,
// listened to and measured (loudness, peaks) without playing the film.
import type { Cue } from '../core/types';
import { createMix } from './mix';
import { playCue } from './engine';
import { Bed, type BedParams } from './bed';

/** Stereo samples for film time t0..t1 (plus a tail for the room to ring out). */
export async function renderAudio(cues: Cue[], eraAt: (t: number) => number, bedAt: ((t: number) => BedParams) | null, t0: number, t1: number, music: { data: ArrayBuffer; start: number; fadeIn: number; level: number } | null = null, rate = 48000): Promise<[Float32Array, Float32Array]> {
  const tail = 3;
  const ctx = new OfflineAudioContext(2, Math.ceil((t1 - t0 + tail) * rate), rate);
  const mix = createMix(ctx, ctx.destination);
  if (bedAt) { const bed = new Bed(ctx, mix); for (let t = t0; t <= t1 + 0.001; t += 0.1) bed.set(bedAt(t), t - t0, 0.12); bed.silence(t1 - t0 + 0.3, 0.3); }
  for (const cue of cues) if (cue.t >= t0 && cue.t < t1) playCue(ctx, mix, cue, cue.t - t0, eraAt(cue.t));
  if (music && music.start < t1 + tail) {                                    // the music, straight to the output like in the player
    const b = await ctx.decodeAudioData(music.data.slice(0));
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain(), at = music.start - t0, from = Math.max(0, -at);
    const k = Math.min(1, from / music.fadeIn), w = k * k * (3 - 2 * k);
    g.gain.setValueAtTime(music.level * w, Math.max(0, at));
    if (from < music.fadeIn) g.gain.linearRampToValueAtTime(music.level, Math.max(0, at) + (music.fadeIn - from));
    src.connect(g); g.connect(ctx.destination); src.start(Math.max(0, at), from);
  }
  const buf = await ctx.startRendering();
  return [buf.getChannelData(0), buf.getChannelData(1)];
}
