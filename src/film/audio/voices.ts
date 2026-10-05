// Synthesized sound effects. No sample files: every voice is a few oscillators and a noise burst
// through short envelopes. All are quiet, short and dry; the master chain adds a limiter.
import type { VoiceName } from '../core/types';

let noiseBuf: AudioBuffer | null = null;
const noise = (ctx: AudioContext) => {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let s = 1234567;                       // seeded: the same noise every run
    for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 0x7fffffff) - 1; }
  }
  return noiseBuf;
};

/** Gain node with an attack/decay envelope, connected to `dest`. */
const env = (ctx: AudioContext, dest: AudioNode, t: number, peak: number, attack: number, decay: number) => {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest);
  return g;
};

const tone = (ctx: AudioContext, dest: AudioNode, t: number, f0: number, f1: number, type: OscillatorType, peak: number, attack: number, decay: number) => {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  o.connect(env(ctx, dest, t, peak, attack, decay));
  o.start(t); o.stop(t + attack + decay + 0.05);
};

const burst = (ctx: AudioContext, dest: AudioNode, t: number, freq: number, q: number, peak: number, dur: number, sweepTo?: number) => {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(freq, t);
  if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  src.connect(bp); bp.connect(env(ctx, dest, t, peak, Math.min(0.01, dur / 4), dur));
  src.start(t); src.stop(t + dur + 0.05);
};

type Voice = (ctx: AudioContext, dest: AudioNode, t: number, g: number, p: number) => void;

export const VOICES: Record<VoiceName, Voice> = {
  type:   (c, d, t, g, p) => burst(c, d, t, 2600 * p, 6, 0.10 * g, 0.018),
  reveal: (c, d, t, g, p) => tone(c, d, t, 620 * p, 880 * p, 'sine', 0.12 * g, 0.004, 0.09),
  lock:   (c, d, t, g, p) => { tone(c, d, t, 1320 * p, 1320 * p, 'sine', 0.14 * g, 0.003, 0.28); tone(c, d, t, 1980 * p, 1980 * p, 'sine', 0.05 * g, 0.003, 0.18); },
  fail:   (c, d, t, g, p) => { tone(c, d, t, 140 * p, 62 * p, 'sine', 0.22 * g, 0.004, 0.2); burst(c, d, t, 300, 1.2, 0.07 * g, 0.12); },
  call:   (c, d, t, g, p) => { tone(c, d, t, 880 * p, 880 * p, 'triangle', 0.1 * g, 0.003, 0.07); tone(c, d, t + 0.09, 1320 * p, 1320 * p, 'triangle', 0.1 * g, 0.003, 0.09); },
  step:   (c, d, t, g, p) => { tone(c, d, t, 392 * p, 587 * p, 'triangle', 0.13 * g, 0.004, 0.14); tone(c, d, t, 784 * p, 1174 * p, 'sine', 0.04 * g, 0.004, 0.14); },
  morph:  (c, d, t, g) => burst(c, d, t, 260, 1.4, 0.10 * g, 2.6, 3200),
  stamp:  (c, d, t, g, p) => { tone(c, d, t, 180 * p, 70 * p, 'sine', 0.26 * g, 0.002, 0.16); burst(c, d, t, 900, 0.8, 0.09 * g, 0.05); },
};
