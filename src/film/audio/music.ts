// The outro's music: one audio file, played at a fixed moment of the film, only when the viewer has sound on.
// It follows the film's clock: it starts (or restarts from the right place) after a seek, a pause or turning sound on,
// and stops with a short fade when the film pauses, is muted, or leaves the music's window.
export class Music {
  private buf: AudioBuffer | null = null;
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;

  /** `start`: film time the music begins; `fadeIn` seconds to come up; `level`: linear gain. */
  constructor(private ctx: AudioContext, private url: string, private start: number, private fadeIn: number, private level: number) {}

  async load() {
    if (this.buf) return;
    const data = await (await fetch(this.url)).arrayBuffer();
    this.buf = await this.ctx.decodeAudioData(data);
  }

  update(t: number, playing: boolean, seeked: boolean, muted: boolean) {
    const b = this.buf;
    if (!b) return;
    const inside = t >= this.start && t < this.start + b.duration - 0.05;
    if (!playing || muted || !inside) { this.stop(); return; }
    if (this.src && !seeked) return;
    this.stop();
    const offset = t - this.start, now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = b;
    const g = this.ctx.createGain();
    const k = Math.min(1, offset / this.fadeIn), w = k * k * (3 - 2 * k);
    g.gain.setValueAtTime(this.level * w, now);
    if (offset < this.fadeIn) g.gain.linearRampToValueAtTime(this.level, now + (this.fadeIn - offset));
    src.connect(g); g.connect(this.ctx.destination);       // after the master chain: the music is its own, already-mixed level
    src.start(now, Math.max(0, offset));
    this.src = src; this.gain = g;
  }

  stop() {
    if (!this.src || !this.gain) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(0, now, 0.05);
    this.src.stop(now + 0.4);
    this.src = null; this.gain = null;
  }
}
