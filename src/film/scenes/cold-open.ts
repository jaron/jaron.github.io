// Cold open. A: the author's challenge. T: the bridge, a scientific problem drawn as a vector raindrop.
// B: the machine's chain of questions over a wireframe search tree the camera flies through, while the drawing
// annotates itself. C: the title card. Everything is a pure function of time.
import * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { Layer2D, clearRT, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, prog, pulse } from '../engine/util';
import { fillBigText, ruledSheet, wrap } from '../core/draw';
import type { Cue } from '../core/types';
import { COLD_OPEN as C, type Beat } from '../data/cold-open';
import tree from '../data/figures/raindrop.json';

interface TNode { id: string; label: string; kind: 'goal' | 'formula' | 'qty' | 'known'; level: number; row: number; parent?: string; name?: string; value?: string; source?: string }
const NODES = tree.nodes as TNode[];
const BY_ID = new Map(NODES.map((n) => [n.id, n]));

// world layout: levels go right and slightly away from the camera, rows up and down
const POS = (n: TNode) => new THREE.Vector3(n.level * 380, -n.row * 160, -n.level * 70);
const SIZE = (n: TNode) => (n.kind === 'formula' ? { w: 270, h: 74 } : { w: 230, h: 124 });
/** pixel width of a quantity node at the nominal camera distance: the scale text is designed for */
const BASE_NODE_PX = 474;

/** time each node first appears, and when it becomes solved (blue) */
const appear = new Map<string, number>();
const locked = new Map<string, number>();
const solved = new Map<string, number>();
appear.set('F', C.beats[0]!.at);
for (const b of C.beats) {
  for (const id of b.reveal ?? []) appear.set(id, b.at + 0.8);
  if (b.lock) { locked.set(b.lock, b.at + 1.2); solved.set(b.lock, b.at + 1.2); }
}
for (const l of C.ledger) solved.set(l.node, l.at);
solved.set('f1', C.ledger[3]!.at); solved.set('f2', C.ledger[2]!.at); solved.set('f3', C.ledger[1]!.at); solved.set('f4', C.ledger[0]!.at);

const roundRect = (lb: LineBatch, c: THREE.Vector3, w: number, h: number, r: number, k: number, px: number, rgb: [number, number, number], a: number) => {
  const pts: THREE.Vector3[] = [];
  const x0 = c.x - w / 2, x1 = c.x + w / 2, y0 = c.y - h / 2, y1 = c.y + h / 2;
  const arc = (ax: number, ay: number, a0: number) => { for (let i = 0; i <= 5; i++) { const t = a0 + (i / 5) * (Math.PI / 2); pts.push(new THREE.Vector3(ax + Math.cos(t) * r, ay + Math.sin(t) * r, c.z)); } };
  arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI); arc(x1 - r, y0 + r, -Math.PI / 2);
  pts.push(pts[0]!.clone());
  const upto = Math.floor((pts.length - 1) * clamp(k));
  for (let i = 1; i <= upto; i++) lb.seg(pts[i - 1]!.x, pts[i - 1]!.y, pts[i - 1]!.z, pts[i]!.x, pts[i]!.y, pts[i]!.z, px, rgb[0], rgb[1], rgb[2], a);
};

export default class ColdOpen extends Scene {
  private cam = new THREE.PerspectiveCamera(38, W / H, 10, 20000);
  private lb3 = new LineBatch(6000, { screen2D: false, blend: 'add' });
  private lb2 = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();

  /** camera pose at time t: follows each beat's focus node (kept left of centre, low in the frame, below the sentences),
   *  sweeps back along the tree for the ledger, then pulls out to show the whole structure. */
  private pose(t: number) {
    const look = new THREE.Vector3(), pos = new THREE.Vector3();
    const focusPos = (id: string) => POS(BY_ID.get(id)!);
    const keys: { t: number; id: string }[] = [
      ...C.beats.map((b) => ({ t: b.at, id: b.focus })),
      ...C.ledger.map((l) => ({ t: l.at, id: l.node })),
    ];
    let cur = keys[0]!, prev = keys[0]!;
    for (const k of keys) if (t >= k.t) { prev = cur; cur = k; }
    const e = t >= keys[0]!.t ? ease.outExpo(prog(t, cur.t, cur.t + 0.55)) : 0;
    const a = focusPos(prev === cur && t < keys[0]!.t ? cur.id : prev.id), b = focusPos(cur.id);
    const focus = a.clone().lerp(b, prev === cur ? 1 : e);
    const drift = Math.sin(t * 0.6) * 18;
    pos.set(focus.x - 40 + drift, focus.y + 150, focus.z + 760);
    look.set(focus.x + 235, focus.y + 100, focus.z);
    const pull = ease.inOutCubic(prog(t, C.reveal.from, C.reveal.to - 0.6));
    if (pull > 0) {
      const mid = new THREE.Vector3(1520, 20, -280);
      const away = new THREE.Vector3(1520 - 1500 * Math.sin(pull * 0.9), 380 * pull + 40, 2300 * pull + 200);
      pos.lerp(away, pull);
      look.lerp(mid, pull);
    }
    return { pos, look, focusId: cur.id };
  }

  private applyCamera() {
    this.cam.position.copy(this.poseCache.pos);
    this.cam.lookAt(this.poseCache.look);
    this.cam.updateMatrixWorld(true);
  }

  /** screen-space position (px) and depth of a world point under the current camera */
  private toScreen(p: THREE.Vector3) {
    const v = p.clone().project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, z: v.z };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    clearRT(renderer, out, LIN.ink);
    const T = this.text; T.clear();
    const c = T.ctx;
    c.textBaseline = 'alphabetic';
    const lb2 = this.lb2; lb2.clear();
    const lb3 = this.lb3; lb3.clear();
    let shake: [number, number] = [0, 0];
    let flash = 0;

    if (t < C.challenge.end) this.partA(t, c, lb2);
    else this.partB(t, c, lb2, lb3, out);

    // impact shake and lock flash, from the beat times
    for (const b of C.beats) {
      const p = pulse(t, b.at, 0.09);
      if (p > 0.01) shake = [Math.sin(b.at * 91) * 11 * p, Math.cos(b.at * 53) * 8 * p];
      if (b.lock) flash = Math.max(flash, pulse(t, b.at + 1.2, 0.06) * 0.07);
    }
    const ap = pulse(t, C.answer.at, 0.1);
    if (ap > 0.01) { shake = [Math.sin(t * 120) * 20 * ap, Math.cos(t * 97) * 14 * ap]; flash = Math.max(flash, ap * 0.12); }

    if (lb3.count) lb3.render(renderer, out, this.cam);
    lb2.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
    const fade = 1 - prog(t, C.duration - 0.5, C.duration);
    return { bloom: 0.75, shake, flash, fade: 1 - fade };
  }

  private poseCache = { pos: new THREE.Vector3(), look: new THREE.Vector3(), focusId: 'F' };

  // ------------------------------------------------------------------ A: the title, then the challenge
  private partA(t: number, c: CanvasRenderingContext2D, lb: LineBatch) {
    ruledSheet(lb, 0.06);
    const ch = C.challenge, ti = C.title;
    const exit = ease.inOutCubic(prog(t, ch.exitAt, ch.end));
    const keep = 1 - exit;
    c.textBaseline = 'alphabetic';

    // the title card opens the film: big type slams in, then clears away for the date and the challenge
    const tOut = ease.inOutCubic(prog(t, ti.exitAt, ti.end));
    if (tOut < 1) {
      c.save();
      c.globalAlpha = 1 - tOut;
      ti.lines.forEach((l, i) => {
        const p = ease.outExpo(prog(t, 0.3 + i * 0.32, 0.3 + i * 0.32 + 0.45));
        if (p <= 0) return;
        c.save(); c.globalAlpha *= clamp(p * 3);
        c.fillStyle = rgba('bone', 1);
        fillBigText(c, l, F.archivo(100, 900), 188, 90, 330 + i * 172 + (1 - p) * 56 - tOut * 40);
        c.restore();
      });
      const tp = ease.outExpo(prog(t, 1.45, 1.9));
      if (tp > 0) {
        c.save(); c.globalAlpha *= clamp(tp * 3);
        c.fillStyle = rgba('signal', 1);
        fillBigText(c, ti.tag, F.archivo(100, 700), 84, 96, 330 + 3 * 172 - 6 + (1 - tp) * 30 - tOut * 40);
        c.restore();
      }
      const sp = ease.outCubic(prog(t, 2.0, 2.5));
      if (sp > 0) {
        c.save(); c.globalAlpha *= sp;
        c.font = font(F.mono(500), 22); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
        c.fillText(ti.sub.toUpperCase(), 96, 960); c.letterSpacing = '0px';
        c.restore();
      }
      lb.seg2(96, 925, 96 + 220 * ease.outExpo(prog(t, 1.8, 2.4)), 925, 2, LIN.signal, 1 - tOut);
      c.restore();
    }

    // the date: a small caption, with a rule
    const dp = prog(t, ch.dateAt, ch.dateAt + 0.4);
    if (dp > 0) {
      c.save(); c.globalAlpha = dp * keep;
      c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
      c.fillText(ch.date, 96, 140); c.letterSpacing = '0px';
      c.restore();
    }
    lb.seg2(96, 168, 96 + 1728 * ease.outExpo(prog(t, ch.dateAt, ch.dateAt + 0.8)) * keep, 168, 1, LIN.bone, 0.35);

    // the quote, word by word, in big Archivo; at the end it clears away, handing over to the drawing
    c.font = font(F.archivo(100, 600), 64);
    const lines = wrap(c, ch.text, 1560, 96, 330);
    const empStart = ch.text.indexOf(ch.emphasis);
    let wi = 0, pos = 0;
    for (const line of lines) {
      let xx = 96;
      for (const w of line.text.split(' ')) {
        const at = ch.wordsFrom + wi * ch.wordGap;
        const p = prog(t, at, at + 0.22, ease.outCubic);
        const isEmp = pos >= empStart;
        if (p > 0) {
          c.save(); c.globalAlpha = p * keep;
          c.font = font(F.archivo(100, isEmp ? 800 : 600), 64);
          c.fillStyle = isEmp ? rgba('signal', 1) : rgba('bone', 0.96);
          c.fillText(w, xx, line.y + (1 - p) * 18 - exit * 46);
          c.restore();
        }
        c.font = font(F.archivo(100, isEmp ? 800 : 600), 64);
        xx += c.measureText(w + ' ').width;
        pos += w.length + 1; wi++;
      }
    }
  }

  // ------------------------------------------------------------------ B: the problem, then the chain of questions
  private partB(t: number, c: CanvasRenderingContext2D, lb2: LineBatch, lb3: LineBatch, _out: THREE.WebGLRenderTarget) {
    ruledSheet(lb2, 0.05);
    this.poseCache = this.pose(t);
    this.applyCamera();
    const reveal = prog(t, C.reveal.from, C.reveal.to);
    const first = C.beats[0]!.at;
    if (t >= first - 0.4) this.drawTree(t, lb3, c, reveal);

    // the drawing: a vector raindrop with measurement bars; big at first, then it tucks into the top-right corner
    this.drawFigure(t, c, lb2);

    // the problem statement: typed large beside the drawing, then it shrinks to a caption in the corner
    const pb = C.problem;
    const pr = pb.prompt;
    const shrink = ease.inOutCubic(prog(t, first - 0.6, first));
    const typed = Math.floor(pr.text.length * prog(t, pr.from, pr.to));
    const lab = prog(t, pb.drawFrom, pb.drawFrom + 0.4) * (1 - shrink);
    if (lab > 0) {
      c.save(); c.globalAlpha = lab;
      c.font = font(F.mono(500), 20); c.letterSpacing = '5px'; c.fillStyle = rgba('signal', 1);
      c.fillText(pb.label, 96, 340); c.letterSpacing = '0px';
      c.restore();
    }
    if (typed > 0) {
      const size = lerp(54, 21, shrink);
      c.font = font(F.archivo(100, 700), size);
      const lines = wrap(c, pr.text, lerp(960, 1100, shrink), size * 1.32, lerp(430, 128, shrink));
      c.fillStyle = rgba('bone', lerp(1, 0.78, shrink));
      for (const line of lines) {
        const shown = Math.max(0, Math.min(line.text.length, typed - line.start));
        if (shown > 0) c.fillText(line.text.slice(0, shown), 96, line.y);
      }
      if (shrink < 0.01 && typed < pr.text.length + 6 && Math.floor(t * 3) % 2 === 0) {
        const last = lines[lines.length - 1]!;
        const w = c.measureText(last.text.slice(0, Math.max(0, typed - last.start))).width;
        c.fillStyle = rgba('signal', 1); c.fillRect(96 + w + 6, last.y - size * 0.8, 5, size * 0.95);
      }
    }

    // the questions and answers, in a band across the top; the tree and its values sit below
    const lastBeat = C.beats[C.beats.length - 1]!;
    let live: Beat | null = null;
    for (const b of C.beats) if (t >= b.at && t < b.at + C.beatLen) live = b;
    if (!live && t >= lastBeat.at && t < C.workBack.at) live = lastBeat;
    if (live) this.drawBeat(t, c, live);
    if (t >= C.workBack.at) this.drawWorkBack(t, c);

    // the reveal caption
    const cap = prog(t, C.reveal.captionAt, C.reveal.captionAt + 0.7, ease.outCubic);
    if (cap > 0) {
      c.save(); c.globalAlpha = cap;
      c.font = font(F.mono(500), 17); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
      c.fillText('GOAL-DIRECTED SEARCH · 1996', 96, 930); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 600), 40); c.fillStyle = rgba('bone', 1);
      c.fillText(C.reveal.caption, 96, 984);
      c.restore();
    }
  }

  private static readonly COLW = 1060;
  private static readonly TOP = 262;

  /** question and answer as full sentences in the band across the top, with a plain sub-line */
  private drawBeat(t: number, c: CanvasRenderingContext2D, b: Beat) {
    const lt = t - b.at;
    const COLW = ColdOpen.COLW;
    const qp = ease.outExpo(prog(lt, 0, 0.22));
    c.save();
    c.globalAlpha = clamp(qp * 3);
    c.font = font(F.archivo(100, 900), 84 * (1 + (1 - qp) * 0.08));
    c.fillStyle = rgba('bone', 1);
    const qLines = wrap(c, b.q, COLW, 90, ColdOpen.TOP + (1 - qp) * 26);
    for (const l of qLines) c.fillText(l.text, 90, l.y);
    c.restore();
    const qBottom = ColdOpen.TOP + (qLines.length - 1) * 90;

    const ap = ease.outExpo(prog(lt, 1.0, 1.3));
    if (ap > 0) {
      c.save();
      c.globalAlpha = clamp(ap * 3);
      c.font = font(F.archivo(100, 800), 50);
      c.fillStyle = rgba('signal', 1);
      const aLines = wrap(c, b.a, COLW, 60, qBottom + 66);
      for (const l of aLines) c.fillText(l.text, 96 + (1 - ap) * 80, l.y);
      c.restore();
      if (b.sub) {
        const known = b.sub.startsWith('KNOWN');
        c.save();
        c.globalAlpha = clamp((lt - 1.25) * 3);
        c.font = font(F.mono(500), 22); c.letterSpacing = '3px';
        c.fillStyle = known ? rgba('ember', 1) : rgba('ash', 1);
        c.fillText(b.sub, 98, qBottom + 66 + (aLines.length - 1) * 60 + 38);
        c.restore();
      }
    }
  }

  /** "Now work back up." then each rule as its value fills in, then the point of it all */
  private drawWorkBack(t: number, c: CanvasRenderingContext2D) {
    const wb = C.workBack;
    const qp = ease.outExpo(prog(t - wb.at, 0, 0.22));
    const fadeOut = 1 - prog(t, C.reveal.from + 0.4, C.reveal.from + 1.2);
    c.save();
    c.globalAlpha = clamp(qp * 3) * fadeOut;
    c.font = font(F.archivo(100, 900), 84 * (1 + (1 - qp) * 0.08));
    c.fillStyle = rgba('bone', 1);
    c.fillText(wb.q, 90, ColdOpen.TOP + (1 - qp) * 26);
    c.restore();
    let line = '';
    let at = C.ledger[0]!.at;
    for (const l of C.ledger) if (t >= l.at) { line = l.say; at = l.at; }
    if (t >= C.answer.at) { line = C.answer.text; at = C.answer.at; }
    if (line) {
      const p = ease.outExpo(prog(t, at, at + 0.25));
      c.save();
      c.globalAlpha = clamp(p * 3) * fadeOut;
      c.font = font(F.archivo(100, 800), 50);
      c.fillStyle = rgba('signal', 1);
      c.fillText(line, 96 + (1 - p) * 60, ColdOpen.TOP + 78);
      c.restore();
    }
  }

  /**
   * The vector raindrop with its measurement bars and the downward arrow. Big at first (the bridge), then it moves
   * to the top-right as the chain of questions starts. It starts as a teardrop and rounds into a sphere when the
   * machine says "it's a sphere"; the right half of the bar lights up for "just halve it"; the arrow turns blue
   * when the force is found. (The values live in the tree, not here.)
   */
  private drawFigure(t: number, c: CanvasRenderingContext2D, lb: LineBatch) {
    const pb = C.problem;
    if (t < pb.drawFrom) return;
    const fade = 1 - prog(t, C.reveal.from - 0.1, C.reveal.from + 0.6);
    if (fade <= 0) return;
    const first = C.beats[0]!.at;
    const fs = ease.inOutCubic(prog(t, first - 0.6, first));          // 0 = big bridge layout, 1 = tucked top-right
    const cx = lerp(1580, 1690, fs), cy = lerp(500, 330, fs), R = lerp(125, 72, fs), arrowLen = lerp(210, 108, fs);
    const bone = LIN.bone, sig = LIN.signal;
    const beatAt = (i: number) => C.beats[i]!.at;

    const roundT = beatAt(4) + 1.0;
    const tip = 1 - ease.inOutCubic(prog(t, roundT, roundT + 0.6));
    const k = ease.inOutCubic(prog(t, pb.drawFrom, pb.drawFrom + 1.1));
    const N = 72;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const d = Math.min(th, Math.PI * 2 - th);
      const bump = Math.exp(-((d / 0.62) ** 2));
      pts.push({ x: cx + R * Math.sin(th) * (1 - tip * 0.6 * bump), y: cy - R * Math.cos(th) - tip * R * 0.95 * bump + tip * R * 0.18 });
    }
    const upto = Math.floor(N * k);
    lb.polyline(pts.slice(0, upto + 1), 2.4, bone, fade);
    if (k > 0.4) lb.polyline(pts.slice(0, upto + 1), 7, bone, 0.07 * fade);

    // the diameter bar, with end ticks and arrowheads
    const barK = ease.outExpo(prog(t, pb.barFrom, pb.barFrom + 0.5));
    const dLocked = t >= beatAt(6) + 1.2;
    const dCol = dLocked ? sig : bone;
    if (barK > 0) {
      lb.seg2(cx - R * barK, cy, cx + R * barK, cy, 1.6, dCol, fade);
      if (barK > 0.98) for (const [x, dir] of [[cx - R, 1], [cx + R, -1]] as const) {
        lb.seg2(x, cy - 14, x, cy + 14, 1.6, dCol, fade);
        lb.seg2(x, cy, x + dir * 12, cy - 5, 1.6, dCol, fade);
        lb.seg2(x, cy, x + dir * 12, cy + 5, 1.6, dCol, fade);
      }
    }
    // the radius: the right half of the bar, highlighted
    const rk = ease.outExpo(prog(t, beatAt(5) + 1.1, beatAt(5) + 1.6));
    if (rk > 0) { lb.seg2(cx, cy, cx + R * rk, cy, 4, sig, fade); lb.seg2(cx, cy - 11, cx, cy + 11, 2.4, sig, fade); }
    // the force: a downward arrow with a question mark, blue once found
    const arrowK = ease.outExpo(prog(t, pb.arrowFrom, pb.arrowFrom + 0.5));
    const ay0 = cy + R + 12, ay1 = ay0 + arrowLen * arrowK;
    const found = t >= C.answer.at;
    const aCol = found ? sig : bone;
    if (arrowK > 0) {
      const w = found ? 4 : 2.4;
      lb.seg2(cx, ay0, cx, ay1, w, aCol, fade);
      if (arrowK > 0.9) { lb.seg2(cx, ay1, cx - 14, ay1 - 22, w, aCol, fade); lb.seg2(cx, ay1, cx + 14, ay1 - 22, w, aCol, fade); }
      if (found) lb.seg2(cx, ay0, cx, ay1, 12, sig, 0.25 * fade);
    }

    c.save();
    c.globalAlpha = fade;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'center';
    if (barK > 0.9) {
      c.font = font(F.mono(500), lerp(22, 17, fs));
      c.fillStyle = dLocked ? rgba('signal', 1) : rgba('ash', 1);
      c.fillText(dLocked ? 'd = 1 mm' : '1 mm', cx, cy - 16);
    }
    if (rk > 0.5) { c.font = font(F.mono(500), lerp(22, 17, fs)); c.fillStyle = rgba('signal', 1); c.fillText('r', cx + R / 2, cy + 30); }
    const qk = ease.outExpo(prog(t, pb.arrowFrom + 0.35, pb.arrowFrom + 0.65));
    if (qk > 0 && !found) {
      c.font = font(F.archivo(100, 900), lerp(120, 64, fs) * (1 + (1 - qk) * 0.4)); c.fillStyle = rgba('signal', clamp(qk * 3));
      c.fillText('?', cx, ay1 + lerp(112, 62, fs));
    }
    c.restore();
  }

  /** the wireframe tree, with each node carrying its property name, its value and where the value came from */
  private drawTree(t: number, lb: LineBatch, c: CanvasRenderingContext2D, reveal: number) {
    // faint ground for depth
    for (let i = -6; i <= 14; i++) lb.seg(i * 380, -480, 200, i * 380, -480, -1100, 1, LIN.graphite[0], LIN.graphite[1], LIN.graphite[2], 0.05 + 0.04 * reveal);
    for (let k = 0; k <= 8; k++) lb.seg(-2000, -480, 200 - k * 160, 5800, -480, 200 - k * 160, 1, LIN.graphite[0], LIN.graphite[1], LIN.graphite[2], 0.05 + 0.04 * reveal);

    const dim = lerp(0.8, 1, reveal);
    const textFade = 1 - prog(t, C.reveal.from, C.reveal.from + 0.8);
    for (const n of NODES) {
      const at = appear.get(n.id);
      if (at === undefined || t < at) continue;
      const k = prog(t, at, at + 0.4, ease.outCubic);
      const p = POS(n), s = SIZE(n);
      // a node that would sit behind the sentences (other than the one the camera is on) is dimmed right down
      const sc0 = this.toScreen(p);
      const inBand = sc0.z < 1 && sc0.y < 650 && n.id !== this.poseCache.focusId && t < C.reveal.from;
      const bd = inBand ? 0.22 : 1;
      const sAt = solved.get(n.id);
      const isSolved = sAt !== undefined && t >= sAt;
      const sk = isSolved ? ease.outExpo(prog(t, sAt!, sAt! + 0.5)) : 0;
      const col = isSolved ? LIN.signal : LIN.bone;
      if (n.parent) {
        const par = BY_ID.get(n.parent)!, pp = POS(par), ps = SIZE(par);
        const ek = ease.inOutCubic(prog(t, at - 0.15, at + 0.3));
        const a = new THREE.Vector3(pp.x + ps.w / 2, pp.y, pp.z), b = new THREE.Vector3(p.x - s.w / 2, p.y, p.z);
        let prev = a.clone();
        const steps = 18;
        for (let i = 1; i <= Math.floor(steps * ek); i++) {
          const u = i / steps, sm = u * u * (3 - 2 * u);
          const q = new THREE.Vector3(lerp(a.x, b.x, u), lerp(a.y, b.y, sm), lerp(a.z, b.z, u));
          lb.seg(prev.x, prev.y, prev.z, q.x, q.y, q.z, isSolved ? 2.4 : 1.4, col[0], col[1], col[2], (isSolved ? 0.95 : 0.55) * dim * bd);
          prev = q;
        }
      }
      roundRect(lb, p, s.w, s.h, n.kind === 'formula' ? 6 : 18, k, n.kind === 'goal' ? 3 : 1.7, col, (0.6 + 0.4 * sk) * dim * k * bd);
      if (isSolved) roundRect(lb, p, s.w + 14, s.h + 14, n.kind === 'formula' ? 9 : 24, 1, 5, LIN.signal, 0.5 * (1 - sk * 0.5) * dim * bd);

      // text on the node: projected into the frame, scaled with the node
      if (k < 0.55 || textFade <= 0 || inBand) continue;
      const sc = sc0;
      if (sc.z > 1) continue;
      const wpx = Math.abs(this.toScreen(new THREE.Vector3(p.x + s.w / 2, p.y, p.z)).x - this.toScreen(new THREE.Vector3(p.x - s.w / 2, p.y, p.z)).x);
      if (wpx < 100 || sc.x < -wpx || sc.x > W + wpx) continue;
      const kk = wpx / BASE_NODE_PX * (n.kind === 'formula' ? 474 / 474 : 1);
      c.save();
      c.globalAlpha = clamp((k - 0.55) * 2.2) * textFade;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      if (n.kind === 'formula') {
        c.font = font(F.mono(500), 31 * kk);
        c.fillStyle = isSolved ? rgba('ember', 1) : rgba('bone', 1);
        c.fillText(n.label, sc.x, sc.y + 10 * kk);
      } else {
        c.font = font(F.mono(500), 20 * kk); c.letterSpacing = `${3 * kk}px`;
        c.fillStyle = rgba('ash', 1);
        c.fillText(n.name ?? '', sc.x, sc.y - 30 * kk);
        c.letterSpacing = '0px';
        const pop = isSolved ? 1 + 0.12 * (1 - sk) : 1;
        c.font = font(F.archivo(100, 800), (isSolved ? 50 : 62) * kk * pop);
        c.fillStyle = isSolved ? rgba('bone', 1) : rgba('signal', 1);
        c.fillText(isSolved ? (n.value ?? '') : '?', sc.x, sc.y + 24 * kk);
        if (isSolved) {
          c.globalAlpha *= clamp(sk * 1.5);
          c.font = font(F.mono(400), 17 * kk);
          c.fillStyle = n.kind === 'known' ? rgba('ember', 1) : rgba('ash', 1);
          c.fillText(n.source ?? '', sc.x, sc.y + 52 * kk);
        }
      }
      c.restore();
    }
  }

  /** sound cues in film time (scene start is 0) */
  cues(start: number): Cue[] {
    const cues: Cue[] = [];
    const add = (t: number, voice: Cue['voice'], gain = 1, pitch = 1) => cues.push({ t: start + t, voice, gain, pitch });
    const ch = C.challenge, pb = C.problem;
    C.title.lines.forEach((_, i) => add(0.3 + i * 0.32, 'stamp', 0.8, 0.85 + i * 0.12));
    add(1.45, 'reveal', 0.5, 1.1);
    const nW = ch.text.split(' ').length;
    for (let i = 0; i < nW; i += 2) add(ch.wordsFrom + i * ch.wordGap, 'type', 0.22);
    // the bridge: the drop draws, the bar, the arrow, the question mark
    add(pb.drawFrom, 'morph', 0.35);
    add(pb.barFrom, 'reveal', 0.5);
    add(pb.arrowFrom, 'reveal', 0.45, 0.8);
    add(pb.arrowFrom + 0.38, 'stamp', 0.85, 1.1);
    for (let tt = pb.prompt.from; tt < pb.prompt.to; tt += 0.16) add(tt, 'type', 0.2);
    for (const b of C.beats) {
      add(b.at, 'stamp', 0.65);
      add(b.at + 1.0, 'reveal', 0.5);
      if (b.lock) add(b.at + 1.2, 'lock', 0.7);
    }
    add(C.beats[4]!.at + 1.0, 'step', 0.4, 0.9);      // the teardrop rounds into a sphere
    add(C.beats[5]!.at + 1.1, 'step', 0.4, 1.2);      // the radius appears
    add(C.workBack.at, 'stamp', 0.7, 0.9);
    C.ledger.forEach((l, i) => add(l.at, 'step', 0.6, 0.8 + i * 0.22));
    add(C.answer.at, 'lock', 0.8, 1.2); add(C.answer.at, 'stamp', 0.5, 1.1);
    add(C.reveal.from, 'morph', 0.45);
    return cues.sort((a, b) => a.t - b.t);
  }
}
