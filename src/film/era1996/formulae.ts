// 1996 beat, scene 2: how the program found the few formulae that mattered.
//   1. a field of 122 formulae; the goal symbol lights the cards that contain it (exact match, by symbol)
//   2. each formula needs more quantities, so the choices multiply (3 per step over 20 levels = 3.5 billion paths)
//   3. a light-touch card: "easy to check, hard to find" is the shape P versus NP is about (hindsight, not thesis)
//   4. the hand-written rule that made it workable: try the formula with the fewest unknowns first
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import { clamp, ease, lerp, mulberry32, prog } from '../engine/util';
import { fillBigText, wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

interface Cand { formula: string; unknowns: string[] }
interface Data { sentence: string; caption: string; goal: string; field: number; candidates: Cand[]; others: string[]; branching: number; depth: number }

// timeline inside the beat (seconds)
const T_FIELD = 0.4, T_GOAL = 2.0, T_TREE = 4.6, T_CARD = 8.4, T_RANK = 12.0;
const LEVELS = 6;                       // levels actually drawn; the counter then jumps to the real depth (20)
const LEVEL_GAP = 0.42;
const COLS = 14, CARD_W = 108, CARD_H = 50, GAP = 14, FIELD_X = 113, FIELD_Y = 345;
const TREE_X0 = 130, TREE_DX = 158, TREE_TOP = 370, TREE_H = 520;
const BEST_PATH = [1, 0, 1, 1, 0, 1];   // an arbitrary path through the tree for the "best first" highlight

const pow3 = (n: number) => Math.pow(3, n);
const fmt = (n: number) => n.toLocaleString('en-US');

export default class FormulaeRenderer implements Era1996Renderer {
  private lb = new LineBatch(5000, { blend: 'add' });
  private text = new Layer2D();
  private d!: Data;
  private ctx!: SceneCtx;
  private slots: { x: number; y: number }[] = [];
  private named = new Map<number, string>();     // slot -> formula text
  private candSlots: number[] = [];
  private blankLines: { a: number; b: number }[] = [];

  init(content: SceneContent, ctx: SceneCtx) {
    this.d = content.era1996.data as unknown as Data;
    this.ctx = ctx;
    for (let i = 0; i < this.d.field; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      this.slots.push({ x: FIELD_X + col * (CARD_W + GAP), y: FIELD_Y + row * (CARD_H + GAP) });
    }
    // candidates sit well apart; the other named formulae are scattered by a fixed seed
    this.candSlots = [19, 58, 96];
    this.d.candidates.forEach((c, i) => this.named.set(this.candSlots[i]!, c.formula));
    const rnd = mulberry32(11);
    const taken = new Set(this.candSlots);
    for (const f of this.d.others) {
      let s = Math.floor(rnd() * this.d.field);
      while (taken.has(s)) s = (s + 1) % this.d.field;
      taken.add(s); this.named.set(s, f);
    }
    const r2 = mulberry32(5);
    for (let i = 0; i < this.d.field; i++) this.blankLines.push({ a: 0.35 + r2() * 0.5, b: 0.2 + r2() * 0.55 });
  }

  /** world position of tree node (level d, index k) */
  private node(d: number, k: number) {
    const span = pow3(LEVELS - d);
    const leaf = k * span + (span - 1) / 2;
    return { x: TREE_X0 + d * TREE_DX, y: TREE_TOP + (leaf / pow3(LEVELS)) * TREE_H };
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
    c.fillText(d.caption.toUpperCase(), 1824, 140); c.textAlign = 'left'; c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    // the question, typed
    c.font = font(F.archivo(100, 500), 30);
    const qLines = wrap(c, d.sentence, 1560, 40, 226);
    const typed = Math.floor(d.sentence.length * prog(lt, 0.15, 1.9));
    c.fillStyle = rgba('bone', 0.92);
    for (const l of qLines) { const n = Math.max(0, Math.min(l.text.length, typed - l.start)); if (n > 0) c.fillText(l.text.slice(0, n), 96, l.y); }

    const fieldA = 1 - 0.86 * ease.inOutCubic(prog(lt, T_TREE - 0.3, T_TREE + 0.4));      // the field recedes while the tree grows
    const fieldBack = lt >= T_RANK - 0.2 ? 0 : 1;
    // ---- 1. the field of formulae
    if (fieldBack) {
      c.save();
      this.slots.forEach((s, i) => {
        const a = ease.outCubic(prog(lt, T_FIELD + (i / this.d.field) * 1.3, T_FIELD + (i / this.d.field) * 1.3 + 0.3)) * fieldA;
        if (a <= 0) return;
        const name = this.named.get(i);
        const candIdx = this.candSlots.indexOf(i);
        const hit = candIdx >= 0 ? ease.outExpo(prog(lt, T_GOAL + 0.5 + candIdx * 0.35, T_GOAL + 0.5 + candIdx * 0.35 + 0.4)) : 0;
        const col = hit > 0 ? sig : LIN.graphite;
        const w = hit > 0 ? 2 : 1;
        const al = (hit > 0 ? 0.4 + 0.6 * hit : 0.55) * a;
        lb.polyline([{ x: s.x, y: s.y }, { x: s.x + CARD_W, y: s.y }, { x: s.x + CARD_W, y: s.y + CARD_H }, { x: s.x, y: s.y + CARD_H }, { x: s.x, y: s.y }], w, col, al);
        if (hit > 0) lb.polyline([{ x: s.x - 3, y: s.y - 3 }, { x: s.x + CARD_W + 3, y: s.y - 3 }, { x: s.x + CARD_W + 3, y: s.y + CARD_H + 3 }, { x: s.x - 3, y: s.y + CARD_H + 3 }, { x: s.x - 3, y: s.y - 3 }], 5, sig, 0.3 * (1 - hit * 0.4) * a);
        if (name) {
          c.globalAlpha = a; c.textAlign = 'center';
          c.font = font(F.mono(500), 14.5); c.fillStyle = hit > 0 ? rgba('bone', 1) : rgba('ash', 0.95);
          c.fillText(name, s.x + CARD_W / 2, s.y + CARD_H / 2 + 5);
        } else {
          const b = this.blankLines[i]!;
          lb.seg2(s.x + 14, s.y + 19, s.x + 14 + (CARD_W - 28) * b.a, s.y + 19, 1, LIN.graphite, 0.22 * a);
          lb.seg2(s.x + 14, s.y + 31, s.x + 14 + (CARD_W - 28) * b.b, s.y + 31, 1, LIN.graphite, 0.22 * a);
        }
      });
      c.restore();
    }
    // labels for acts 1
    c.textAlign = 'left';
    if (lt >= T_FIELD && lt < T_TREE + 0.2) {
      const a = ease.outCubic(prog(lt, T_FIELD, T_FIELD + 0.5)) * fieldA;
      c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 16); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.textAlign = 'right'; c.fillText(`${d.field} FORMULAE IN THE KNOWLEDGE BASE · A FEW SHOWN`, 1824, 322); c.restore();
    }
    const goalA = ease.outCubic(prog(lt, T_GOAL, T_GOAL + 0.4)) * fieldA;
    if (goalA > 0.01 && lt < T_RANK) {
      c.save(); c.globalAlpha = goalA;
      c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
      c.fillText(`GOAL  ${d.goal} = ?   (THE MASS OF THE GAS)`, 96, 322);
      c.fillStyle = rgba('ash', 1);
      c.fillText('STEP 1 · FIND THE FORMULAE THAT CONTAIN THE GOAL, BY SYMBOL', 96, 948);
      c.restore();
    }

    // ---- 2. the choices multiply
    const treeA = lt < T_CARD ? 0.5 : lerp(0.5, 0.12, ease.inOutCubic(prog(lt, T_CARD, T_CARD + 0.5)));
    const rankP = ease.inOutCubic(prog(lt, T_RANK, T_RANK + 0.6));
    const levelP = (lvl: number) => ease.outExpo(prog(lt, T_TREE + lvl * LEVEL_GAP, T_TREE + lvl * LEVEL_GAP + 0.4));
    if (lt >= T_TREE) {
      const root = this.node(0, 0);
      lb.seg2(root.x, root.y, root.x + 0.01, root.y, 18, sig, 0.9 * Math.max(treeA, 0.4));
      for (let lv = 0; lv < LEVELS; lv++) {
        const p = levelP(lv + 1);
        if (p <= 0) continue;
        const nodes = pow3(lv);
        for (let k = 0; k < nodes; k++) {
          const a = this.node(lv, k);
          for (let ch = 0; ch < 3; ch++) {
            const b = this.node(lv + 1, k * 3 + ch);
            const onPath = this.onBestPath(lv, k, ch);
            const worst = ch === 2 && rankP > 0;                      // the formula the heuristic would try last
            const al = (onPath && rankP > 0 ? 1 : treeA * (1 - 0.65 * rankP * (worst ? 1 : 0.4))) * p;
            const x2 = a.x + (b.x - a.x) * p, y2 = a.y + (b.y - a.y) * p;
            lb.seg2(a.x, a.y, x2, y2, onPath && rankP > 0 ? 3.2 : 1, sig, al);
            if (onPath && rankP > 0) lb.seg2(a.x, a.y, x2, y2, 11, sig, 0.28 * rankP * p);
          }
        }
      }
    }
    // the counter
    this.drawCounter(lt, c);

    // ---- 3. the light-touch card
    const cardP = ease.outExpo(prog(lt, T_CARD, T_CARD + 0.45)) * (1 - ease.inOutCubic(prog(lt, T_RANK - 0.5, T_RANK)));
    if (cardP > 0.01) this.drawCard(c, lb, cardP, lt - T_CARD);

    // ---- 4. the heuristic
    if (lt >= T_RANK - 0.2) this.drawRank(lt, c, lb);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
    void W; void H;
  }

  private onBestPath(lv: number, k: number, ch: number) {
    // is edge (lv,k)->(lv+1,3k+ch) on BEST_PATH?
    let idx = 0;
    for (let i = 0; i < lv; i++) idx = idx * 3 + BEST_PATH[i]!;
    return idx === k && BEST_PATH[lv] === ch;
  }

  private drawCounter(lt: number, c: CanvasRenderingContext2D) {
    if (lt < T_TREE + LEVEL_GAP) return;
    const d = this.d;
    const lastLevel = Math.min(LEVELS, Math.max(1, Math.floor((lt - T_TREE) / LEVEL_GAP)));
    const jump = prog(lt, T_TREE + LEVELS * LEVEL_GAP + 0.25, T_TREE + LEVELS * LEVEL_GAP + 0.4);
    const out = 1 - ease.inOutCubic(prog(lt, T_CARD - 0.1, T_CARD + 0.4)) * 0.0;   // stays, smaller, behind the card
    const showDeep = jump > 0;
    const exp = showDeep ? d.depth : lastLevel;
    const val = Math.pow(d.branching, exp);
    const al = lt >= T_CARD ? lerp(1, 0.0, ease.inOutCubic(prog(lt, T_CARD - 0.1, T_CARD + 0.4))) : 1;
    if (al <= 0.01) return;
    c.save(); c.globalAlpha = al * out;
    const x = 1096, y = 300;
    c.textAlign = 'right';
    c.font = font(F.mono(500), 16); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
    c.fillText(showDeep ? 'IF EACH OF 20 STEPS HAS 3 CHOICES' : 'PATHS TO TRY', 1824, y);
    c.letterSpacing = '0px';
    c.textAlign = 'left';
    // "3", a raised exponent, then "= n": big parts from outlines, the exponent as text; right-aligned in its own column
    const bigFam = F.archivo(100, 900);
    const num = fmt(val);
    const bigSize = showDeep ? 66 : 120;
    const wBase = measure('3', bigFam, bigSize);
    const expTxt = String(exp);
    const wExp = expTxt.length * 31 + 8;
    const wEq = measure(`= ${num}`, bigFam, bigSize);
    const startX = 1824 - (wBase + wExp + wEq + 16);
    c.fillStyle = rgba('bone', 1);
    fillBigText(c, '3', bigFam, bigSize, startX, y + 130);
    c.font = font(F.archivo(100, 800), showDeep ? 40 : 56); c.fillStyle = rgba('signal', 1);
    c.fillText(expTxt, startX + wBase + 4, y + 130 - bigSize * 0.62);
    c.fillStyle = rgba('bone', 1);
    fillBigText(c, `= ${num}`, bigFam, bigSize, startX + wBase + wExp + 16, y + 130);
    c.restore();
    if (showDeep) {
      const a = ease.outCubic(jump);
      c.save(); c.globalAlpha = a * al;
      c.font = font(F.mono(500), 16); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
      c.fillText('SOME SEARCHES FOR MASS ARE', 1824, y + 190);
      c.fillText('AROUND 20 LEVELS DEEP · THESIS P.92', 1824, y + 214);
      c.fillText('(AN ILLUSTRATION: THREE CHOICES AT EVERY STEP)', 1824, y + 250);
      c.restore();
    }
    void x;
  }

  private drawCard(c: CanvasRenderingContext2D, lb: LineBatch, p: number, t: number) {
    // a dark panel over the tree, with the idea in plain words
    const panelX = 96, panelY = 330, panelW = 1728, panelH = 470;
    c.save(); c.globalAlpha = p * 0.93; c.fillStyle = 'rgba(5,5,7,1)'; c.fillRect(panelX, panelY, panelW, panelH); c.restore();
    lb.polyline([{ x: panelX, y: panelY }, { x: panelX + panelW, y: panelY }, { x: panelX + panelW, y: panelY + panelH }, { x: panelX, y: panelY + panelH }, { x: panelX, y: panelY }], 1.4, LIN.signal, 0.7 * p);
    c.save(); c.globalAlpha = p;
    c.font = font(F.mono(500), 20); c.letterSpacing = '5px'; c.fillStyle = rgba('signal', 1);
    c.fillText('P  ≠  NP', panelX + 48, panelY + 70); c.letterSpacing = '0px';
    c.fillStyle = rgba('bone', 1);
    const l1 = ease.outExpo(prog(t, 0.2, 0.7)), l2 = ease.outExpo(prog(t, 0.6, 1.1));
    c.globalAlpha = p * clamp(l1 * 3);
    fillBigText(c, 'Easy to check.', F.archivo(100, 900), 112, panelX + 44, panelY + 200 + (1 - l1) * 30);
    c.globalAlpha = p * clamp(l2 * 3);
    fillBigText(c, 'Hard to find.', F.archivo(100, 900), 112, panelX + 44, panelY + 330 + (1 - l2) * 30);
    const l3 = ease.outCubic(prog(t, 1.4, 1.9));
    c.globalAlpha = p * l3;
    c.font = font(F.archivo(100, 500), 28); c.fillStyle = rgba('bone', 0.9);
    c.fillText('This shape has a name: P versus NP. Whether finding is ever fundamentally harder than checking is unproven.', panelX + 48, panelY + 404);
    c.fillText('Most researchers believe it is. So search needs shortcuts.', panelX + 48, panelY + 442);
    c.restore();
  }

  private drawRank(lt: number, c: CanvasRenderingContext2D, lb: LineBatch) {
    const p = ease.outExpo(prog(lt, T_RANK, T_RANK + 0.5));
    const d = this.d;
    c.save(); c.globalAlpha = p;
    // the ranking panel
    const x0 = 1180, y0 = 420, w = 644;
    c.font = font(F.mono(500), 16); c.letterSpacing = '4px'; c.fillStyle = rgba('signal', 1);
    c.fillText('STEP 2 · TRY THE FEWEST UNKNOWNS FIRST', x0, y0 - 28); c.letterSpacing = '0px';
    const rows = d.candidates.map((cd, i) => ({ ...cd, i })).sort((a, b) => a.unknowns.length - b.unknowns.length || a.i - b.i);
    rows.forEach((r, k) => {
      const a = ease.outCubic(prog(lt, T_RANK + 0.4 + k * 0.3, T_RANK + 0.8 + k * 0.3));
      const y = y0 + k * 84;
      c.save(); c.globalAlpha = p * a;
      const last = k === rows.length - 1;
      lb.polyline([{ x: x0, y }, { x: x0 + w, y }, { x: x0 + w, y: y + 62 }, { x: x0, y: y + 62 }, { x: x0, y }], last ? 1 : 2, last ? LIN.graphite : LIN.signal, (last ? 0.6 : 0.9) * p * a);
      c.font = font(F.mono(500), 26); c.fillStyle = last ? rgba('ash', 1) : rgba('bone', 1);
      c.fillText(r.formula, x0 + 20, y + 40);
      c.textAlign = 'right'; c.font = font(F.mono(400), 17); c.fillStyle = last ? rgba('ash', 1) : rgba('signal', 1);
      c.fillText(`${r.unknowns.length} unknown${r.unknowns.length > 1 ? 's' : ''}  (${r.unknowns.join(', ')})`, x0 + w - 18, y + 38);
      if (last) c.fillText('TRIED LAST', x0 + w - 18, y + 22);
      c.restore();
    });
    c.textAlign = 'left';
    c.font = font(F.mono(400), 15); c.letterSpacing = '2px'; c.fillStyle = rgba('ash', 1);
    c.globalAlpha = p * ease.outCubic(prog(lt, T_RANK + 1.2, T_RANK + 1.6));
    c.fillText('TIES ARE TRIED IN LIST ORDER · THESIS P.82', x0, y0 + 3 * 84 + 14); c.letterSpacing = '0px';
    // the point
    c.globalAlpha = p * ease.outCubic(prog(lt, T_RANK + 1.5, T_RANK + 2.0));
    c.font = font(F.archivo(100, 700), 40); c.fillStyle = rgba('bone', 1);
    c.fillText('A heuristic doesn’t change the worst case.', 96, 940);
    c.fillStyle = rgba('signal', 1);
    c.fillText('It makes the typical case fast.', 96, 990);
    c.restore();
  }

  cues(_content: SceneContent): Cue[] {
    const cues: Cue[] = [];
    for (let t = 0.2; t < 1.9; t += 0.3) cues.push({ t, voice: 'type', gain: 0.2 });
    for (let t = T_FIELD; t < T_FIELD + 1.6; t += 0.2) cues.push({ t, voice: 'type', gain: 0.1 });
    this.d.candidates.forEach((_, i) => cues.push({ t: T_GOAL + 0.5 + i * 0.35, voice: 'lock', gain: 0.6, pitch: 0.9 + i * 0.15 }));
    for (let lv = 1; lv <= LEVELS; lv++) cues.push({ t: T_TREE + lv * LEVEL_GAP, voice: 'step', gain: 0.45, pitch: 0.7 + lv * 0.1 });
    cues.push({ t: T_TREE + LEVELS * LEVEL_GAP + 0.3, voice: 'stamp', gain: 0.9, pitch: 0.8 });
    cues.push({ t: T_CARD, voice: 'reveal', gain: 0.5, pitch: 0.8 });
    cues.push({ t: T_CARD + 0.2, voice: 'stamp', gain: 0.6, pitch: 1.1 }); cues.push({ t: T_CARD + 0.6, voice: 'stamp', gain: 0.6, pitch: 0.9 });
    cues.push({ t: T_RANK, voice: 'morph', gain: 0.3 });
    for (let k = 0; k < 3; k++) cues.push({ t: T_RANK + 0.4 + k * 0.3, voice: 'lock', gain: 0.5, pitch: 1.2 - k * 0.2 });
    return cues.sort((a, b) => a.t - b.t);
  }
}
