// The bed: one very quiet, slowly moving drone under the film, so the silences between sounds have a floor. It has the
// same two characters as the sounds (1996: dry square waves behind a slowly moving filter; 2026: a soft pad of sines
// with a little shimmer), crossfades between them with the era, and moves its root note from scene to scene within
// the film's scale. It is silent under the title card, and fades out as the predictions end, so the parting
// thoughts begin in silence.
import type { SceneSpan } from '../core/controller';
import { outroTimes } from '../data/outro';
import type { Mix } from './mix';

export interface BedParams { level: number; e: number; root: number }
const BED_GAIN = 0.05;

const smooth = (x: number) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

/** Root note (Hz) per scene: open fifths on D, B, E and A (D major pentatonic), so the bed moves without clashing. Scenes 6 and 7 use A and D, which have the fewest scale notes a tone away. */
const ROOTS: Record<string, number> = {
  'cold-open': 146.83, 's01-understanding': 146.83, 's02-finding-knowledge': 123.47, 's03-dead-ends': 164.81,
  's04-tool-calling': 110.0, 's05-uncertainty': 146.83, 's06-showing-our-work': 110.0, 's07-where-knowledge-comes-from': 146.83, outro: 146.83,
};

export function makeBedAt(spans: SceneSpan[], eraAt: (t: number) => number): (t: number) => BedParams {
  const outro = spans.find((s) => s.id === 'outro');
  const pages = outroTimes();
  return (t) => {
    const s = spans.find((sp) => t >= sp.start && t < sp.end) ?? spans[spans.length - 1]!;
    const root = ROOTS[s.id] ?? 146.83, e = eraAt(t), lt = t - s.start;
    if (s.id === 'cold-open') return { level: ramp(lt, 4.2, 7.5) * 0.7, e, root };          // nothing under the title card
    if (s.id === 'outro' && outro) {
      // the bed stays under the three predictions and fades out over the last four seconds of the third, so it is gone
      // as the parting thoughts begin: a moment of silence before the music (see data/outro.ts MUSIC) fades in
      const p3 = outro.start + pages[2]!.end;
      const level = 0.8 * (1 - ramp(t, p3 - 4, p3));
      return { level: Math.max(0, level), e, root };
    }
    const b = s.beats?.find((x) => lt >= x.start && lt < x.end);
    const level = b?.name === 'bridge' ? 0.55 : b?.name === 'era1996' ? 0.75 : 0.85;       // the bed grows a little as a scene opens up
    return { level: level * ramp(lt, 0, 1.2), e, root };
  };
}

interface Bank { bg: GainNode; g96: GainNode; g26: GainNode; oscs: { osc: OscillatorNode; mult: number }[] }

/** The drone itself. Two identical banks of oscillators: when the root changes, the idle bank is tuned to the new root while
    silent and the two are crossfaded, so the pitch never slides through the notes in between (a glide would pass through
    notes outside the scale, and bends the intervals of the chord while it moves). */
export class Bed {
  private out: GainNode;
  private banks: [Bank, Bank];
  private active = 0;
  private root = 0;
  private first = true;

  constructor(private ctx: BaseAudioContext, mix: Mix) {
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.out.connect(mix.input(0.3));
    this.banks = [this.bank(), this.bank()];
  }

  private bank(): Bank {
    const ctx = this.ctx, oscs: Bank['oscs'] = [];
    const bg = ctx.createGain(); bg.gain.value = 0; bg.connect(this.out);
    const add = (type: OscillatorType, mult: number, cents: number, amp: number, dest: AudioNode) => {
      const osc = ctx.createOscillator(); osc.type = type; osc.detune.value = cents;
      const g = ctx.createGain(); g.gain.value = amp;
      osc.connect(g); g.connect(dest); osc.start();
      oscs.push({ osc, mult });
    };
    // 1996: two square waves a fifth apart through a low-pass filter that breathes slowly
    const g96 = ctx.createGain(); g96.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const depth = ctx.createGain(); depth.gain.value = 130;
    lfo.connect(depth); depth.connect(lp.frequency); lfo.start();
    lp.connect(g96); g96.connect(bg);
    for (const [mult, cents] of [[1, 0], [1.5, 2]] as const) add('square', mult, cents, 0.5, lp);
    // 2026: a pad of sines (root, octave, fifth), each doubled a few cents apart for shimmer, with a slow swell
    const g26 = ctx.createGain(); g26.gain.value = 0;
    const swell = ctx.createGain(); swell.gain.value = 0.85;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.06;
    const d2 = ctx.createGain(); d2.gain.value = 0.15;
    lfo2.connect(d2); d2.connect(swell.gain); lfo2.start();
    swell.connect(g26); g26.connect(bg);
    for (const [mult, cents, a] of [[1, -3, 0.4], [1, 3, 0.4], [2, -3, 0.28], [2, 3, 0.28], [3, 0, 0.22]] as const) add('sine', mult, cents, a, swell);
    return { bg, g96, g26, oscs };
  }

  /** Move toward these parameters, from `when`, with time constant `tc` seconds (the first call jumps there). */
  set(p: BedParams, when: number, tc: number) {
    const to = (param: AudioParam, v: number, t = tc) => { if (this.first) param.setValueAtTime(v, when); else param.setTargetAtTime(v, when, t); };
    const tune = (b: Bank, root: number) => { for (const { osc, mult } of b.oscs) osc.frequency.setValueAtTime(root * mult, when); };
    if (this.first) {
      tune(this.banks[0], p.root); tune(this.banks[1], p.root);
      this.banks[0].bg.gain.setValueAtTime(1, when); this.banks[1].bg.gain.setValueAtTime(0, when);
      this.root = p.root;
    } else if (Math.abs(p.root - this.root) > 0.5) {
      const next = 1 - this.active;
      tune(this.banks[next]!, p.root);                                         // the idle bank is silent, so it can jump
      this.banks[next]!.bg.gain.setTargetAtTime(1, when, 0.55);
      this.banks[this.active]!.bg.gain.setTargetAtTime(0, when, 0.55);
      this.active = next; this.root = p.root;
    }
    to(this.out.gain, p.level * BED_GAIN);
    for (const b of this.banks) { to(b.g96.gain, 1 - p.e); to(b.g26.gain, p.e); }
    this.first = false;
  }

  /** Fade the bed out (for pause and mute). */
  silence(when: number, tc = 0.2) { this.out.gain.setTargetAtTime(0, when, tc); }
}
