// The BRIDGE beat: a short first-person lead-in that says why the next scene matters, in the same register as
// the supervisor's challenge in the cold open. It fades in a clause at a time (split at punctuation); the key phrase
// lands in signal blue.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog } from '../engine/util';
import { wrap } from './draw';
import { clauseTimes, CLAUSE_FADE } from './reveal';
import type { Cue, Local, SceneContent } from './types';

const FROM = 0.4;       // first clause
const WORD = 0.1;       // how long the next clause waits, per word of the clause before it ...
const MIN_GAP = 0.5;    // ... but never less than this
const SIZE = 66;

/** When each word of a bridge appears: every word of a clause shares one time. */
export const bridgeTimes = (text: string) => clauseTimes(text, FROM, WORD, MIN_GAP);
/** Seconds into the beat at which the whole bridge is on screen. */
export const bridgeComplete = (text: string) => { const t = bridgeTimes(text); return t[t.length - 1]! + CLAUSE_FADE; };

export class BridgeBeat {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  constructor(private content: SceneContent, private ctx: SceneCtx) {}

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
    const { renderer, comp } = this.ctx;
    const { text, emphasis } = this.content.bridge;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';

    // which problem this is
    c.font = font(F.mono(500), 18); c.letterSpacing = '4px';
    c.fillStyle = rgba('signal', clamp(lt * 4));
    c.fillText(`${String(this.content.number).padStart(2, '0')} · ${this.content.title.toUpperCase()}`, 96, 140);
    c.letterSpacing = '0px';
    lb.seg2(96, 168, 96 + 1728 * ease.outExpo(prog(lt, 0, 0.7)), 168, 1, LIN.bone, 0.35);

    c.font = font(F.archivo(100, 600), SIZE);
    const lines = wrap(c, text, 1560, 100, 400);
    const empStart = emphasis ? text.indexOf(emphasis) : Infinity;
    const times = bridgeTimes(text);
    let wi = 0, pos = 0;
    for (const line of lines) {
      let x = 96;
      for (const w of line.text.split(' ')) {
        const p = prog(lt, times[wi]!, times[wi]! + CLAUSE_FADE, ease.outCubic);
        const isEmp = pos >= empStart;
        if (p > 0) {
          c.save(); c.globalAlpha = p;
          c.font = font(F.archivo(100, isEmp ? 800 : 600), SIZE);
          c.fillStyle = isEmp ? rgba('signal', 1) : rgba('bone', 0.96);
          c.fillText(w, x, line.y + (1 - p) * 10);
          c.restore();
        }
        c.font = font(F.archivo(100, isEmp ? 800 : 600), SIZE);
        x += c.measureText(w + ' ').width;
        pos += w.length + 1; wi++;
      }
    }
    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(): Cue[] {
    const times = bridgeTimes(this.content.bridge.text);
    const cues: Cue[] = [];
    times.forEach((t, i) => { if (i === 0 || times[i - 1] !== t) cues.push({ t, voice: 'type', gain: 0.3 }); });
    cues.push({ t: times[times.length - 1]!, voice: 'reveal', gain: 0.45 });
    return cues;
  }
}
