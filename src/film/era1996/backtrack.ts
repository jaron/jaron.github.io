// 1996 beat, scene 3: the program's search for the mass of the helium (the thesis's Fig 5.4, simplified).
//   a cursor walks the search tree; one branch goes in a circle (the goal reappears), the cursor backs up to its last
//   choice, a second branch hits a dead end, it backs up again, and a third path works. Failed branches fade;
//   only the path that worked stays lit ("only the path that worked goes into the final report", thesis p.105).
// The tree, the order of visits and the captions are all data (data/content/s03-dead-ends.ts).
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, prog } from '../engine/util';
import { wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

type NodeKind = 'goal' | 'formula' | 'quantity' | 'known' | 'fail';
interface TNode { id: string; parent?: string; label: string; tag: string; kind: NodeKind; x: number; y: number }
interface Mark { node: string; t: number; state: 'open' | 'known' | 'fail' }
interface Data {
  label: string; source: string; nodes: TNode[]; marks: Mark[];
  walk: { node: string; t: number }[];
  loop: { from: string; to: string; t: number };
  path: string[]; success: number; backFrom: number[];
  captions: { t: number; text: string }[];
}

const BW = 210, BH = 64;
const HOP = 0.3;                                  // seconds a cursor move takes
const LEFT_DEAD = ['fmg', 'force', 'fma', 'mass2'], LEFT_DEAD_AT = 6.9;
const SECOND_DEAD = ['knN', 'count'], SECOND_DEAD_AT = 11.2;

export default class BacktrackRenderer implements Era1996Renderer {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  private d!: Data;
  private ctx!: SceneCtx;
  private byId = new Map<string, TNode>();
  private markOf = new Map<string, Mark>();
  private winning = new Set<string>();

  init(content: SceneContent, ctx: SceneCtx) {
    this.d = content.era1996.data as unknown as Data;
    this.ctx = ctx;
    for (const n of this.d.nodes) this.byId.set(n.id, n);
    for (const m of this.d.marks) this.markOf.set(m.node, m);
    for (const id of this.d.path) this.winning.add(id);
    this.winning.add('molar');                     // the known molar mass is part of the working solution too
  }

  /** brightness of a node/edge: failed branches step back as the search moves on, then fade for good at the end */
  private dim(id: string, lt: number) {
    const d = this.d;
    let a = 1;
    if (LEFT_DEAD.includes(id)) a = lerp(1, 0.42, ease.inOutCubic(prog(lt, LEFT_DEAD_AT, LEFT_DEAD_AT + 0.5)));
    if (SECOND_DEAD.includes(id)) a = lerp(1, 0.42, ease.inOutCubic(prog(lt, SECOND_DEAD_AT, SECOND_DEAD_AT + 0.5)));
    if (!this.winning.has(id) && id !== 'root') a = Math.min(a, lerp(1, 0.2, ease.inOutCubic(prog(lt, d.success, d.success + 0.7))));
    return a;
  }

  /** where the cursor is at time lt: it holds, then hops to the next node on the walk */
  private cursor(lt: number) {
    const w = this.d.walk;
    if (lt < w[0]!.t) return null;
    let i = 0;
    while (i + 1 < w.length && lt >= w[i + 1]!.t - HOP) i++;
    const a = this.byId.get(w[i]!.node)!;
    const next = w[i + 1];
    if (!next || lt < next.t - HOP) return { x: a.x, y: a.y };
    const b = this.byId.get(next.node)!;
    const k = ease.inOutCubic(prog(lt, next.t - HOP, next.t));
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
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

    // edges, drawn out toward each child as it is reached
    for (const n of d.nodes) {
      if (!n.parent) continue;
      const m = this.markOf.get(n.id)!;
      const p = this.byId.get(n.parent)!;
      const k = ease.outCubic(prog(lt, m.t - 0.5, m.t - 0.05));
      if (k <= 0) continue;
      const x1 = p.x + BW / 2, y1 = p.y, x2 = n.x - BW / 2, y2 = n.y;
      const onWin = this.winning.has(n.id) && this.winning.has(n.parent) || (n.id === 'molar');
      const lit = onWin ? ease.inOutCubic(prog(lt, d.success, d.success + 0.6)) : 0;
      const a = this.dim(n.id, lt);
      lb.seg2(x1, y1, lerp(x1, x2, k), lerp(y1, y2, k), 1.6 + 2.4 * lit, sig, (0.55 + 0.45 * lit) * a);
      if (lit > 0) lb.seg2(x1, y1, lerp(x1, x2, k), lerp(y1, y2, k), 12, sig, 0.25 * lit);
    }

    // the loop: the goal shows up again, so a curve runs back to the start
    this.drawLoop(lt, lb, c);

    // nodes
    for (const n of d.nodes) {
      const m = this.markOf.get(n.id)!;
      const appear = ease.outCubic(prog(lt, m.t - 0.15, m.t + 0.25));
      if (appear <= 0) continue;
      const a = appear * this.dim(n.id, lt);
      const x0 = n.x - BW / 2, y0 = n.y - BH / 2;
      const settled = m.state;     // open | known | fail
      const failed = settled === 'fail' && lt >= m.t;
      const known = settled === 'known' && lt >= m.t;
      const isPath = this.winning.has(n.id);
      const win = isPath ? ease.inOutCubic(prog(lt, d.success, d.success + 0.6)) : 0;
      const col = failed ? LIN.graphite : LIN.signal;
      const w = n.kind === 'goal' ? 3 : failed ? 1.4 : 2 + win;
      lb.polyline([{ x: x0, y: y0 }, { x: x0 + BW, y: y0 }, { x: x0 + BW, y: y0 + BH }, { x: x0, y: y0 + BH }, { x: x0, y: y0 }], w, col, (failed ? 0.8 : 0.9) * a);
      if (win > 0 || (n.kind === 'goal')) lb.polyline([{ x: x0 - 3, y: y0 - 3 }, { x: x0 + BW + 3, y: y0 - 3 }, { x: x0 + BW + 3, y: y0 + BH + 3 }, { x: x0 - 3, y: y0 + BH + 3 }, { x: x0 - 3, y: y0 - 3 }], 6, sig, 0.22 * Math.max(win, n.kind === 'goal' ? 0.6 : 0) * a);
      // status marks on the right of the box: a cross for a failure, a tick for a known value
      if (failed) {
        const cx = x0 + BW - 24, cy = n.y - 6, r = 8, k = ease.outExpo(prog(lt, m.t, m.t + 0.25));
        lb.seg2(cx - r, cy - r, cx - r + 2 * r * k, cy - r + 2 * r * k, 2.4, LIN.bone, 0.95 * a);
        lb.seg2(cx + r, cy - r, cx + r - 2 * r * k, cy - r + 2 * r * k, 2.4, LIN.bone, 0.95 * a);
      } else if (known) {
        const cx = x0 + BW - 24, cy = n.y - 6, k = ease.outExpo(prog(lt, m.t, m.t + 0.25));
        lb.polyline([{ x: cx - 9, y: cy }, { x: cx - 2, y: cy + 8 }, { x: cx - 2 + 14 * k, y: cy + 8 - 20 * k }], 2.6, LIN.ember, 0.95 * a);
      }
      c.save(); c.globalAlpha = a; c.textAlign = 'center';
      c.font = font(F.mono(500), n.label.length > 12 ? 19 : 21); c.fillStyle = failed ? rgba('ash', 1) : rgba('bone', 1);
      c.fillText(n.label, n.x - (failed || known ? 12 : 0), n.y - 1, BW - (failed || known ? 54 : 24));
      c.font = font(F.mono(500), 12); c.letterSpacing = '3px';
      c.fillStyle = failed ? rgba('bone', 0.9) : known ? rgba('ember', 1) : rgba('signal', 1);
      c.fillText(failed || known ? n.tag : (n.kind === 'goal' ? n.tag : n.tag), n.x, n.y + 19);
      c.restore();
    }

    // the cursor: where the search is now
    const cur = this.cursor(lt);
    if (cur) {
      const win = ease.inOutCubic(prog(lt, d.success + 0.3, d.success + 0.7));
      const al = 1 - win;
      if (al > 0.01) {
        lb.seg2(cur.x, cur.y, cur.x + 0.01, cur.y, 34, sig, 0.28 * al);
        lb.seg2(cur.x, cur.y, cur.x + 0.01, cur.y, 15, LIN.ember, 0.95 * al);
      }
    }

    // the caption for what is happening now, in full sentences
    let cap: { t: number; text: string } | null = null;
    for (const q of d.captions) if (lt >= q.t) cap = q;
    if (cap) {
      const a = ease.outCubic(prog(lt, cap.t, cap.t + 0.3));
      c.save(); c.globalAlpha = a;
      c.font = font(F.archivo(100, 500), 34); c.fillStyle = rgba('bone', 1);
      for (const l of wrap(c, cap.text, 1728, 44, 960 + (1 - a) * 8)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  private drawLoop(lt: number, lb: LineBatch, c: CanvasRenderingContext2D) {
    const lp = this.d.loop;
    const k = ease.inOutCubic(prog(lt, lp.t, lp.t + 0.75));
    if (k <= 0) return;
    const a = this.byId.get(lp.from)!, b = this.byId.get(lp.to)!;
    const fade = (1 - ease.inOutCubic(prog(lt, LEFT_DEAD_AT, LEFT_DEAD_AT + 0.5)) * 0.58) * (1 - ease.inOutCubic(prog(lt, this.d.success, this.d.success + 0.7)) * 0.5);
    const sx = a.x - 30, sy = a.y - BH / 2, ex = b.x - 20, ey = b.y - BH / 2 - 4;
    const cx = (sx + ex) / 2, cy = 70;
    const pts: { x: number; y: number }[] = [];
    const N = 48;
    for (let q = 0; q <= Math.floor(N * k); q++) {
      const u = q / N, v = 1 - u;
      pts.push({ x: v * v * sx + 2 * u * v * cx + u * u * ex, y: v * v * sy + 2 * u * v * cy + u * u * ey });
    }
    lb.polyline(pts, 2.6, LIN.ember, 0.95 * fade);
    lb.polyline(pts, 12, LIN.signal, 0.2 * fade);
    if (k > 0.97) {      // arrowhead along the curve's own direction at its end
      const tx = ex - cx, ty = ey - cy, tl = Math.hypot(tx, ty);
      const bx = -tx / tl, by = -ty / tl;          // unit vector pointing back along the curve
      const wing = (a: number) => ({ x: ex + 24 * (bx * Math.cos(a) - by * Math.sin(a)), y: ey + 24 * (bx * Math.sin(a) + by * Math.cos(a)) });
      for (const a of [0.45, -0.45]) { const w = wing(a); lb.seg2(ex, ey, w.x, w.y, 2.6, LIN.ember, 0.95 * fade); }
    }
    const la = ease.outCubic(prog(lt, lp.t + 0.5, lp.t + 0.9)) * fade;
    c.save(); c.globalAlpha = la; c.textAlign = 'center';
    c.font = font(F.mono(500), 22); c.letterSpacing = '5px'; c.fillStyle = rgba('ember', 1);
    c.fillText('A LOOP: THE GOAL IS BACK', cx + 80, 298); c.restore();
    void clamp;
  }

  cues(): Cue[] {
    const d = this.d;
    const cues: Cue[] = [];
    for (let t = 0.2; t < 0.9; t += 0.25) cues.push({ t, voice: 'type', gain: 0.12 });
    for (const m of d.marks) {
      if (m.state === 'fail') cues.push({ t: m.t, voice: 'fail', gain: 0.7, pitch: 0.9 });
      else if (m.state === 'known') cues.push({ t: m.t, voice: 'lock', gain: 0.55, pitch: 1.1 });
      else cues.push({ t: m.t, voice: 'step', gain: 0.4, pitch: 0.9 + (m.t / 20) });
    }
    cues.push({ t: d.loop.t, voice: 'morph', gain: 0.4 });
    // backing up: a quick run of ticks, one per hop
    d.walk.forEach((w, i) => {
      const prev = d.walk[i - 1];
      if (prev && this.byId.get(w.node)!.parent === prev.node) return;      // moving down
      if (prev && this.byId.get(prev.node)!.parent === w.node) cues.push({ t: w.t, voice: 'step', gain: 0.3, pitch: 0.7 });
    });
    cues.push({ t: d.success, voice: 'stamp', gain: 0.8, pitch: 1.0 });
    return cues.sort((a, b) => a.t - b.t);
  }
}
