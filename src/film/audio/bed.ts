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

/** Root note (Hz) per scene: open fifths that walk around D major pentatonic, so the bed moves without ever clashing. */
const ROOTS: Record<string, number> = {
  'cold-open': 146.83, 's01-understanding': 146.83, 's02-finding-knowledge': 123.47, 's03-dead-ends': 164.81,
  's04-tool-calling': 110.0, 's05-uncertainty': 146.83, 's06-showing-our-work': 123.47, 's07-where-knowledge-comes-from': 164.81, outro: 146.83,
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

export class Bed {
  private out: GainNode;
  private g96: GainNode;
  private g26: GainNode;
  private oscs: { osc: OscillatorNode; mult: number }[] = [];
  private first = true;

  constructor(private ctx: BaseAudioContext, mix: Mix) {
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.out.connect(mix.input(0.3));
    // 1996: two square waves a fifth apart through a low-pass filter that breathes slowly
    this.g96 = ctx.createGain(); this.g96.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const depth = ctx.createGain(); depth.gain.value = 130;
    lfo.connect(depth); depth.connect(lp.frequency); lfo.start();
    lp.connect(this.g96); this.g96.connect(this.out);
    for (const [mult, cents] of [[1, 0], [1.5, 4]] as const) this.add('square', mult, cents, 0.5, lp);
    // 2026: a pad of sines (root, octave, fifth), each doubled a few cents apart for shimmer, with a slow swell
    this.g26 = ctx.createGain(); this.g26.gain.value = 0;
    const swell = ctx.createGain(); swell.gain.value = 0.85;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.06;
    const d2 = ctx.createGain(); d2.gain.value = 0.15;
    lfo2.connect(d2); d2.connect(swell.gain); lfo2.start();
    swell.connect(this.g26); this.g26.connect(this.out);
    for (const [mult, cents, a] of [[1, -5, 0.4], [1, 5, 0.4], [2, -4, 0.28], [2, 4, 0.28], [3, 0, 0.22]] as const) this.add('sine', mult, cents, a, swell);
  }

  private add(type: OscillatorType, mult: number, cents: number, amp: number, dest: AudioNode) {
    const osc = this.ctx.createOscillator(); osc.type = type; osc.detune.value = cents;
    const g = this.ctx.createGain(); g.gain.value = amp;
    osc.connect(g); g.connect(dest); osc.start();
    this.oscs.push({ osc, mult });
  }

  /** Move toward these parameters, from `when`, with time constant `tc` seconds (the first call jumps there). */
  set(p: BedParams, when: number, tc: number) {
    const to = (param: AudioParam, v: number, t = tc) => { if (this.first) param.setValueAtTime(v, when); else param.setTargetAtTime(v, when, t); };
    to(this.out.gain, p.level * BED_GAIN);
    to(this.g96.gain, 1 - p.e);
    to(this.g26.gain, p.e);
    for (const { osc, mult } of this.oscs) to(osc.frequency, p.root * mult, 1.2);            // a change of root glides slowly
    this.first = false;
  }

  /** Fade the bed out (for pause and mute). */
  silence(when: number, tc = 0.2) { this.out.gain.setTargetAtTime(0, when, tc); }
}
