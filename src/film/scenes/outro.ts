// The outro: plain pages of text, each appearing word by word, holding, and clearing completely before the next.
// The last page ends the film and stays on screen. Everything is a pure function of time.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba, type PaletteKey } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, prog } from '../engine/util';
import type { Cue } from '../core/types';
import { wrap } from '../core/draw';
import { OUTRO, outroTimes, wordTimes, type Prediction } from '../data/outro';

interface Placed { w: string; x: number; y: number; t: number; size: number; run: number; emphasis?: 'past' | 'present' | 'coda' }
const MAX_W = 1560, LEFT = 96, TOP = 330, PRED_TOP = 420;
const ART = { x0: 1290, x1: 1824, y0: 380, y1: 820 };

export default class Outro extends Scene {
  private lb = new LineBatch(800, { blend: 'add' });
  private text = new Layer2D();
  private pages: Placed[][] = [];
  /** prediction pages: when the quotation finishes typing, and where its last baseline is */
  private quoteEnd: { t: number; y: number }[] = [];
  private times = outroTimes();

  init() {
    // lay each page out once: greedy word wrap, emphasised words set heavier
    const c = this.text.ctx;
    OUTRO.pages.forEach((p) => {
      const placed: Placed[] = [];
      const wt = wordTimes(p);
      let wi = 0;
      const maxW = p.maxW ?? MAX_W;
      let x = LEFT, y = p.prediction ? PRED_TOP : TOP, endX = LEFT;      // endX: where the last word ended, before its trailing space
      let quoteY = y;
      p.runs.forEach((run, ri) => {
        const size = run.size ?? p.size;
        const lh = Math.round(size * 1.32);
        const toks = run.text.split(/[ \t\r\n]+/).filter(Boolean);     // a non-breaking space keeps words together
        if (run.gap !== undefined) { x = LEFT; y += run.gap; endX = LEFT; }
        else if (run.newParagraph) { x = LEFT; y += lh * 2; endX = LEFT; }
        toks.forEach((w, ti) => {
          c.font = font(F.archivo(100, run.emphasis ? 800 : 600), size);
          // a run that starts without a space (a comma straight after an emphasised phrase) attaches to the word before it
          if (ri > 0 && ti === 0 && !/^\s/.test(run.text) && !/\s$/.test(p.runs[ri - 1]!.text)) x = endX;
          const wd = c.measureText(w + ' ').width;
          if (x + c.measureText(w).width > LEFT + maxW) { x = LEFT; y += lh; }
          placed.push({ w, x, y, t: wt[wi++]!, size, run: ri, emphasis: run.emphasis });
          endX = x + c.measureText(w).width;
          x += wd;
        });
        if (run.emphasis === 'past') quoteY = y;
      });
      this.pages.push(placed);
      const q = placed.filter((w) => w.emphasis === 'past');
      this.quoteEnd.push({ t: q.length ? q[q.length - 1]!.t : 0, y: quoteY });
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

    const cur = OUTRO.pages.findIndex((_, i) => lt >= this.times[i]!.start && lt < this.times[i]!.end);
    const pred = cur >= 0 ? OUTRO.pages[cur]!.prediction : undefined;
    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
    c.fillText(pred ? 'WHAT I PREDICTED IN 1996' : OUTRO.label, 96, 140);
    if (pred) { c.textAlign = 'right'; c.fillText(`THESIS · PAGE ${pred.page}`, 1824, 140); c.textAlign = 'left'; }
    c.letterSpacing = '0px';
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
        c.font = font(F.archivo(100, wd.emphasis ? 800 : 600), wd.size);
        c.fillStyle = wd.emphasis === 'past' ? rgba('signal', 1) : wd.emphasis === 'present' ? rgba('claude', 1) : wd.emphasis === 'coda' ? rgba('bone', 1) : rgba('bone', 0.96);
        c.fillText(wd.w, wd.x, wd.y + (1 - a) * 14);
        c.restore();
      });
      if (p.prediction) this.drawPrediction(p.prediction, this.quoteEnd[i]!, lp, keep, c, lb);
    });

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
    // it fades up from black like every scene, and it does not fade out: the film ends on its last page
    const fade = 1 - ease.outCubic(prog(lt, 0, 0.45));
    return { bloom: 0.5, halation: 0.1, fade };
  }

  /** the verdict stamp under the quotation, and the small drawing beside it */
  private drawPrediction(pr: Prediction, q: { t: number; y: number }, lp: number, keep: number, c: CanvasRenderingContext2D, lb: LineBatch) {
    const va = ease.outCubic(prog(lp, q.t + 0.35, q.t + 0.8)) * keep;
    if (va > 0) {
      const right = pr.verdictKind === 'right';
      c.save(); c.globalAlpha = va;
      c.font = font(F.mono(500), 20); c.letterSpacing = '5px';
      c.fillStyle = rgba(right ? 'claude' : 'ash', 1);
      c.fillText(`→ ${pr.verdict}`, LEFT, q.y + 62);
      c.restore();
    }
    const a = ease.outCubic(prog(lp, 1.0, 1.8)) * keep;
    if (a <= 0) return;
    const s = lp - 1.0;
    const blue = LIN.signal, orange = LIN.claude, grey = LIN.ash;
    const ring = (cx: number, cy: number, r: number, w: number, col: [number, number, number], al: number) => {
      for (let k = 0; k < 40; k++) {
        const a0 = (k / 40) * Math.PI * 2, a1 = ((k + 1) / 40) * Math.PI * 2;
        lb.seg2(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, w, col, al);
      }
    };
    const label = (t: string, x: number, y: number, al = 1, col: PaletteKey = 'ash') => {
      c.save(); c.globalAlpha = a * al; c.font = font(F.mono(500), 14); c.letterSpacing = '3px'; c.textAlign = 'center';
      c.fillStyle = rgba(col, 1); c.fillText(t, x, y); c.restore();
    };
    const cx = (ART.x0 + ART.x1) / 2, cy = (ART.y0 + ART.y1) / 2;
    if (pr.art === 'agents') {
      // the solver turns to face each domain in turn and is fitted with a different tool for it: a request goes out through the tool and comes back
      const K = 1.3;
      const hub = { x: cx, y: cy };
      const ex = [{ x: cx - 165 * K, y: cy - 118 * K, n: 'STRESS' }, { x: cx + 165 * K, y: cy - 118 * K, n: 'CHEMISTRY' }, { x: cx, y: cy + 165 * K, n: 'ELECTRICAL' }];
      const ang = ex.map((e) => Math.atan2(e.y - hub.y, e.x - hub.x));
      const P = 3.6, n = Math.floor(s / P), ph = s - n * P, i = n % 3;
      const from = n === 0 ? ang[0]! - 1.1 : ang[(i + 2) % 3]!, to = ang[i]!;
      let d = to - from; d = Math.atan2(Math.sin(d), Math.cos(d));
      const face = from + d * ease.inOutCubic(prog(ph, 0, 0.9));
      const dx = Math.cos(face), dy = Math.sin(face);
      const tool = ease.outCubic(prog(ph, 0.8, 1.3)) * (1 - ease.inCubic(prog(ph, 3.1, 3.5)));
      const E = ex[i]!;
      const hit = ease.inOutCubic(prog(ph, 1.4, 2.0)) * (1 - ease.inOutCubic(prog(ph, 2.2, 2.8)));   // 0 → 1 → 0: out to the domain and back
      ex.forEach((e, k) => {
        lb.seg2(hub.x, hub.y, e.x, e.y, 1, blue, 0.18 * a);
        const lit = k === i ? hit : 0;
        ring(e.x, e.y, 36 * K, 3, lit > 0.05 ? orange : blue, (0.55 + 0.45 * lit) * a);
        label(e.n, e.x, e.y + (e.y > cy ? 36 * K + 30 : -36 * K - 18), 1, lit > 0.05 ? 'claude' : 'ash');
      });
      ring(hub.x, hub.y, 52 * K, 4, orange, 0.95 * a);
      const nose = 74 * K;
      lb.seg2(hub.x + dx * 52 * K, hub.y + dy * 52 * K, hub.x + dx * nose, hub.y + dy * nose, 7, orange, a);      // its face: the way it is pointing
      lb.seg2(hub.x + dx * nose - dy * 11, hub.y + dy * nose + dx * 11, hub.x + dx * nose + dx * 15, hub.y + dy * nose + dy * 15, 4, orange, a);
      lb.seg2(hub.x + dx * nose + dy * 11, hub.y + dy * nose - dx * 11, hub.x + dx * nose + dx * 15, hub.y + dy * nose + dy * 15, 4, orange, a);
      label('SOLVER', hub.x, hub.y + 6, 1, 'bone');
      if (tool > 0.02) {
        const dist = nose + 14 * K + 44 * K * tool, tx = hub.x + dx * dist, ty = hub.y + dy * dist, al = a * tool;
        const L = (x0: number, y0: number, x1: number, y1: number) => lb.seg2(tx + x0 * K, ty + y0 * K, tx + x1 * K, ty + y1 * K, 3.5, orange, al);
        if (i === 0) {                                                           // stress: a beam bending under a load
          for (let k = 0; k < 8; k++) { const u0 = -20 + k * 5, u1 = u0 + 5; L(u0, 4 + 8 * (1 - (u0 / 20) ** 2), u1, 4 + 8 * (1 - (u1 / 20) ** 2)); }
          L(-20, 4, -20, 14); L(20, 4, 20, 14); L(0, -22, 0, 4); L(-6, -8, 0, 4); L(6, -8, 0, 4);
        } else if (i === 1) {                                                    // chemistry: a flask
          L(-5, -22, -5, -6); L(5, -22, 5, -6); L(-9, -22, 9, -22); L(-5, -6, -19, 18); L(5, -6, 19, 18); L(-19, 18, 19, 18); L(-12, 6, 12, 6);
        } else {                                                                 // electrical: a bolt
          L(5, -22, -9, 2); L(-9, 2, 1, 2); L(1, 2, -5, 22); L(-5, 22, 11, -5); L(11, -5, 1, -5); L(1, -5, 5, -22);
        }
        const ox = hub.x + dx * (dist + 30 * K), oy = hub.y + dy * (dist + 30 * K);       // the request travels from the tool to the domain
        const tx2 = E.x - dx * 40 * K, ty2 = E.y - dy * 40 * K;
        const px = ox + (tx2 - ox) * hit, py = oy + (ty2 - oy) * hit;
        lb.seg2(ox, oy, px, py, 2, orange, 0.45 * a * hit);
        lb.seg2(px - 3, py, px + 3, py, 14, orange, a * (hit > 0.02 ? 0.95 : 0));
      }
    } else if (pr.art === 'graph') {
      // a knowledge base as rows of formulae, then as a graph (formulae joined where they share a quantity), then the links
      // strengthen where use has succeeded: what was a static list becomes something that learns
      const rows = ['F = m g', 'F = m a', 'm = M n', 'V = w h d', 'P V = n R T', 'p = F / A'];
      const rowX = ART.x0 + 10, rowY = (i: number) => ART.y0 + 70 + i * 64;
      const gp = [{ x: cx - 130, y: cy - 150 }, { x: cx + 110, y: cy - 120 }, { x: cx - 20, y: cy - 10 }, { x: cx + 170, y: cy + 40 }, { x: cx - 110, y: cy + 140 }, { x: cx + 120, y: cy + 170 }];
      const E = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]];
      const use = [0.35, 1.0, 0.45, 0.25, 0.85, 0.3, 0.2, 0.6];           // how often each link has been used successfully
      const k = ease.inOutCubic(prog(s, 1.6, 4.4));
      const learn = ease.inOutCubic(prog(s, 5.2, 12));
      const links = ease.outCubic(prog(s, 3.2, 4.8));
      const pos = (i: number) => ({ x: rowX + (gp[i]!.x - rowX) * k, y: rowY(i) + (gp[i]!.y - rowY(i)) * k });
      const strength = rows.map((_, i) => E.reduce((m, [u, v], e) => m + (u === i || v === i ? use[e]! : 0), 0));
      E.forEach(([u, v], e) => {
        const A = gp[u!]!, B = gp[v!]!;
        const w = 2 + 8 * use[e]! * learn;
        lb.seg2(A.x, A.y, B.x, B.y, w, orange, (0.35 + 0.5 * use[e]! * learn) * a * links);
        const f = (s * 0.45 + e * 0.37) % 1;                              // a success travelling along the link, once it is a link
        if (s > 5.2 && f < 1) {
          const t = use[e]! > 0.5 || (e % 2 === 0) ? f : 1 - f;
          const px = A.x + (B.x - A.x) * t, py = A.y + (B.y - A.y) * t;
          lb.seg2(px - 2, py, px + 2, py, 8 + 4 * use[e]!, LIN.claudeHot, a * 0.9 * learn);
        }
      });
      rows.forEach((r, i) => {
        const P = pos(i);
        lb.seg2(P.x + 14, P.y + 12, P.x + 190, P.y + 12, 1, grey, 0.35 * a * (1 - k));
        const rad = 14 + 5 * strength[i]! * learn;
        lb.seg2(P.x - 1, P.y, P.x + 1, P.y, rad, k > 0.5 ? orange : blue, a * 0.95);
        c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 20); c.fillStyle = rgba(k > 0.5 ? 'bone' : 'ash', 1);
        c.fillText(r, P.x + (k > 0.5 ? rad / 2 + 10 : 22), P.y + (k > 0.5 ? rad / 2 + 18 : 7)); c.restore();
      });
      const m = ease.outCubic(prog(s, 5.2, 5.9));
      label('A KNOWLEDGE BASE AS ROWS', rowX + 130, ART.y1 + 40, Math.max(0, 1 - 2.5 * k));
      label('AS A GRAPH', cx, ART.y1 + 40, Math.max(0, k * 2 - 1) * (1 - m), 'claude');
      label('WE START TO LEARN IMPORTANCE', cx, ART.y1 + 40, m, 'claude');
    } else {
      // a calculator that you feed numbers, then the same box filled with everything known: you ask in your own words and it answers with its working
      const m = ease.inOutCubic(prog(s, 2.8, 3.8));
      const rect = (x: number, y: number, w: number, h: number, wd: number, col: [number, number, number], al: number) => {
        lb.seg2(x, y, x + w, y, wd, col, al); lb.seg2(x, y + h, x + w, y + h, wd, col, al);
        lb.seg2(x, y, x, y + h, wd, col, al); lb.seg2(x + w, y, x + w, y + h, wd, col, al);
      };
      const bx = cx - 115, by = 410, bw = 230, bh = 380, dxp = cx - 97, dyp = by + 24, dw = 194, dh = 104;
      rect(bx, by, bw, bh, 3, blue, 0.9 * a * (1 - m));
      rect(dxp, dyp, dw, dh, 2, blue, 0.7 * a * (1 - m));
      // the keys: pressed one by one while numbers are typed, then they dissolve
      const kk = [5, 9, 6, 10, 2, 13, 7, 14];
      for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
        const idx = r * 4 + q, kx = cx - 82 + q * 48, ky = by + 168 + r * 52;
        rect(kx, ky, 38, 30, 2, grey, 0.6 * a * (1 - m));
        const j = kk.indexOf(idx);
        if (j >= 0) {
          const f = prog(s, 1.2 + j * 0.2, 1.3 + j * 0.2) * (1 - prog(s, 1.4 + j * 0.2, 1.6 + j * 0.2));
          if (f > 0) lb.seg2(kx + 3, ky + 15, kx + 35, ky + 15, 26, blue, 0.55 * a * f * (1 - m));
        }
      }
      c.save(); c.textAlign = 'right'; c.font = font(F.mono(500), 22);
      const typed = '9.81 × 5.2';
      c.globalAlpha = a * (1 - m); c.fillStyle = rgba('signal', 1);
      c.fillText(typed.slice(0, Math.floor(typed.length * prog(s, 1.2, 2.8))), dxp + dw - 12, dyp + 66);
      c.restore();
      // everything known flows in from either side
      const srcs = ['TEXTBOOKS', 'PAPERS', 'THE WEB', 'CODE', 'MANUALS', 'WIKIPEDIA'];
      srcs.forEach((t, k) => {
        const t0 = 3.4 + k * 0.38, u = prog(s, t0, t0 + 1.7);
        if (u <= 0 || u >= 1) return;
        const side = k % 2 === 0 ? -1 : 1, e = u * u;
        const x0 = cx + side * 250, y0 = by + 40 + (k >> 1) * 130;
        const x = x0 + (cx - x0) * e, y = y0 + (by + 150 - y0) * e;
        label(t, x, y, Math.min(1, u * 6) * (1 - prog(u, 0.7, 1)), 'claude');
      });
      // the same thing as a conversation: you ask in your own words, and it starts to answer
      const BW = 420, PAD = 24, LH = 36, TAIL = 26;
      // a speech lozenge: rounded outline with a small tail at the bottom, left or right
      const bubble = (x: number, y: number, w: number, h: number, tail: 'left' | 'right', col: [number, number, number], al: number) => {
        const r = Math.min(34, h / 2), pts: { x: number; y: number }[] = [];
        const arc = (cx0: number, cy0: number, a0: number) => { for (let k = 0; k <= 6; k++) { const t = a0 + (k / 6) * (Math.PI / 2); pts.push({ x: cx0 + Math.cos(t) * r, y: cy0 + Math.sin(t) * r }); } };
        arc(x + r, y + r, Math.PI); arc(x + w - r, y + r, Math.PI * 1.5); arc(x + w - r, y + h - r, 0);
        if (tail === 'right') pts.push({ x: x + w - r - 10, y: y + h }, { x: x + w - 14, y: y + h + TAIL }, { x: x + w - r - 44, y: y + h });
        if (tail === 'left') pts.push({ x: x + r + 44, y: y + h }, { x: x + 14, y: y + h + TAIL }, { x: x + r + 10, y: y + h });
        arc(x + r, y + h - r, Math.PI / 2);
        pts.push(pts[0]!);
        lb.polyline(pts, 2, col, al);
      };
      const chat = (who: 'you' | 'model', text: string, ellipsis: boolean, x: number, y: number, from: number, to: number) => {
        c.save(); c.font = font(F.archivo(100, 500), 25); c.textAlign = 'left';
        const lines = wrap(c, ellipsis ? text + '…' : text, BW - PAD * 2, LH, 0);
        if (ellipsis) { const l = lines[lines.length - 1]!; l.text = l.text.slice(0, -1); }
        const n = lines.reduce((t, l) => t + l.text.length, 0);
        const done = prog(s, from, to) >= 1;
        const shown = Math.floor(n * prog(s, from, to));
        const box = ease.outCubic(prog(s, from - 0.4, from));
        const h = lines.length * LH + PAD + 10;
        if (box > 0) bubble(x, y, BW, h, who === 'you' ? 'right' : 'left', who === 'you' ? grey : orange, 0.85 * a * box);
        let left = shown;
        lines.forEach((l, k) => {
          const t = l.text.slice(0, Math.max(0, Math.min(l.text.length, left))); left -= l.text.length;
          c.globalAlpha = a; c.fillStyle = rgba('bone', 1); c.fillText(t, x + PAD, y + PAD + 18 + k * LH);
        });
        if (ellipsis && done) {                                          // it is still writing: the ellipsis pulses
          const l = lines[lines.length - 1]!;
          c.globalAlpha = a * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin((s - to) * 5)));
          c.fillText('…', x + PAD + c.measureText(l.text).width, y + PAD + 18 + (lines.length - 1) * LH);
        }
        c.restore();
        return h;
      };
      const ya = 440;
      const hYou = chat('you', 'How much does a raindrop weigh?', false, ART.x1 - BW, ya, 4.4, 5.6);
      const ym = ya + hYou + TAIL + 40;
      c.save(); c.textAlign = 'left';
      c.globalAlpha = a; c.font = font(F.mono(500), 12); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.textAlign = 'right'; c.globalAlpha = a * ease.outCubic(prog(s, 4.0, 4.4)); c.fillText('YOU', ART.x1, ya - 14);
      c.textAlign = 'left'; c.fillStyle = rgba('claude', 1); c.globalAlpha = a * ease.outCubic(prog(s, 6.0, 6.4)); c.fillText('AI MODEL', ART.x0, ym - 14);
      c.restore();
      chat('model', 'That depends on its size. For a raindrop that’s 2mm in diameter we can calculate', true, ART.x0, ym, 6.9, 10.4);
      label('A CALCULATOR', cx, ART.y1 + 40, 1 - m, 'ash');
      label('THE EVERYTHING CALCULATOR. ASK ME ANYTHING.', cx, ART.y1 + 40, m, 'claude');
    }
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
