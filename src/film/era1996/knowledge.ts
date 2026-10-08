// 1996 beat, scene 7: everything the program knew was typed in by hand. The knowledge base as the thesis counts it
// (p.154: 142 quantities, 122 formulae, 110 property values, 21 geometrical models) is shown as four numbers, with the
// steps behind them underneath (fetch textbooks, find formulae, find constants, type them in) and one typed entry: the
// formula from scene 6, missing a square. The beat ends on a short explainer of Sutton's "bitter lesson" (2019): a
// schematic chart of why hand-built knowledge gave way to learning from data and computation.
// Categories, steps, timings, captions and the lesson are data (data/content/s07-where-knowledge-comes-from.ts).
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, lerp, prog } from '../engine/util';
import { fillBigText, wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

interface Category { id: string; label: string; count: number; color: 'signal' | 'bone' | 'ember' | 'ash' }
interface Data {
  label: string; source: string;
  categories: Category[];
  counterAt: number;
  steps: { head: string; gloss: string; at: number }[];
  entry: { text: string; at: number; flagAt: number };
  totalAt: number;
  fadeOut: number;
  lesson: {
    at: number; title: string; by: string; schematic: string;
    axisX: string; axisY: string;
    hand: { label: string; from: number; to: number };
    learned: { label: string; from: number; to: number };
    cross: { at: number; label: string };
    crossovers: { at: number; text: string };
    examples: { at: number; head: string; line: string }[];
  };
  captions: { t: number; text: string }[];
}

const COUNTER_Y = 372;
const STEP_Y = 476, STEP_H = 168, STEP_W = 372, STEP_GAP = 76;

const rectPts = (x: number, y: number, w: number, h: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];

export default class KnowledgeRenderer implements Era1996Renderer {
  private lb = new LineBatch(2500, { blend: 'add' });
  private text = new Layer2D();
  private d!: Data;
  private ctx!: SceneCtx;
  private total = 0;

  init(content: SceneContent, ctx: SceneCtx) {
    this.d = content.era1996.data as unknown as Data;
    this.ctx = ctx;
    this.total = this.d.categories.reduce((s, c) => s + c.count, 0);
  }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
    const { renderer, comp } = this.ctx;
    const d = this.d;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';

    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('bone', 1);
    c.fillText('1996', 96, 140); c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    // the lesson takes over once everything else has gone completely
    const out1 = ease.inOutCubic(prog(lt, d.fadeOut, d.fadeOut + 0.6));
    const qIn = ease.inOutCubic(prog(lt, d.lesson.at, d.lesson.at + 0.7));
    const keep = 1 - out1;

    if (keep > 0.002) {
      c.save(); c.globalAlpha = keep;
      c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
      c.fillText(d.label, 1824, 140); c.textAlign = 'left';
      c.font = font(F.mono(400), 14); c.letterSpacing = '3px';
      c.fillText(d.source, 96, 204); c.letterSpacing = '0px';
      c.restore();

      // the four numbers, counting up to what the thesis reports
      const ca = ease.outCubic(prog(lt, d.counterAt, d.counterAt + 0.5)) * keep;
      const cnt = ease.outCubic(prog(lt, d.counterAt, d.counterAt + 1.2));
      d.categories.forEach((cat, ci) => {
        const x = 96 + ci * 432;
        c.save(); c.globalAlpha = ca;
        c.fillStyle = rgba(cat.color, 1);
        fillBigText(c, String(Math.round(cat.count * cnt)), F.archivo(100, 900), 88, x, COUNTER_Y);
        c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba(cat.color, 0.9);
        c.fillText(cat.label, x, COUNTER_Y + 36); c.letterSpacing = '0px';
        c.restore();
        lb.seg2(x, COUNTER_Y + 52, x + 240, COUNTER_Y + 52, 2, LIN[cat.color], 0.5 * ca);
      });

      // the steps behind the numbers
      d.steps.forEach((st, i) => {
        const a = ease.outCubic(prog(lt, st.at, st.at + 0.5)) * keep;
        if (a <= 0) return;
        const x = 96 + i * (STEP_W + STEP_GAP);
        const lit = lt >= st.at && (i === d.steps.length - 1 || lt < d.steps[i + 1]!.at + 0.6);
        lb.polyline(rectPts(x, STEP_Y, STEP_W, STEP_H), lit ? 2.2 : 1.4, LIN.signal, (lit ? 0.95 : 0.55) * a);
        if (lit) lb.polyline(rectPts(x - 3, STEP_Y - 3, STEP_W + 6, STEP_H + 6), 6, LIN.signal, 0.18 * a);
        if (i > 0) {                                       // an arrow from the previous step
          const x0 = x - STEP_GAP + 12, x1 = x - 12, y = STEP_Y + STEP_H / 2, k = ease.outCubic(prog(lt, st.at - 0.3, st.at + 0.2));
          lb.seg2(x0, y, lerp(x0, x1, k), y, 2, LIN.signal, 0.8 * a);
          if (k > 0.95) { lb.seg2(x1, y, x1 - 12, y - 9, 2, LIN.signal, 0.8 * a); lb.seg2(x1, y, x1 - 12, y + 9, 2, LIN.signal, 0.8 * a); }
        }
        c.save(); c.globalAlpha = a;
        c.font = font(F.mono(500), 16); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
        c.fillText(`STEP ${i + 1}`, x + 24, STEP_Y + 40); c.letterSpacing = '0px';
        c.font = font(F.archivo(100, 800), 34); c.fillStyle = rgba('bone', 1);
        c.fillText(st.head, x + 24, STEP_Y + 88, STEP_W - 48);
        c.font = font(F.archivo(100, 500), 22); c.fillStyle = rgba('bone', 0.8);
        wrap(c, st.gloss, STEP_W - 48, 29, STEP_Y + 124).forEach((l) => c.fillText(l.text, x + 24, l.y));
        c.restore();
      });

      // the total, and one typed entry: the formula from scene 6
      const ta = ease.outCubic(prog(lt, d.totalAt, d.totalAt + 0.6)) * keep;
      if (ta > 0) {
        c.save(); c.globalAlpha = ta; c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('bone', 1);
        c.textAlign = 'right'; c.fillText(`${this.total} ENTRIES · EACH TYPED IN AND CHECKED BY HAND`, 1824, STEP_Y + STEP_H + 52); c.restore();
      }
      // beneath it, the same line of type again: what hand entry is like
      const e = d.entry;
      const ea = ease.outCubic(prog(lt, e.at - 0.3, e.at + 0.2)) * keep;
      if (ea > 0) {
        const ey = STEP_Y + STEP_H + 52 + 40;
        const full = e.text.toUpperCase();
        const n = Math.floor(full.length * prog(lt, e.at, e.at + 1.4));
        const flag = ease.outCubic(prog(lt, e.flagAt, e.flagAt + 0.4));
        const pulse = 0.5 + 0.5 * Math.sin((lt - e.flagAt) * 7);
        c.save(); c.globalAlpha = ea; c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.textAlign = 'left';
        const fw = c.measureText(full).width;
        const x0 = 1824 - fw;                                    // right-aligned like the line above, typed from its left end
        c.fillStyle = rgba(flag > 0.02 ? 'ember' : 'bone', 1);
        c.fillText(full.slice(0, n), x0, ey);
        if (n < full.length && Math.floor(lt * 4) % 2 === 0) { c.fillStyle = rgba('bone', 1); c.fillRect(x0 + c.measureText(full.slice(0, n)).width + 2, ey - 16, 10, 20); }
        c.restore();
        if (flag > 0.02) lb.polyline(rectPts(x0 - 14, ey - 26, fw + 28, 40), 2, LIN.ember, (0.55 + 0.45 * pulse) * flag * keep);
      }
    }

    // caption
    let cap: { t: number; text: string } | null = null;
    for (const cc of d.captions) if (lt >= cc.t) cap = cc;
    if (cap) {
      // the front half's captions go with it; the lesson's captions stay for the lesson
      const a = ease.outCubic(prog(lt, cap.t, cap.t + 0.3)) * (cap.t >= d.lesson.at - 0.5 ? 1 : 1 - out1);
      c.save(); c.globalAlpha = a;
      c.fillStyle = rgba('bone', 1);
      let size = 34;
      const paras = cap.text.split('\n');
      const lineCount = () => { c.font = font(F.archivo(100, 500), size); return paras.reduce((n, p) => n + wrap(c, p, 1728, 0, 0).length, 0); };
      while (size > 26 && lineCount() > 2) size -= 2;
      c.font = font(F.archivo(100, 500), size);
      let y = 962 + (1 - a) * 8;
      for (const para of paras) for (const l of wrap(c, para, 1728, size + 10, y)) { c.fillText(l.text, 96, l.y); y = l.y + size + 10; }
      c.restore();
    }

    // the bitter lesson, as a schematic chart
    if (qIn > 0.01) this.drawLesson(lb, c, lt, qIn);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  /** the chart: hand-built knowledge starts ahead and levels off; learning from data starts behind and keeps climbing */
  private drawLesson(lb: LineBatch, c: CanvasRenderingContext2D, lt: number, a: number) {
    const L = this.d.lesson;
    const X0 = 140, X1 = 1250, Y0 = 790, Y1 = 330;           // the axes' corners (x right, y up)
    const hand = (u: number) => 0.34 + 0.28 * (1 - Math.exp(-5 * u));
    const learned = (u: number) => 0.07 + 0.9 * Math.pow(u, 1.5);
    const px = (u: number) => X0 + u * (X1 - X0), py = (v: number) => Y0 - v * (Y0 - Y1);
    // title and source
    c.save(); c.globalAlpha = a;
    c.font = font(F.mono(500), 22); c.letterSpacing = '5px'; c.fillStyle = rgba('ash', 1);
    c.fillText(`${L.title} · ${L.by}`, 96, 276); c.letterSpacing = '0px';
    // axes
    lb.seg2(X0, Y0, X1, Y0, 1.6, LIN.bone, 0.7 * a); lb.seg2(X0, Y0, X0, Y1 - 10, 1.6, LIN.bone, 0.7 * a);
    c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
    c.textAlign = 'right'; c.fillText(L.axisX + ' →', X1, Y0 + 34);
    c.save(); c.translate(X0 - 22, Y0); c.rotate(-Math.PI / 2); c.textAlign = 'left'; c.letterSpacing = '2px'; c.fillText(L.axisY + ' →', 0, 0); c.restore();
    c.textAlign = 'left'; c.letterSpacing = '0px';
    c.font = font(F.mono(400), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 0.8);
    c.fillText(L.schematic, X0, Y0 + 62); c.letterSpacing = '0px';
    c.restore();

    const draw = (fn: (u: number) => number, from: number, to: number, col: [number, number, number], hex: 'signal' | 'claude', label: string, labelU: number, dy: number) => {
      const k = ease.inOutCubic(prog(lt, from, to));
      if (k <= 0) return;
      const pts: { x: number; y: number }[] = [];
      const N = 80;
      for (let i = 0; i <= Math.floor(N * k); i++) { const u = i / N; pts.push({ x: px(u), y: py(fn(u)) }); }
      if (pts.length > 1) { lb.polyline(pts, 3.2, col, 0.95 * a); lb.polyline(pts, 14, col, 0.16 * a); }
      const tip = pts[pts.length - 1]!;
      lb.seg2(tip.x, tip.y, tip.x + 0.01, tip.y, 16, col, 0.9 * a);
      const la = ease.outCubic(prog(lt, from + 0.2, from + 0.8));
      c.save(); c.globalAlpha = la * a; c.font = font(F.mono(500), 17); c.letterSpacing = '3px'; c.fillStyle = rgba(hex, 1); c.textAlign = 'left';
      c.fillText(label, px(labelU), py(fn(labelU)) + dy); c.restore();
    };
    draw(hand, L.hand.from, L.hand.to, LIN.signal, 'signal', L.hand.label, 0.24, -48);
    draw(learned, L.learned.from, L.learned.to, LIN.claude, 'claude', L.learned.label, 0.46, 60);

    // the crossover
    const cu = 0.7, cka = ease.outCubic(prog(lt, L.cross.at, L.cross.at + 0.5)) * a;
    if (cka > 0) {
      const x = px(cu), y = py(hand(cu));
      const pulse = 0.55 + 0.45 * Math.sin((lt - L.cross.at) * 6);
      lb.polyline(Array.from({ length: 25 }, (_, i) => ({ x: x + 22 * Math.cos((i / 24) * Math.PI * 2), y: y + 22 * Math.sin((i / 24) * Math.PI * 2) })), 2.4, LIN.ember, (0.6 + 0.4 * pulse) * cka);
      c.save(); c.globalAlpha = cka; c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ember', 1); c.textAlign = 'center';
      c.fillText(L.cross.label, x, y + 58); c.restore();
    }

    // a line above the example boxes, in the crossover's colour
    const xa = ease.outCubic(prog(lt, L.crossovers.at, L.crossovers.at + 0.6)) * a;
    if (xa > 0) {
      c.save(); c.globalAlpha = xa; c.font = font(F.archivo(100, 700), 25); c.fillStyle = rgba('ember', 1);
      wrap(c, L.crossovers.text, 484, 31, 262).forEach((l) => c.fillText(l.text, 1340, l.y));
      c.restore();
    }

    // the examples, on the right
    L.examples.forEach((e, i) => {
      const ea = ease.outCubic(prog(lt, e.at, e.at + 0.6)) * a;
      if (ea <= 0) return;
      const x = 1340, y = 318 + i * 192;
      lb.polyline([{ x, y }, { x: x + 484, y }, { x: x + 484, y: y + 176 }, { x, y: y + 176 }, { x, y }], 1.4, LIN.bone, 0.45 * ea);
      c.save(); c.globalAlpha = ea;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ember', 1); c.fillText(e.head, x + 24, y + 38); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 25); c.fillStyle = rgba('bone', 0.95);
      wrap(c, e.line, 436, 33, y + 82).forEach((l) => c.fillText(l.text, x + 24, l.y));
      c.restore();
    });
  }

  cues(): Cue[] {
    const d = this.d;
    const cues: Cue[] = [];
    cues.push({ t: d.counterAt, voice: 'reveal', gain: 0.35, pitch: 0.9 });
    d.steps.forEach((s, i) => cues.push({ t: s.at, voice: 'step', gain: 0.4, pitch: 0.8 + i * 0.1 }));
    for (let t = d.entry.at; t < d.entry.at + 1.4; t += 0.14) cues.push({ t, voice: 'type', gain: 0.14 });
    cues.push({ t: d.totalAt, voice: 'stamp', gain: 0.5, pitch: 0.9 });
    cues.push({ t: d.entry.flagAt, voice: 'fail', gain: 0.55, pitch: 1.2 });
    const L = d.lesson;
    cues.push({ t: L.at, voice: 'reveal', gain: 0.4, pitch: 0.85 });
    cues.push({ t: L.hand.from, voice: 'step', gain: 0.35, pitch: 0.9 });
    cues.push({ t: L.learned.from, voice: 'step', gain: 0.35, pitch: 1.1 });
    cues.push({ t: L.cross.at, voice: 'stamp', gain: 0.7, pitch: 1.0 });
    cues.push({ t: L.crossovers.at, voice: 'reveal', gain: 0.4, pitch: 1.1 });
    L.examples.forEach((e, i) => cues.push({ t: e.at, voice: 'lock', gain: 0.45, pitch: 1.0 + i * 0.12 }));
    return cues.sort((a, b) => a.t - b.t);
  }
}
