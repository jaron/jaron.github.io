// 1996 beat, scene 5: the film's raindrop again, but every value is a best guess with a lower and an upper bound
// (the thesis's triangular fuzzy number, ch. 6). Each row is one step of the calculation; its triangle is the previous
// row's, carried through the rule, and it widens. The arithmetic is the thesis's own: bounds are carried through
// multiplication. The measurement error (+-0.05 mm) is an assumption for illustration, and the screen says so.
// Rows, inputs, captions and the closing quote are data (data/content/s05-uncertainty.ts).
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, lerp, prog } from '../engine/util';
import { fillBigText, ruledSheet, wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

interface Tfn { lower: number; best: number; upper: number }
interface Row { id: string; name: string; rule: string; unit: string; scale: number; decimals: number; at: number }
interface Data {
  label: string; source: string;
  inputs: { diameter: Tfn; density: number; gravity: number };
  rows: Row[];
  bracket: number; quote: number;
  captions: { t: number; text: string }[];
  closing: { text: string; by: string };
}

const ROW_TOP = 232, ROW_H = 128;
const AX0 = 660, AX1 = 1480, SPAN = 0.2;              // the axis shows -20% .. +20% around each row's best guess
const PEAK = 76;
const VAL_X = 1530;

const map = (t: Tfn, f: (x: number) => number): Tfn => ({ lower: f(t.lower), best: f(t.best), upper: f(t.upper) });
const rectPts = (x: number, y: number, w: number, h: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];

export default class TrianglesRenderer implements Era1996Renderer {
  private lb = new LineBatch(4000, { blend: 'add' });
  private text = new Layer2D();
  private d!: Data;
  private ctx!: SceneCtx;
  private vals: Tfn[] = [];

  init(content: SceneContent, ctx: SceneCtx) {
    this.d = content.era1996.data as unknown as Data;
    this.ctx = ctx;
    const { diameter, density, gravity } = this.d.inputs;
    // each step applies the rule to all three values (all the rules here only multiply, so the bounds map directly)
    const radius = map(diameter, (x) => x / 2);                            // mm
    const volume = map(radius, (r) => (4 / 3) * Math.PI * Math.pow(r * 1e-3, 3));   // m^3
    const mass = map(volume, (v) => density * v);                          // kg
    const force = map(mass, (m) => m * gravity);                           // N
    this.vals = [diameter, radius, volume, mass, force];
  }

  private x(rel: number) { return AX0 + ((rel + SPAN) / (2 * SPAN)) * (AX1 - AX0); }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
    const { renderer, comp } = this.ctx;
    const d = this.d;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';
    ruledSheet(lb, 0.05);
    const sig = LIN.signal;

    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('bone', 1);
    c.fillText('1996', 96, 140);
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    // the closing quote takes over the screen at the end: the old screen goes fully, then the quote appears
    const q = ease.inOutCubic(prog(lt, d.quote - 0.6, d.quote));
    const qIn = ease.inOutCubic(prog(lt, d.quote + 0.1, d.quote + 0.8));
    const keep = 1 - q;

    // the label and the source line fade with the rest
    c.save(); c.globalAlpha = 1 - q;
    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
    c.fillText(d.label, 1824, 140); c.textAlign = 'left';
    c.font = font(F.mono(400), 14); c.letterSpacing = '3px';
    c.fillText(d.source, 96, 204); c.letterSpacing = '0px';
    c.restore();

    // column heading
    const ha = ease.outCubic(prog(lt, d.rows[0]!.at - 0.2, d.rows[0]!.at + 0.4)) * keep;
    c.save(); c.globalAlpha = ha; c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
    c.fillText('LOWER · BEST · UPPER', VAL_X, 224); c.restore();

    // rows
    d.rows.forEach((row, i) => {
      const top = ROW_TOP + i * ROW_H, base = top + 100;
      const reveal = ease.outCubic(prog(lt, row.at, row.at + 0.9));
      if (reveal <= 0) return;
      const next = d.rows[i + 1];
      const latest = !next || lt < next.at;
      const a = keep * (latest ? 1 : 0.62);
      const t = this.vals[i]!;
      const rl = t.lower / t.best - 1, ru = t.upper / t.best - 1;
      const cx = this.x(0), xl = this.x(rl), xu = this.x(ru);
      const k = reveal;

      // axis and the connector from the row above
      lb.seg2(AX0, base, AX1, base, 1, LIN.graphite, 0.5 * a * k);
      lb.seg2(cx, base - 5, cx, base + 5, 1.4, LIN.graphite, 0.8 * a * k);
      if (i > 0) lb.seg2(cx, base - ROW_H + 8, cx, base - ROW_H + 8 + (ROW_H - 8 - PEAK - 26) * k, 1.2, sig, 0.4 * a);

      // the triangle, growing out from its best guess
      const px = cx, py = base - PEAK;
      const lx = lerp(cx, xl, k), ux = lerp(cx, xu, k);
      lb.polyline([{ x: lx, y: base }, { x: px, y: py }, { x: ux, y: base }], latest ? 3 : 2, sig, 0.95 * a);
      if (latest) lb.polyline([{ x: lx, y: base }, { x: px, y: py }, { x: ux, y: base }], 12, sig, 0.18 * a);
      for (let hx = Math.ceil(lx / 7) * 7; hx <= ux; hx += 7) {         // a light hatch so the width reads as a shape
        const top2 = hx <= px ? lerp(base, py, (hx - lx) / Math.max(1, px - lx)) : lerp(py, base, (hx - px) / Math.max(1, ux - px));
        lb.seg2(hx, base, hx, top2, 1, sig, 0.13 * a);
      }
      lb.seg2(lx, base - 5, lx, base + 5, 1.6, sig, 0.9 * a * k); lb.seg2(ux, base - 5, ux, base + 5, 1.6, sig, 0.9 * a * k);

      c.save(); c.globalAlpha = a;
      // name and rule
      c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
      c.fillText(row.name, 96, top + 48); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 22); c.fillStyle = rgba('bone', 0.9);
      c.fillText(row.rule, 96, top + 82, AX0 - 130);
      // percentages at the ends of the base
      const pct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(rl === -ru ? 0 : 0)}%`;
      c.globalAlpha = a * k; c.font = font(F.mono(500), 13); c.fillStyle = rgba('ash', 1); c.textAlign = 'center';
      c.fillText(pct(rl), lx, base + 20); c.fillText(pct(ru), ux, base + 20);
      // the three values
      const f = (v: number) => (v * row.scale).toFixed(row.decimals);
      c.textAlign = 'left'; c.font = font(F.mono(500), 22); c.fillStyle = latest ? rgba('bone', 1) : rgba('bone', 0.85);
      c.fillText(`${f(t.lower)} · ${f(t.best)} · ${f(t.upper)}`, VAL_X, top + 62);
      c.font = font(F.mono(400), 14); c.letterSpacing = '2px'; c.fillStyle = rgba('ash', 1);
      c.fillText(row.unit, VAL_X, top + 86); c.letterSpacing = '0px';
      c.restore();
    });

    // the funnel: the diameter's bounds carried straight down, against where the force's bounds ended up
    const kb = ease.inOutCubic(prog(lt, d.bracket, d.bracket + 1.0));
    if (kb > 0) {
      const first = this.vals[0]!, last = this.vals[this.vals.length - 1]!;
      const yTop = ROW_TOP + 100, yBot = ROW_TOP + (d.rows.length - 1) * ROW_H + 100;
      const dl = this.x(first.lower / first.best - 1), du = this.x(first.upper / first.best - 1);
      const fl = this.x(last.lower / last.best - 1), fu = this.x(last.upper / last.best - 1);
      for (const [x0, x1] of [[dl, fl], [du, fu]] as const) {
        const ye = lerp(yTop, yBot, kb);
        const xe = lerp(x0, x1, kb);
        lb.seg2(x0, yTop, xe, ye, 1.6, LIN.ember, 0.8 * keep);
        lb.seg2(x0, yTop, xe, ye, 8, LIN.signal, 0.14 * keep);
      }
    }

    // caption
    let cap: { t: number; text: string } | null = null;
    for (const cc of d.captions) if (lt >= cc.t) cap = cc;
    if (cap && q < 0.99) {
      const a = ease.outCubic(prog(lt, cap.t, cap.t + 0.3)) * (1 - q);
      c.save(); c.globalAlpha = a;
      c.font = font(F.archivo(100, 500), 34); c.fillStyle = rgba('bone', 1);
      for (const l of wrap(c, cap.text, 1728, 44, 962 + (1 - a) * 8)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    // the closing quote
    if (qIn > 0.01) {
      c.save(); c.globalAlpha = qIn;
      c.fillStyle = rgba('bone', 1);
      const size = 64;
      c.font = font(F.archivo(100, 700), size);
      const lines = wrap(c, d.closing.text, 1500, 82, 440);
      lines.forEach((l) => c.fillText(l.text, 96, l.y));
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText(d.closing.by, 96, 440 + lines.length * 82 + 36);
      c.restore();
      void fillBigText; void rectPts;
    }

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(): Cue[] {
    const d = this.d;
    const cues: Cue[] = [];
    d.rows.forEach((r, i) => cues.push({ t: r.at, voice: 'step', gain: 0.4, pitch: 0.8 + i * 0.1 }));
    cues.push({ t: d.rows[d.rows.length - 1]!.at + 0.8, voice: 'lock', gain: 0.6, pitch: 1.0 });
    cues.push({ t: d.bracket, voice: 'morph', gain: 0.35 });
    cues.push({ t: d.bracket + 1.0, voice: 'stamp', gain: 0.6, pitch: 0.9 });
    cues.push({ t: d.quote, voice: 'reveal', gain: 0.4, pitch: 0.85 });
    return cues.sort((a, b) => a.t - b.t);
  }
}
