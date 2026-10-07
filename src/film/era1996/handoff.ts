// 1996 beat, scene 4: the Solver decides what to find and hands each calculation to a specialist (thesis ch. 5).
//   left: the Solver and three things it needs; right: the specialists. A packet carries the formula over, the
//   specialist works (a sum; trial values narrowing in; linked unknowns settling together), and the answer comes back
//   into the Solver's tree. A fourth specialist (integrals) is only named. The equations are labelled illustrations.
// Everything shown is data (data/content/s04-tool-calling.ts); the three kinds of work are drawn here.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, prog } from '../engine/util';
import { wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

interface Specialist { id: string; title: string; sub: string }
interface Handoff { id: string; node: string; packet: string[]; work: string[]; answer: string; need: number; send: number; working: number; back: number }
interface Data {
  label: string; source: string; specialists: Specialist[];
  halving: { equation: string; lo: number; hi: number; trials: number };
  handoffs: Handoff[];
  loop: { t: number }; integral: number; final: number;
  captions: { t: number; text: string }[];
}

const SOLVER = { x: 96, y: 230, w: 584, h: 650 };
const NODE_X = 520, NODE_W = 200, NODE_H = 58, NODE_Y = [380, 560, 740];
const ROOT = { x: 210, y: 560, w: 120, h: 58 };
const ROWS = [{ y: 230, h: 170 }, { y: 420, h: 230 }, { y: 670, h: 170 }, { y: 856, h: 60 }];
const SPEC_X = 1130, SPEC_W = 694;
const SEND_TRAVEL = 0.7, BACK_TRAVEL = 0.65;
const TRIAL_GAP = 0.5;

const rectPts = (x: number, y: number, w: number, h: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];

export default class HandoffRenderer implements Era1996Renderer {
  private lb = new LineBatch(2500, { blend: 'add' });
  private text = new Layer2D();
  private d!: Data;
  private ctx!: SceneCtx;
  private trials: { mid: number; low: boolean; lo: number; hi: number }[] = [];

  init(content: SceneContent, ctx: SceneCtx) {
    this.d = content.era1996.data as unknown as Data;
    this.ctx = ctx;
    // bisection on f(x) = x - 2 cos x over [lo, hi]: computed here, so the drawing is the real procedure
    const f = (x: number) => x - 2 * Math.cos(x);
    let lo = this.d.halving.lo, hi = this.d.halving.hi;
    for (let i = 0; i < this.d.halving.trials; i++) {
      const mid = (lo + hi) / 2;
      const low = f(mid) < 0;
      this.trials.push({ mid, low, lo, hi });
      if (low) lo = mid; else hi = mid;
    }
  }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
    const { renderer, comp } = this.ctx;
    const d = this.d;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';
    const sig = LIN.signal;

    // header
    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('bone', 1);
    c.fillText('1996', 96, 140);
    c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
    c.fillText(d.label, 1824, 140); c.textAlign = 'left';
    c.font = font(F.mono(400), 14); c.letterSpacing = '3px';
    c.fillText(d.source, 96, 204); c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    // the Solver panel
    const panelA = ease.outCubic(prog(lt, 0.2, 0.7));
    lb.polyline(rectPts(SOLVER.x, SOLVER.y, SOLVER.w, SOLVER.h), 1.4, sig, 0.55 * panelA);
    c.save(); c.globalAlpha = panelA;
    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
    c.fillText('THE SOLVER', SOLVER.x + 28, SOLVER.y + 44); c.letterSpacing = '0px';
    c.font = font(F.archivo(100, 500), 26); c.fillStyle = rgba('bone', 0.9);
    c.fillText('decides what to find', SOLVER.x + 28, SOLVER.y + 80);
    c.restore();
    // its tree: a goal and the three values it needs
    const rootA = ease.outCubic(prog(lt, 0.7, 1.2));
    this.node(lb, c, ROOT.x, ROOT.y, ROOT.w, ROOT.h, 'GOAL', 'what to find', rootA, 3, true);
    d.handoffs.forEach((h, i) => {
      const na = ease.outCubic(prog(lt, h.need - 0.3, h.need + 0.25));
      if (na <= 0) return;
      const ny = NODE_Y[i]!;
      lb.seg2(ROOT.x + ROOT.w / 2, ROOT.y, lerp(ROOT.x + ROOT.w / 2, NODE_X - NODE_W / 2, na), lerp(ROOT.y, ny, na), 1.4, sig, 0.5 * na);
      const filled = lt >= h.back + BACK_TRAVEL;
      const waiting = lt >= h.send && !filled;
      const tag = filled ? h.answer : waiting ? 'WAITING FOR AN ANSWER' : 'NEEDS A VALUE';
      this.node(lb, c, NODE_X, ny, NODE_W, NODE_H, h.node, tag, na, filled ? 2.6 : 1.6, false, filled);
    });

    // the specialists
    d.specialists.forEach((s, i) => {
      const row = ROWS[i]!;
      const isInt = s.id === 'integral';
      const ha = d.handoffs[i];
      const appear = isInt ? ease.outCubic(prog(lt, d.integral, d.integral + 0.5)) : ease.outCubic(prog(lt, 0.7 + i * 0.15, 1.3 + i * 0.15));
      if (appear <= 0) return;
      const active = ha ? lt >= ha.send + SEND_TRAVEL && lt < ha.back : false;
      const used = ha ? lt >= ha.back : false;
      const alpha = (isInt ? 0.45 : active ? 1 : used ? 0.55 : 0.4) * appear;
      lb.polyline(rectPts(SPEC_X, row.y, SPEC_W, row.h), active ? 2.4 : 1.2, active ? sig : LIN.graphite, alpha * (active ? 1 : 1.2));
      if (active) lb.polyline(rectPts(SPEC_X - 3, row.y - 3, SPEC_W + 6, row.h + 6), 6, sig, 0.2);
      c.save(); c.globalAlpha = appear * (isInt ? 0.6 : active ? 1 : 0.8);
      c.font = font(F.mono(500), 16); c.letterSpacing = '4px'; c.fillStyle = active ? rgba('signal', 1) : rgba('ash', 1);
      c.fillText(s.title, SPEC_X + 24, row.y + 34); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), isInt ? 22 : 24); c.fillStyle = rgba('bone', 0.9);
      if (isInt) { c.textAlign = 'right'; c.fillText(s.sub, SPEC_X + SPEC_W - 24, row.y + 36); c.textAlign = 'left'; }
      else c.fillText(s.sub, SPEC_X + 24, row.y + 68);
      c.restore();
    });

    // the work inside each specialist, and the packets that travel
    d.handoffs.forEach((h, i) => {
      const row = ROWS[i]!;
      const ny = NODE_Y[i]!;
      const rowMid = row.y + row.h / 2;
      if (i === 0) this.workSum(c, h, row, lt);
      if (i === 1) this.workHalving(lb, c, h, row, lt);
      if (i === 2) this.workPair(lb, c, h, row, lt);
      const out1 = ease.inOutCubic(prog(lt, h.send, h.send + SEND_TRAVEL));
      if (lt >= h.send && lt < h.send + SEND_TRAVEL + 0.02) this.packet(lb, c, lerp(NODE_X + NODE_W / 2, SPEC_X, out1), lerp(ny, rowMid, out1), h.packet);
      const back = ease.inOutCubic(prog(lt, h.back, h.back + BACK_TRAVEL));
      if (lt >= h.back && lt < h.back + BACK_TRAVEL + 0.02) this.packet(lb, c, lerp(SPEC_X, NODE_X + NODE_W / 2, back), lerp(rowMid, ny, back), [h.answer], true);
    });

    // the loop that stalls the search before the third hand-off
    this.drawLoop(lb, c, lt);

    // the caption for what is happening now
    let cap: { t: number; text: string } | null = null;
    for (const q of d.captions) if (lt >= q.t) cap = q;
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

  private node(lb: LineBatch, c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, label: string, tag: string, a: number, width: number, goal: boolean, filled = false) {
    if (a <= 0) return;
    const x0 = cx - w / 2, y0 = cy - h / 2;
    lb.polyline(rectPts(x0, y0, w, h), width, filled || goal ? LIN.signal : LIN.signal, (filled || goal ? 0.95 : 0.55) * a);
    if (filled) lb.polyline(rectPts(x0 - 3, y0 - 3, w + 6, h + 6), 6, LIN.signal, 0.22 * a);
    c.save(); c.globalAlpha = a; c.textAlign = 'center';
    c.font = font(F.mono(500), label.length > 16 ? 15 : 17); c.fillStyle = rgba('bone', 1);
    c.fillText(label, cx, cy - 4, w - 16);
    c.font = font(F.mono(500), 12); c.letterSpacing = '2px'; c.fillStyle = filled ? rgba('ember', 1) : rgba('signal', 1);
    c.fillText(tag, cx, cy + 18, w - 16);
    c.restore();
  }

  private packet(lb: LineBatch, c: CanvasRenderingContext2D, x: number, y: number, lines: string[], answer = false) {
    c.save();
    c.font = font(F.mono(500), 18);
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 28;
    const h = 18 + lines.length * 26;
    lb.polyline(rectPts(x - w / 2, y - h / 2, w, h), 2, answer ? LIN.ember : LIN.signal, 0.95);
    lb.polyline(rectPts(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6), 8, LIN.signal, 0.2);
    c.fillStyle = 'rgba(5,5,7,0.92)'; c.fillRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2);
    c.fillStyle = answer ? rgba('ember', 1) : rgba('bone', 1); c.textAlign = 'center';
    lines.forEach((l, i) => c.fillText(l, x, y - h / 2 + 31 + i * 26));
    c.restore();
  }

  /** 1. the Interpreter works out a sum, step by step */
  private workSum(c: CanvasRenderingContext2D, h: Handoff, row: { y: number; h: number }, lt: number) {
    if (lt < h.working) return;
    const t = lt - h.working;
    c.save(); c.font = font(F.mono(500), 24);
    h.work.forEach((l, i) => {
      const a = ease.outCubic(prog(t, i * 0.7, i * 0.7 + 0.3));
      if (a <= 0) return;
      c.globalAlpha = a; c.fillStyle = i === h.work.length - 1 ? rgba('ember', 1) : rgba('bone', 1);
      c.fillText(l, SPEC_X + 24, row.y + 112 + i * 34);
    });
    c.restore();
  }

  /** 2. trial values narrowing in: the real bisection, a trial every half second */
  private workHalving(lb: LineBatch, c: CanvasRenderingContext2D, h: Handoff, row: { y: number; h: number }, lt: number) {
    if (lt < h.working - 0.2) return;
    const hv = this.d.halving;
    const x0 = SPEC_X + 44, x1 = SPEC_X + SPEC_W - 44, y = row.y + 176;
    const mapX = (v: number) => x0 + ((v - hv.lo) / (hv.hi - hv.lo)) * (x1 - x0);
    const a = ease.outCubic(prog(lt, h.working - 0.2, h.working + 0.3));
    c.save(); c.globalAlpha = a;
    c.font = font(F.mono(500), 24); c.fillStyle = rgba('bone', 1);
    c.fillText(hv.equation, SPEC_X + 24, row.y + 112);
    c.restore();
    lb.seg2(x0, y, x1, y, 1.2, LIN.graphite, 0.8 * a);
    for (const v of [hv.lo, hv.hi]) lb.seg2(mapX(v), y - 6, mapX(v), y + 6, 1.2, LIN.graphite, 0.8 * a);
    c.save(); c.globalAlpha = a; c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 1); c.textAlign = 'center';
    c.fillText(String(hv.lo), mapX(hv.lo), y + 26); c.fillText(String(hv.hi), mapX(hv.hi), y + 26); c.restore();
    // the current range, then each trial
    let lo = hv.lo, hi = hv.hi, n = 0;
    this.trials.forEach((tr, k) => {
      const tk = h.working + 0.2 + k * TRIAL_GAP;
      if (lt >= tk + 0.3) { lo = tr.low ? tr.mid : tr.lo; hi = tr.low ? tr.hi : tr.mid; }
      if (lt >= tk) n = k + 1;
      const ta = ease.outCubic(prog(lt, tk, tk + 0.15));
      if (ta <= 0) return;
      const x = mapX(tr.mid);
      const recent = lt < tk + TRIAL_GAP;
      lb.seg2(x, y - 4, x, y - 30, 2, recent ? LIN.ember : LIN.signal, (recent ? 0.95 : 0.45) * ta);
      if (recent) {
        c.save(); c.globalAlpha = ta; c.font = font(F.mono(500), 13); c.letterSpacing = '2px'; c.fillStyle = rgba('ember', 1); c.textAlign = 'center';
        c.fillText(tr.low ? 'TOO LOW' : 'TOO HIGH', x, y - 40); c.restore();
      }
    });
    lb.seg2(mapX(lo), y, mapX(hi), y, 6, LIN.signal, 0.95 * a);
    const after = h.working + 0.2 + this.trials.length * TRIAL_GAP;
    c.save(); c.textAlign = 'right'; c.font = font(F.mono(500), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('signal', 1);
    c.globalAlpha = a;
    c.fillText(lt >= after ? 'THOUSANDS OF TRIES IN PRACTICE' : `TRIAL ${n}`, SPEC_X + SPEC_W - 24, row.y + 34); c.restore();
  }

  /** 3. linked unknowns: both guesses move together until each settles */
  private workPair(lb: LineBatch, c: CanvasRenderingContext2D, h: Handoff, row: { y: number; h: number }, lt: number) {
    if (lt < h.working) return;
    const t = lt - h.working, dur = h.back - h.working;
    const names = ['original length', 'change in length'];
    const target = [0.33, 0.67];
    const x0 = SPEC_X + 250, x1 = SPEC_X + SPEC_W - 40;
    names.forEach((nm, i) => {
      const y = row.y + 104 + i * 38;
      const a = ease.outCubic(prog(t, 0, 0.3));
      c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 17); c.fillStyle = rgba('bone', 1); c.fillText(nm, SPEC_X + 24, y + 6); c.restore();
      lb.seg2(x0, y, x1, y, 1.2, LIN.graphite, 0.8 * a);
      // a guess that overshoots and settles (stepped by the 1996 frame rate)
      const k = clamp(t / (dur - 0.3));
      const wobble = Math.exp(-5 * k) * Math.cos(k * 16 + i * 1.7) * 0.45;
      const g = clamp(target[i]! + (i ? -1 : 1) * wobble, 0.02, 0.98);
      const settled = k >= 1;
      const gx = lerp(x0, x1, settled ? target[i]! : g);
      lb.seg2(gx, y - 10, gx, y + 10, 4, settled ? LIN.ember : LIN.signal, 0.95 * a);
      if (settled) {
        c.save(); c.font = font(F.mono(500), 18); c.fillStyle = rgba('ember', 1); c.fillText('✓', x1 + 6, y + 6); c.restore();
      }
    });
    c.save(); c.globalAlpha = ease.outCubic(prog(t, 0, 0.3)); c.textAlign = 'right'; c.font = font(F.mono(500), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('signal', 1);
    c.fillText('GUESS BOTH, TEST, ADJUST', SPEC_X + SPEC_W - 24, row.y + 34); c.restore();
  }

  /** the search going round in a circle: the cue to hand over linked unknowns */
  private drawLoop(lb: LineBatch, c: CanvasRenderingContext2D, lt: number) {
    const h = this.d.handoffs[2]!;
    const t0 = this.d.loop.t;
    if (lt < t0 || lt >= h.send) return;
    const k = ease.inOutCubic(prog(lt, t0, t0 + 0.7));
    const cx = NODE_X - NODE_W / 2 - 52, cy = NODE_Y[2]!, r = 24;
    const N = 40, pts: { x: number; y: number }[] = [];
    for (let q = 0; q <= Math.floor(N * k); q++) {
      const ang = -Math.PI / 2 + (q / N) * Math.PI * 2 * 0.92;
      pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
    }
    if (pts.length > 1) { lb.polyline(pts, 2.4, LIN.ember, 0.95); lb.polyline(pts, 10, LIN.signal, 0.2); }
    const a = ease.outCubic(prog(lt, t0 + 0.4, t0 + 0.8));
    c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ember', 1);
    c.fillText('GOING IN A CIRCLE', NODE_X, NODE_Y[2]! - 46); c.restore();
  }

  cues(): Cue[] {
    const d = this.d;
    const cues: Cue[] = [];
    cues.push({ t: 0.7, voice: 'reveal', gain: 0.4, pitch: 0.9 });
    d.handoffs.forEach((h, i) => {
      cues.push({ t: h.need, voice: 'step', gain: 0.35, pitch: 0.8 + i * 0.1 });
      cues.push({ t: h.send, voice: 'call', gain: 0.5, pitch: 0.9 + i * 0.1 });
      cues.push({ t: h.back, voice: 'call', gain: 0.4, pitch: 1.3 });
      cues.push({ t: h.back + BACK_TRAVEL, voice: 'lock', gain: 0.6, pitch: 1.0 + i * 0.12 });
    });
    this.trials.forEach((_, k) => cues.push({ t: d.handoffs[1]!.working + 0.2 + k * TRIAL_GAP, voice: 'step', gain: 0.25, pitch: 0.7 + k * 0.05 }));
    cues.push({ t: d.loop.t, voice: 'morph', gain: 0.35 });
    cues.push({ t: d.integral, voice: 'reveal', gain: 0.3, pitch: 0.8 });
    return cues.sort((a, b) => a.t - b.t);
  }
}
