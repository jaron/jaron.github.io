// The PROBLEM beat: a bold statement slammed in word by word, and one line on why it is hard.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog } from '../engine/util';
import { ruledSheet, wrap } from './draw';
import type { Cue, Local, SceneContent } from './types';

const WORD_AT = 0.18;       // first word, seconds into the beat
const WORD_GAP = 0.22;      // between words
const WHY_AT = 2.4;

export class ProblemBeat {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  constructor(private content: SceneContent, private problem: NonNullable<SceneContent['problem']>, private ctx: SceneCtx) {}

  private words() { return this.problem.text.split(' '); }

  render(_f: Frame, out: THREE.WebGLRenderTarget, local: Local) {
    const { renderer, comp } = this.ctx;
    const { lt } = local;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    ruledSheet(lb);

    // figure label + scene marker
    c.textBaseline = 'alphabetic';
    c.font = font(F.mono(500), 18);
    c.letterSpacing = '4px';
    c.fillStyle = rgba('signal', clamp(lt * 3));
    c.fillText(this.content.figure, 96, 140);
    c.fillStyle = rgba('ash', clamp(lt * 3));
    const n = `${String(this.content.number).padStart(2, '0')} / ${String(this.content.total).padStart(2, '0')}`;
    c.textAlign = 'right';
    c.fillText(n, 1920 - 96, 140);
    c.textAlign = 'left';
    c.letterSpacing = '0px';
    lb.seg2(96, 168, 96 + 1728 * ease.outExpo(prog(lt, 0, 0.8)), 168, 1, LIN.bone, 0.35);

    // statement: Archivo 900, wrapped, one word per hit
    const words = this.words();
    const size = 132, lineH = 150;
    c.font = font(F.archivo(100, 900), size);
    const lines = wrap(c, this.problem.text, 1500, lineH, 470);
    let wi = 0;
    for (const line of lines) {
      const lw = line.text.split(' ');
      let x = 96;
      for (let k = 0; k < lw.length; k++) {
        const at = WORD_AT + wi * WORD_GAP;
        const p = prog(lt, at, at + 0.35, ease.outExpo);
        if (p > 0) {
          const slam = 1 - p;
          c.save();
          c.globalAlpha = clamp(p * 2);
          c.font = font(F.archivo(100 + slam * 12, 900), size);
          c.fillStyle = wi === words.length - 1 ? rgba('signal', 1) : rgba('bone', 1);
          c.fillText(lw[k]!, x, line.y + slam * 36);
          c.restore();
        }
        c.font = font(F.archivo(100, 900), size);
        x += c.measureText(lw[k]! + ' ').width;
        wi++;
      }
    }

    // why it is hard
    const wp = prog(lt, WHY_AT, WHY_AT + 0.6, ease.outCubic);
    if (wp > 0) {
      const why = this.problem.why;
      const shown = why.slice(0, Math.floor(why.length * prog(lt, WHY_AT, WHY_AT + 1.4)));
      c.font = font(F.mono(400), 26);
      c.fillStyle = rgba('ash', wp);
      c.fillText(shown, 96, 900);
      lb.seg2(96, 862, 96 + 80 * wp, 862, 2, LIN.signal, wp);
    }

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(): Cue[] {
    const n = this.words().length;
    const cues: Cue[] = [];
    for (let i = 0; i < n; i++) cues.push({ t: WORD_AT + i * WORD_GAP, voice: 'stamp', gain: i === n - 1 ? 0.9 : 0.55 });
    cues.push({ t: WHY_AT, voice: 'reveal', gain: 0.5 });
    return cues;
  }
}
