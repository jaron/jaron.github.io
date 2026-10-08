// The mix: every sound goes through a short synthetic room (a seeded noise reverb, so it is the same every run), then a
// master gain and a limiter. Shared by the live player and the offline render, so what is measured is what is heard.
export const MASTER = 0.5;

/** A stereo impulse response: noise that fades away exponentially and gets darker as it goes, like a small bright room. */
function impulse(ctx: BaseAudioContext, seconds = 1.7, decay = 0.4): AudioBuffer {
  const rate = ctx.sampleRate, n = Math.floor(seconds * rate);
  const buf = ctx.createBuffer(2, n, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let s = 987654321 + ch * 7919, lp = 0, energy = 0;
    for (let i = 0; i < n; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const white = s / 0x7fffffff - 1, t = i / rate;
      const a = 0.85 - 0.7 * Math.min(1, t / seconds);                  // the tail gets darker
      lp += (white - lp) * a;
      const v = lp * Math.exp(-t / decay) * (1 - Math.exp(-t / 0.012));   // soft onset, then decay
      d[i] = v; energy += v * v;
    }
    const norm = 1 / Math.sqrt(energy);
    for (let i = 0; i < n; i++) d[i] *= norm;
  }
  return buf;
}

export interface Mix {
  /** A node to connect one sound to: dry to the master, and `send` (0..1) of it into the room. */
  input(send: number, pan?: number): AudioNode;
}

export function createMix(ctx: BaseAudioContext, destination: AudioNode): Mix {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14; limiter.ratio.value = 12; limiter.attack.value = 0.002; limiter.release.value = 0.12;
  const master = ctx.createGain();
  master.gain.value = MASTER;
  master.connect(limiter); limiter.connect(destination);
  const room = ctx.createConvolver();
  room.buffer = impulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  room.connect(wet); wet.connect(master);
  return {
    input(send, pan) {
      const dry = ctx.createGain();
      dry.connect(master);
      if (send > 0.001) { const s = ctx.createGain(); s.gain.value = send; dry.connect(s); s.connect(room); }
      if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(dry); return p; }
      return dry;
    },
  };
}
