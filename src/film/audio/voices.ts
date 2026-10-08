// Synthesized sound effects. No sample files: every voice is a few oscillators and a noise burst through short
// envelopes. Each voice has two timbres and blends them by the era (0 = 1996, 1 = 2026): 1996 is dry square-wave
// beeps and clicks; 2026 is soft sine tones with a little bell in them. Every pitch is snapped to one scale (D major
// pentatonic) so the sounds always agree with each other, and the typing ticks vary a little, from the cue's time,
// so a run of them never sounds mechanical (the variation is deterministic).
import type { VoiceName } from '../core/types';

const noiseBufs = new Map<number, AudioBuffer>();
const noise = (ctx: BaseAudioContext) => {
  let buf = noiseBufs.get(ctx.sampleRate);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 1234567;                       // seeded: the same noise every run
    for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 0x7fffffff) - 1; }
    noiseBufs.set(ctx.sampleRate, buf);
  }
  return buf;
};

/** A repeatable pseudo-random number in 0..1 from a time. */
const rnd = (t: number, k = 0) => { const x = Math.sin((t + k) * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

/** The scale: D major pentatonic (D E F# A B), as semitones above D. */
const SCALE = [0, 2, 4, 7, 9];
export const snap = (f: number) => {
  const m = 69 + 12 * Math.log2(f / 440), base = Math.round(m);
  let best = base, bd = 99;
  for (let n = base - 3; n <= base + 3; n++) {
    if (!SCALE.includes((((n - 2) % 12) + 12) % 12)) continue;       // D is pitch class 2
    const d = Math.abs(n - m);
    if (d < bd) { bd = d; best = n; }
  }
  return 440 * 2 ** ((best - 69) / 12);
};

/** Gain node with an attack/decay envelope, connected to `dest`. */
const env = (ctx: BaseAudioContext, dest: AudioNode, t: number, peak: number, attack: number, decay: number) => {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest);
  return g;
};

interface ToneOpts { lp?: number; scale?: boolean }
const tone = (ctx: BaseAudioContext, dest: AudioNode, t: number, f0: number, f1: number, type: OscillatorType, peak: number, attack: number, decay: number, o: ToneOpts = {}) => {
  if (peak < 0.0004) return;
  const a = o.scale === false ? f0 : snap(f0), b = o.scale === false ? f1 : snap(f1);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(a, t);
  if (b !== a) osc.frequency.exponentialRampToValueAtTime(b, t + attack + decay);
  let out: AudioNode = env(ctx, dest, t, peak, attack, decay);
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.connect(out); out = f; }
  osc.connect(out);
  osc.start(t); osc.stop(t + attack + decay + 0.05);
};

const burst = (ctx: BaseAudioContext, dest: AudioNode, t: number, freq: number, q: number, peak: number, dur: number, sweepTo?: number) => {
  if (peak < 0.0004) return;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(freq, t);
  if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  src.connect(bp); bp.connect(env(ctx, dest, t, peak, Math.min(0.01, dur / 4), dur));
  src.loop = true;
  src.start(t, rnd(t, 5)); src.stop(t + dur + 0.05);
};

/** A bell: the note plus a quiet inharmonic partner, for the 2026 timbre. */
const bell = (ctx: BaseAudioContext, dest: AudioNode, t: number, f: number, peak: number, attack: number, decay: number) => {
  tone(ctx, dest, t, f, f, 'sine', peak, attack, decay);
  tone(ctx, dest, t, f * 2.76, f * 2.76, 'sine', peak * 0.16, attack, decay * 0.7, { scale: false });
};

type Voice = (ctx: BaseAudioContext, dest: AudioNode, t: number, g: number, p: number, e: number) => void;
const TICKS = [1175, 1319, 1480, 1760];     // 2026 typing ticks: notes of the scale, chosen by the cue's time

export const VOICES: Record<VoiceName, Voice> = {
  type: (c, d, t, g, p, e) => {
    const w96 = 1 - e, w26 = e, r = rnd(t);
    burst(c, d, t, 2600 * p * (0.85 + 0.3 * r), 6, 0.10 * g * w96 * (0.8 + 0.4 * rnd(t, 1)), 0.018);
    tone(c, d, t, TICKS[Math.floor(rnd(t, 2) * TICKS.length)]! * p, TICKS[Math.floor(rnd(t, 2) * TICKS.length)]! * p, 'sine', 0.05 * g * w26 * (0.75 + 0.5 * rnd(t, 1)), 0.003, 0.05);
    burst(c, d, t, 4500, 3, 0.015 * g * w26, 0.01);
  },
  reveal: (c, d, t, g, p, e) => {
    tone(c, d, t, 620 * p, 880 * p, 'square', 0.07 * g * (1 - e), 0.004, 0.08, { lp: 2400 });
    if (e > 0.02) { tone(c, d, t, 620 * p, 880 * p, 'sine', 0.11 * g * e, 0.01, 0.22); bell(c, d, t, 880 * p, 0.03 * g * e, 0.01, 0.35); }
  },
  lock: (c, d, t, g, p, e) => {
    tone(c, d, t, 1320 * p, 1320 * p, 'square', 0.07 * g * (1 - e), 0.003, 0.22, { lp: 3200 });
    tone(c, d, t, 1980 * p, 1980 * p, 'square', 0.02 * g * (1 - e), 0.003, 0.14, { lp: 3200 });
    if (e > 0.02) { tone(c, d, t, 1320 * p, 1320 * p, 'sine', 0.13 * g * e, 0.004, 0.5); tone(c, d, t, 1980 * p, 1980 * p, 'sine', 0.05 * g * e, 0.004, 0.4); bell(c, d, t, 1320 * p, 0.03 * g * e, 0.004, 0.6); }
  },
  fail: (c, d, t, g, p, e) => {
    tone(c, d, t, 140 * p, 62 * p, 'sawtooth', 0.12 * g * (1 - e), 0.004, 0.2, { lp: 700 });
    burst(c, d, t, 300, 1.2, 0.07 * g * (1 - e), 0.12);
    if (e > 0.02) { tone(c, d, t, 140 * p, 62 * p, 'sine', 0.2 * g * e, 0.006, 0.45); tone(c, d, t, 148 * p, 66 * p, 'sine', 0.07 * g * e, 0.006, 0.4, { scale: false }); }
  },
  call: (c, d, t, g, p, e) => {
    tone(c, d, t, 880 * p, 880 * p, 'triangle', 0.1 * g * (1 - e), 0.003, 0.07);
    tone(c, d, t + 0.09, 1320 * p, 1320 * p, 'triangle', 0.1 * g * (1 - e), 0.003, 0.09);
    if (e > 0.02) { bell(c, d, t, 880 * p, 0.09 * g * e, 0.005, 0.2); bell(c, d, t + 0.09, 1320 * p, 0.09 * g * e, 0.005, 0.26); }
  },
  step: (c, d, t, g, p, e) => {
    tone(c, d, t, 392 * p, 587 * p, 'triangle', 0.11 * g * (1 - e), 0.004, 0.12);
    if (e > 0.02) { tone(c, d, t, 392 * p, 587 * p, 'sine', 0.11 * g * e, 0.008, 0.26); tone(c, d, t, 784 * p, 1174 * p, 'sine', 0.04 * g * e, 0.008, 0.3); }
  },
  morph: (c, d, t, g) => {
    // a rising sweep of noise (the drop forming, the loop closing)
    burst(c, d, t, 260, 1.4, 0.09 * g, 2.6, 3200);
  },
  transition: (c, d, t, g) => {
    // the chain's handover, 1996 into 2026: a sweep and a square-ish saw that die away while a soft D-A-D chord swells in
    // underneath and fades slowly, all finished or fading before the first node arrives, so each node is heard on its own
    burst(c, d, t, 260, 1.4, 0.05 * g, 1.8, 3200);
    const saw = c.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = snap(146.8);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(1400, t + 1.4);
    const sg = c.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.05 * g, t + 0.35); sg.gain.linearRampToValueAtTime(0.0001, t + 1.4);
    saw.connect(lp); lp.connect(sg); sg.connect(d); saw.start(t); saw.stop(t + 1.5);
    [146.8, 220, 293.7].forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = snap(f);
      const og = c.createGain(); og.gain.setValueAtTime(0.0001, t + 0.2); og.gain.linearRampToValueAtTime((0.06 - i * 0.012) * g, t + 1.2); og.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      o.connect(og); og.connect(d); o.start(t + 0.2); o.stop(t + 3.7);
    });
  },
  stamp: (c, d, t, g, p, e) => {
    tone(c, d, t, 180 * p, 70 * p, 'sine', 0.24 * g, 0.002, 0.16 + 0.22 * e);
    burst(c, d, t, 900, 0.8, 0.09 * g * (1 - e), 0.05);
    if (e > 0.02) tone(c, d, t, 320 * p, 160 * p, 'sine', 0.06 * g * e, 0.004, 0.55);
  },
};
