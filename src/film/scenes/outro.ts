// The outro: plain pages of text, each appearing word by word, holding, and clearing completely before the next.
// The last page ends the film and stays on screen. Everything is a pure function of time.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, prog } from '../engine/util';
import type { Cue } from '../core/types';
import { OUTRO, outroTimes, wordTimes } from '../data/outro';

interface Placed { w: string; x: number; y: number; t: number; emphasis?: 'past' | 'present' | 'coda' }
const MAX_W = 1560, LEFT = 96, TOP = 330;

export default class Outro extends Scene {
  private lb = new LineBatch(800, { blend: 'add' });
  private text = new Layer2D();
  private pages: Placed[][] = [];
  private times = outroTimes();

  init() {
    // lay each page out once: greedy word wrap, emphasised words set heavier
    const c = this.text.ctx;
    OUTRO.pages.forEach((p) => {
      const placed: Placed[] = [];
      const wt = wordTimes(p);
      let wi = 0;
      let x = LEFT, y = TOP, endX = LEFT;                  // endX: where the last word ended, before its trailing space
      const lh = Math.round(p.size * 1.32);
      p.runs.forEach((run, ri) => {
        const toks = run.text.split(/[ \t\r\n]+/).filter(Boolean);     // a non-breaking space keeps words together
        if (run.newParagraph) { x = LEFT; y += lh * 2; endX = LEFT; }
        toks.forEach((w, ti) => {
          c.font = font(F.archivo(100, run.emphasis ? 800 : 600), p.size);
          // a run that starts without a space (a comma straight after an emphasised phrase) attaches to the word before it
          if (ri > 0 && ti === 0 && !/^\s/.test(run.text) && !/\s$/.test(p.runs[ri - 1]!.text)) x = endX;
          const wd = c.measureText(w + ' ').width;
          if (x + c.measureText(w).width > LEFT + MAX_W) { x = LEFT; y += lh; }
          placed.push({ w, x, y, t: wt[wi++]!, emphasis: run.emphasis });
          endX = x + c.measureText(w).width;
          x += wd;
        });
      });
      this.pages.push(placed);
    });
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const lt = f.lt;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';

    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
    c.fillText(OUTRO.label, 96, 140); c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    OUTRO.pages.forEach((p, i) => {
      const tm = this.times[i]!;
      if (lt < tm.start || lt >= tm.end) return;
      const lp = lt - tm.start;
      const clear = tm.last ? 0 : ease.inOutCubic(prog(lt, tm.clearAt, tm.clearAt + OUTRO.fade));
      const keep = 1 - clear;
      this.pages[i]!.forEach((wd) => {
        const t0 = wd.t;
        const a = prog(lp, t0, t0 + 0.24, ease.outCubic) * keep;
        if (a <= 0) return;
        c.save(); c.globalAlpha = a;
        c.font = font(F.archivo(100, wd.emphasis ? 800 : 600), p.size);
        c.fillStyle = wd.emphasis === 'past' ? rgba('signal', 1) : wd.emphasis === 'present' ? rgba('claude', 1) : wd.emphasis === 'coda' ? rgba('bone', 1) : rgba('bone', 0.96);
        c.fillText(wd.w, wd.x, wd.y + (1 - a) * 14);
        c.restore();
      });
    });

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
    // it fades up from black like every scene, and it does not fade out: the film ends on its last page
    const fade = 1 - ease.outCubic(prog(lt, 0, 0.45));
    return { bloom: 0.5, halation: 0.1, fade };
  }

  /** sound cues in film time: soft ticks as the words arrive, a lift on each emphasised phrase */
  cues(start: number): Cue[] {
    const cues: Cue[] = [];
    OUTRO.pages.forEach((p, i) => {
      const tm = this.times[i]!;
      this.pages[i]!.forEach((wd, k) => {
        const t = start + tm.start + wd.t;
        if (k % 2 === 0) cues.push({ t, voice: 'type', gain: 0.16 });
        if (wd.emphasis && (k === 0 || !this.pages[i]![k - 1]!.emphasis)) cues.push({ t, voice: 'reveal', gain: 0.4, pitch: wd.emphasis === 'present' ? 1.1 : wd.emphasis === 'coda' ? 0.8 : 0.9 });
      });
      void p;
    });
    const last = this.times[this.times.length - 1]!;
    cues.push({ t: start + last.typedEnd, voice: 'stamp', gain: 0.5, pitch: 0.9 });
    return cues.sort((a, b) => a.t - b.t);
  }
}
