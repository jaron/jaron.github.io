// The BRIDGE beat: a short first-person lead-in that says why the next scene matters, in the same register as
// the supervisor's challenge in the cold open. Words appear one by one; the key phrase lands in signal blue.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog } from '../engine/util';
import { wrap } from './draw';
import type { Cue, Local, SceneContent } from './types';

const FROM = 0.4;       // first word
const GAP = 0.13;       // between words
const SIZE = 66;

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
    let wi = 0, pos = 0;
    for (const line of lines) {
      let x = 96;
      for (const w of line.text.split(' ')) {
        const p = prog(lt, FROM + wi * GAP, FROM + wi * GAP + 0.22, ease.outCubic);
        const isEmp = pos >= empStart;
        if (p > 0) {
          c.save(); c.globalAlpha = p;
          c.font = font(F.archivo(100, isEmp ? 800 : 600), SIZE);
          c.fillStyle = isEmp ? rgba('signal', 1) : rgba('bone', 0.96);
          c.fillText(w, x, line.y + (1 - p) * 16);
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
    const n = this.content.bridge.text.split(' ').length;
    const cues: Cue[] = [];
    for (let i = 0; i < n; i += 2) cues.push({ t: FROM + i * GAP, voice: 'type', gain: 0.2 });
    cues.push({ t: FROM + (n - 1) * GAP, voice: 'reveal', gain: 0.45 });
    return cues;
  }
}
