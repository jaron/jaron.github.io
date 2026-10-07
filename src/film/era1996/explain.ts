// 1996 beat, scene 6: the program shows its working (thesis §5.8, Fig 5.8, the "Explain window"), redrawn in the film's
// type. The copper bar from scene 1: the answer, then each formula in the order it was used with where every value
// came from. The formula in the knowledge base was missing a square (pi where Euler's formula has pi squared), so the
// first answer is the program's real, wrong one; the film then checks the working, fixes the formula on screen and
// recomputes. A short failure report closes the beat. Numbers are computed here from the data, never typed in.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, lerp, prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

type Src = 'given' | 'kb' | 'above';
interface Data {
  label: string; source: string;
  problem: { material: string; geometry: string };
  inputs: { r: number; l: number; E: number };
  legend: { key: Src; label: string }[];
  times: Record<'problem' | 'solution' | 'explanation' | 'step1' | 'step1Value' | 'step2' | 'kb' | 'above' | 'given' | 'check' | 'pulse' | 'morph' | 'recompute' | 'fadeReport' | 'failure', number>;
  callout: { head: string; lines: string[] };
  failure: { title: string; problem: string; result: string; why: string; supply: string; note: string };
  captions: { t: number; text: string }[];
}

const PANEL = { x: 96, y: 226, w: 1154, h: 664 };
const RIGHT_X = 1320;
const TAG_COL: Record<Src, [string, string]> = { given: ['bone', 'bone'], kb: ['signal', 'signal'], above: ['ember', 'ember'] };
const TAG_TXT: Record<Src, string> = { given: 'GIVEN', kb: 'FROM THE KNOWLEDGE BASE', above: 'WORKED OUT ABOVE' };

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sci = (v: number, d = 2) => {
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / Math.pow(10, e);
  return `${m.toFixed(d)} × 10${String(e).split('').map((ch) => SUP[ch] ?? ch).join('')}`;
};
const rectPts = (x: number, y: number, w: number, h: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];

export default class ExplainRenderer implements Era1996Renderer {
  private lb = new LineBatch(2500, { blend: 'add' });
  private text = new Layer2D();
  private d!: Data;
  private ctx!: SceneCtx;
  private I = 0; private wrong = 0; private right = 0;

  init(content: SceneContent, ctx: SceneCtx) {
    this.d = content.era1996.data as unknown as Data;
    this.ctx = ctx;
    const { r, l, E } = this.d.inputs;
    this.I = Number(((Math.PI / 4) * Math.pow(r, 4)).toPrecision(3));     // the report shows I to 3 figures and uses that value
    this.wrong = (Math.PI * E * this.I) / (l * l);              // what the knowledge base's formula gave
    this.right = (Math.PI * Math.PI * E * this.I) / (l * l);    // Euler's formula: pi squared
  }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
    const { renderer, comp } = this.ctx;
    const d = this.d, t = d.times;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';
    ruledSheet(lb, 0.05);
    const sig = LIN.signal;

    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('bone', 1);
    c.fillText('1996', 96, 140); c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    // the report fades out completely before the failure report appears
    const ra = 1 - ease.inOutCubic(prog(lt, t.fadeReport, t.fadeReport + 0.6));
    const fa = ease.inOutCubic(prog(lt, t.failure, t.failure + 0.6));

    if (ra > 0.002) this.drawReport(lb, c, lt, ra, sig);
    if (fa > 0.002) this.drawFailure(lb, c, lt, fa);

    // caption
    let cap: { t: number; text: string } | null = null;
    for (const cc of d.captions) if (lt >= cc.t) cap = cc;
    if (cap) {
      const a = ease.outCubic(prog(lt, cap.t, cap.t + 0.3));
      c.save(); c.globalAlpha = a;
      c.font = font(F.archivo(100, 500), 34); c.fillStyle = rgba('bone', 1);
      for (const l of wrap(c, cap.text, 1728, 44, 962 + (1 - a) * 8)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  private drawReport(lb: LineBatch, c: CanvasRenderingContext2D, lt: number, ra: number, sig: [number, number, number]) {
    const d = this.d, t = d.times, { r, l, E } = d.inputs;
    const P = PANEL;
    const frameA = ease.outCubic(prog(lt, 0.2, 0.8)) * ra;
    // the window
    lb.polyline(rectPts(P.x, P.y, P.w, P.h), 1.4, sig, 0.6 * frameA);
    lb.seg2(P.x, P.y + 38, P.x + P.w, P.y + 38, 1, sig, 0.4 * frameA);
    c.save(); c.globalAlpha = frameA;
    c.font = font(F.mono(500), 14); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
    c.fillText('EXPLAIN WINDOW', P.x + 20, P.y + 26);
    c.textAlign = 'right'; c.fillText(d.label, P.x + P.w - 20, P.y + 26); c.restore();

    const X = P.x + 36;
    const heading = (s: string, y: number, at: number) => {
      const a = ease.outCubic(prog(lt, at, at + 0.4)) * ra;
      if (a <= 0) return;
      c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 15); c.letterSpacing = '5px'; c.fillStyle = rgba('signal', 1);
      c.fillText(s, X, y); c.restore();
    };
    const line = (label: string, value: string, y: number, at: number, hot = false) => {
      const a = ease.outCubic(prog(lt, at, at + 0.35)) * ra;
      if (a <= 0) return;
      c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 22);
      c.fillStyle = rgba('ash', 1); c.fillText(label, X + 24, y);
      c.fillStyle = rgba(hot ? 'ember' : 'bone', 1); c.fillText(value, X + 24 + c.measureText(label + '  ').width, y);
      c.restore();
    };

    // problem definition
    heading('PROBLEM DEFINITION', P.y + 86, t.problem);
    line('Material', d.problem.material, P.y + 124, t.problem + 0.3);
    line('Geometry', d.problem.geometry, P.y + 160, t.problem + 0.6);

    // the answer
    heading('SOLUTION', P.y + 214, t.solution - 0.3);
    const sa = ease.outCubic(prog(lt, t.solution, t.solution + 0.4)) * ra;
    if (sa > 0) {
      c.save(); c.globalAlpha = sa; c.font = font(F.mono(500), 22); c.fillStyle = rgba('ash', 1);
      c.fillText('Answer computed:', X + 24, P.y + 258);
      const x0 = X + 24 + c.measureText('Answer computed:  ').width;
      this.replaced(c, `P = ${sci(this.wrong)} N`, `P = ${sci(this.right)} N`, x0, P.y + 258, lt, 30, 'left');
      c.restore();
    }
    lb.seg2(P.x + 20, P.y + 288, P.x + P.w - 20, P.y + 288, 1, LIN.graphite, 0.5 * sa);

    // the explanation
    heading('EXPLANATION', P.y + 326, t.explanation);
    const R = P.x + P.w - 36;
    const step = (y: number, at: number, formula: () => void, resultOld: string, resultNew: string | null) => {
      const a = ease.outCubic(prog(lt, at, at + 0.45)) * ra;
      if (a <= 0) return;
      c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 20); c.fillStyle = rgba('ash', 1);
      c.fillText('Using the formula:', X + 24, y);
      formula();
      c.restore();
      c.save(); c.globalAlpha = a;
      this.replaced(c, resultOld, resultNew, R, y, lt, 22, 'right');
      c.restore();
    };
    const tag = (src: Src, text: string, y: number, at: number) => {
      const a = ease.outCubic(prog(lt, at, at + 0.4)) * ra;
      if (a <= 0) return;
      c.save(); c.globalAlpha = a;
      c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba(TAG_COL[src][0], 1);
      c.textAlign = 'right'; c.fillText(TAG_TXT[src], X + 24 + 360, y); c.textAlign = 'left'; c.letterSpacing = '0px';
      c.font = font(F.mono(500), 22); c.fillStyle = rgba('bone', 1); c.fillText(text, X + 24 + 392, y);
      c.restore();
    };
    // step 1: the second moment of area
    const y1 = P.y + 376;
    step(y1, t.step1, () => { c.font = font(F.mono(500), 26); c.fillStyle = rgba('bone', 1); c.fillText('I = (π/4) r⁴', X + 24 + 236, y1); }, `I = ${sci(this.I)} m⁴`, null);
    tag('given', `r = ${r} m`, y1 + 38, t.step1Value);
    // step 2: the critical load
    const y2 = P.y + 484;
    step(y2, t.step2, () => this.formula2(c, X + 24 + 236, y2, lt), `P = ${sci(this.wrong)} N`, `P = ${sci(this.right)} N`);
    tag('kb', `E = ${sci(E, 1)} Pa`, y2 + 38, t.kb);
    tag('above', `I = ${sci(this.I)} m⁴`, y2 + 76, t.above);
    tag('given', `l = ${l} m`, y2 + 114, t.given);

    // the key, on the right
    const ka = ease.outCubic(prog(lt, t.step1 - 0.2, t.step1 + 0.4)) * ra;
    if (ka > 0) {
      c.save(); c.globalAlpha = ka;
      c.font = font(F.mono(500), 14); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText('WHERE EACH VALUE CAME FROM', RIGHT_X, P.y + 40);
      d.legend.forEach((k, i) => {
        c.font = font(F.mono(500), 15); c.letterSpacing = '3px'; c.fillStyle = rgba(TAG_COL[k.key][0], 1);
        c.fillText(k.label, RIGHT_X + 34, P.y + 90 + i * 44);
        lb.seg2(RIGHT_X + 8, P.y + 85 + i * 44, RIGHT_X + 8.01, P.y + 85 + i * 44, 12, LIN[TAG_COL[k.key][1] as 'bone' | 'signal' | 'ember'], 0.95 * ka);
      });
      c.restore();
    }

    // the check, thirty years later
    const ca = ease.outCubic(prog(lt, t.check, t.check + 0.6)) * ra;
    if (ca > 0) {
      const bx = RIGHT_X - 10, by = P.y + 270, bw = 514, bh = 300;
      lb.polyline(rectPts(bx, by, bw, bh), 1.6, LIN.ember, 0.8 * ca);
      c.save(); c.globalAlpha = ca;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ember', 1);
      c.fillText(d.callout.head, bx + 24, by + 44); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 28); c.fillStyle = rgba('bone', 1);
      let yy = by + 96;
      d.callout.lines.forEach((ln, i) => {
        const la = ease.outCubic(prog(lt, t.check + 0.4 + i * 0.5 + (i >= 1 ? t.morph - t.check - 1.0 : 0), t.check + 0.8 + i * 0.5 + (i >= 1 ? t.morph - t.check - 1.0 : 0)));
        c.globalAlpha = ca * la;
        for (const w of wrap(c, ln, bw - 48, 36, yy)) { c.fillText(w.text, bx + 24, w.y); yy = w.y + 36; }
        yy += 14;
      });
      c.restore();
    }
  }

  /** the second formula, with the missing square added on screen at `morph` */
  private formula2(c: CanvasRenderingContext2D, x: number, y: number, lt: number) {
    const t = this.d.times;
    const pulse = ease.inOutCubic(prog(lt, t.pulse, t.pulse + 0.5)) * (1 - ease.inOutCubic(prog(lt, t.morph - 0.2, t.morph + 0.3)));
    const sq = ease.outBack ? ease.outBack(prog(lt, t.morph, t.morph + 0.5)) : ease.outCubic(prog(lt, t.morph, t.morph + 0.5));
    const flash = 1 - ease.outCubic(prog(lt, t.morph + 0.2, t.morph + 1.4));
    c.font = font(F.mono(500), 26);
    const a = 'P = ', pi = 'π', rest = ' E I / l²';
    const wa = c.measureText(a).width, wpi = c.measureText(pi).width;
    const sw = 17;     // width reserved for the square
    c.fillStyle = rgba('bone', 1); c.fillText(a, x, y);
    c.fillStyle = rgba(pulse > 0.02 || flash > 0.02 ? 'ember' : 'bone', 1);
    c.fillText(pi, x + wa, y);
    if (pulse > 0.02) {                                   // a ring around the pi
      c.strokeStyle = rgba('ember', pulse); c.lineWidth = 2;
      c.strokeRect(x + wa - 8, y - 28, wpi + 16, 40);
    }
    const k = Math.max(0, Math.min(1.2, sq));
    if (k > 0.01) { c.save(); c.font = font(F.mono(700), 20 + 12 * flash); c.fillStyle = rgba('ember', 1); c.globalAlpha = Math.min(1, k * 1.4); c.fillText('2', x + wa + wpi, y - 13); c.restore(); }
    c.font = font(F.mono(500), 26); c.fillStyle = rgba('bone', 1);
    c.fillText(rest, x + wa + wpi + sw * Math.min(1, k), y);
  }

  /** a value that gets replaced after the check: the old one struck through and dimmed, the new one beside it */
  private replaced(c: CanvasRenderingContext2D, oldT: string, newT: string | null, x: number, y: number, lt: number, size: number, align: 'left' | 'right') {
    const t = this.d.times;
    const k = newT ? ease.inOutCubic(prog(lt, t.recompute, t.recompute + 0.7)) : 0;
    c.font = font(F.mono(500), size);
    const wOld = c.measureText(oldT).width, wNew = newT ? c.measureText(newT).width : 0;
    if (align === 'left') {
      c.fillStyle = rgba('bone', 1 - 0.6 * k); c.fillText(oldT, x, y);
      if (k > 0) {
        c.fillStyle = rgba('ember', 0.9 * k); c.fillRect(x - 2, y - size * 0.32, wOld + 4, 3 * k);
        c.fillStyle = rgba('ember', k); c.fillText(newT!, x + wOld + 36, y);
      }
    } else {
      const xr = x;
      if (k > 0) {
        c.fillStyle = rgba('ember', k); c.textAlign = 'right'; c.fillText(newT!, xr, y);
        const xo = xr - wNew - 36;
        c.fillStyle = rgba('bone', 1 - 0.6 * k); c.fillText(oldT, xo, y);
        c.fillStyle = rgba('ember', 0.9 * k); c.fillRect(xo - wOld - 2, y - size * 0.32, wOld + 4, 3 * k);
        c.textAlign = 'left';
      } else { c.fillStyle = rgba('bone', 1); c.textAlign = 'right'; c.fillText(oldT, xr, y); c.textAlign = 'left'; }
    }
  }

  private drawFailure(lb: LineBatch, c: CanvasRenderingContext2D, lt: number, fa: number) {
    const f = this.d.failure, t0 = this.d.times.failure;
    const x = 360, y = 290, w = 1200, h = 480;
    lb.polyline(rectPts(x, y, w, h), 1.4, LIN.signal, 0.6 * fa);
    lb.seg2(x, y + 38, x + w, y + 38, 1, LIN.signal, 0.4 * fa);
    c.save(); c.globalAlpha = fa;
    c.font = font(F.mono(500), 14); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
    c.fillText(f.title, x + 20, y + 26); c.letterSpacing = '0px';
    const row = (label: string, value: string, yy: number, at: number, hot = false) => {
      const a = ease.outCubic(prog(lt, at, at + 0.4));
      c.save(); c.globalAlpha = fa * a;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1); c.fillText(label, x + 40, yy);
      c.letterSpacing = '0px'; c.font = font(F.mono(500), hot ? 40 : 28); c.fillStyle = rgba(hot ? 'ember' : 'bone', 1);
      c.fillText(value, x + 40, yy + (hot ? 60 : 44), w - 80);
      c.restore();
    };
    row('PROBLEM', f.problem, y + 96, t0 + 0.4);
    row('RESULT', f.result, y + 196, t0 + 1.2);
    row('WHY', f.why, y + 296, t0 + 2.0);
    row('TO TRY AGAIN, SUPPLY', f.supply, y + 396, t0 + 2.9, true);
    c.font = font(F.mono(400), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
    c.fillText(f.note, x + w - 20, y + h + 30);
    c.restore();
  }

  cues(): Cue[] {
    const t = this.d.times;
    const cues: Cue[] = [];
    cues.push({ t: 0.3, voice: 'reveal', gain: 0.4, pitch: 0.9 });
    for (const [k, v] of [[t.problem, 0.9], [t.solution, 1.1], [t.step1, 0.95], [t.step2, 1.0], [t.kb, 1.05], [t.above, 1.1], [t.given, 1.15]] as const)
      cues.push({ t: k, voice: 'step', gain: 0.35, pitch: v });
    cues.push({ t: t.solution + 0.2, voice: 'stamp', gain: 0.6, pitch: 0.9 });
    cues.push({ t: t.check, voice: 'reveal', gain: 0.4, pitch: 0.8 });
    cues.push({ t: t.pulse, voice: 'morph', gain: 0.4 });
    cues.push({ t: t.morph, voice: 'lock', gain: 0.7, pitch: 1.2 });
    cues.push({ t: t.recompute, voice: 'stamp', gain: 0.7, pitch: 1.0 });
    cues.push({ t: t.failure + 0.4, voice: 'reveal', gain: 0.4, pitch: 0.85 });
    cues.push({ t: t.failure + 2.9, voice: 'fail', gain: 0.5, pitch: 1.1 });
    void lerp;
    return cues.sort((a, b) => a.t - b.t);
  }
}
