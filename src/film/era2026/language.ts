// 2026 beat, "how we talk to machines now": the same sentence the 1996 beat had to take apart by hand, read by a
// modern model at a very high level. 1: it is split into pieces. 2: each piece becomes numbers that capture
// meaning. 3: attention links the words that relate. 4: a reply is produced one word at a time (real model output).
// Stages 1-3 are a simplified illustration, labelled as such; the reply lines are verbatim from a recorded run.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, hash, prog } from '../engine/util';
import { ruledSheet } from '../core/draw';
import { Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, LanguageSpec, Local, SceneContent } from '../core/types';
import { loadTranscript } from './transcript';

// timeline within the beat (seconds)
const LEAD_FROM = 0.2, LEAD_GAP = 0.12;
const S1 = 2.0, S2 = 3.7, S3 = 5.0, S4 = 7.3;
const LABELS = [
  '1 · BREAK THE SENTENCE INTO PIECES',
  '2 · TURN EACH PIECE INTO NUMBERS THAT CAPTURE MEANING',
  '3 · WORK OUT WHICH WORDS RELATE TO WHICH',
  '4 · WRITE A REPLY, ONE WORD AT A TIME',
];
const STAGE_AT = [S1, S2, S3, S4];
const ROW_TOP = [330, 455, 580];

interface Chip { text: string; row: number; x: number; w: number; i: number }

export default class LanguageRenderer implements Era2026Renderer {
  private lb = new LineBatch(4000, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: LanguageSpec;
  private chips: Chip[] = [];
  private meta = '';
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'language') throw new Error('LanguageRenderer needs a language spec');
    this.ctx = ctx;
    this.spec = spec;
    const tr = loadTranscript(spec.src);
    this.meta = tr.model ? `${tr.model} · ${tr.date ?? ''}` : 'layout fixture, not a recorded run';
    if (this.content) this.note = new Note(this.content.note);
    // lay the chips out once (the text canvas is only used for measuring here)
    const m = document.createElement('canvas').getContext('2d')!;
    m.font = font(F.mono(500), 22);
    let i = 0;
    spec.rows.forEach((row, r) => {
      let x = 96;
      for (const text of row) {
        const w = Math.ceil(m.measureText(text).width) + 26;
        this.chips.push({ text, row: r, x, w, i: i++ });
        x += w + 10;
      }
    });
  }

  private stage(lt: number) { let s = -1; for (let i = 0; i < STAGE_AT.length; i++) if (lt >= STAGE_AT[i]!) s = i; return s; }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt, p, dur }: Local) {
    const { renderer, comp } = this.ctx;
    const sp = this.spec;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    ruledSheet(lb, 0.05);
    c.textBaseline = 'alphabetic';
    const orange = LIN.claude;

    // header: this is now
    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
    c.fillText('2026', 96, 140); c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, orange, 0.55);

    // the lead: the point of the whole half
    const words = sp.lead.split(' ');
    let x = 96;
    words.forEach((w, i) => {
      const a = prog(lt, LEAD_FROM + i * LEAD_GAP, LEAD_FROM + i * LEAD_GAP + 0.22, ease.outCubic);
      c.font = font(F.archivo(100, 700), 54);
      if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = rgba('bone', 1); c.fillText(w, x, 228 + (1 - a) * 14); c.restore(); }
      x += c.measureText(w + ' ').width;
    });

    // stage label
    const st = this.stage(lt);
    if (st >= 0) {
      for (let s = Math.max(0, st - 1); s <= st; s++) {
        const a = s === st ? ease.outCubic(prog(lt, STAGE_AT[s]!, STAGE_AT[s]! + 0.35)) : 1 - ease.outCubic(prog(lt, STAGE_AT[st]!, STAGE_AT[st]! + 0.25));
        if (a <= 0 || (s === 3 && st === 3 && false)) continue;
        c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
        c.fillText(LABELS[s]!, 96, s === 3 ? 712 : 296); c.letterSpacing = '0px'; c.restore();
      }
      c.save(); c.globalAlpha = 0.9; c.textAlign = 'right'; c.font = font(F.mono(400), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText('STAGES 1–3: SIMPLIFIED ILLUSTRATION', 1824, 296); c.restore();
    }

    // stage 1: the pieces
    for (const ch of this.chips) {
      const a = prog(lt, S1 + ch.i * 0.04, S1 + ch.i * 0.04 + 0.25, ease.outCubic);
      if (a <= 0) continue;
      const y = ROW_TOP[ch.row]!;
      const hot = this.linked(ch.i, lt);
      const edge = hot ? 0.95 : 0.5;
      lb.polyline([{ x: ch.x, y }, { x: ch.x + ch.w, y }, { x: ch.x + ch.w, y: y + 40 }, { x: ch.x, y: y + 40 }, { x: ch.x, y }], hot ? 2.2 : 1.4, orange, edge * a);
      c.save(); c.globalAlpha = a;
      c.font = font(F.mono(500), 22); c.fillStyle = rgba('bone', 1); c.textAlign = 'center';
      c.fillText(ch.text, ch.x + ch.w / 2, y + 28 + (1 - a) * 10);
      c.restore();

      // stage 2: each piece as numbers: a little column of bars
      const n = 8;
      for (let j = 0; j < n; j++) {
        const g = ease.outCubic(prog(lt, S2 + ch.i * 0.03 + j * 0.03, S2 + ch.i * 0.03 + j * 0.03 + 0.4));
        if (g <= 0) continue;
        const h = (5 + 30 * hash(ch.i * 13 + 5, j * 7 + 1)) * g;
        const bx = ch.x + (ch.w - (n * 5 + (n - 1) * 3)) / 2 + j * 8;
        const by = y + 82;
        lb.seg2(bx, by, bx, by - h, 3, hot ? [LIN.claudeHot[0], LIN.claudeHot[1], LIN.claudeHot[2]] : orange, 0.85);
      }
    }

    // stage 3: attention arcs between related words
    sp.links.forEach((l, i) => {
      const k = ease.inOutCubic(prog(lt, S3 + i * 0.22, S3 + i * 0.22 + 0.55));
      if (k <= 0) return;
      const A = this.chips[l.a]!, B = this.chips[l.b]!;
      const ax = A.x + A.w / 2, bx = B.x + B.w / 2, y = ROW_TOP[A.row]! - 2;
      const h = Math.min(40, 14 + Math.abs(bx - ax) * 0.1);
      const N = 28, pts: { x: number; y: number }[] = [];
      for (let q = 0; q <= Math.floor(N * k); q++) {
        const u = q / N;
        pts.push({ x: ax + (bx - ax) * u, y: y - 4 * h * u * (1 - u) });
      }
      lb.polyline(pts, 1.2 + l.w * 4, orange, 0.95);
      lb.polyline(pts, 8 + l.w * 6, orange, 0.18);
    });

    // stage 4: a reply, word by word; the lines are verbatim from the recorded run
    if (lt >= S4) {
      const lines = sp.reply;
      const total = lines.reduce((s, l) => s + l.length + 1, 0);
      const shownAll = Math.floor(total * prog(lt, S4 + 0.3, S4 + 3.0));
      let off = 0;
      c.save();
      c.font = font(F.mono(500), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText(`A REAL REPLY · ${this.meta.toUpperCase()}`, 1824 - c.measureText(`A REAL REPLY · ${this.meta.toUpperCase()}`).width - 40, 712);
      c.letterSpacing = '0px';
      c.font = font(F.mono(500), 30);
      lines.forEach((line, i) => {
        const shown = Math.max(0, Math.min(line.length, shownAll - off));
        off += line.length + 1;
        if (shown <= 0) return;
        const hl = (sp.highlight ?? []).some((h) => line.includes(h));
        c.fillStyle = hl ? rgba('claudeHot', 1) : rgba('bone', 0.95);
        c.fillText(line.slice(0, shown), 96, 770 + i * 46);
      });
      c.restore();
    }
    this.note?.draw(c, lt);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
    void dur;
  }

  /** chips involved in a link whose arc has been drawn light up */
  private linked(i: number, lt: number) {
    return this.spec.links.some((l, q) => (l.a === i || l.b === i) && lt >= S3 + q * 0.22 + 0.5);
  }

  cues(_spec: Era2026Spec, dur: number): Cue[] {
    const cues: Cue[] = [];
    const nLead = this.spec.lead.split(' ').length;
    for (let i = 0; i < nLead; i += 2) cues.push({ t: LEAD_FROM + i * LEAD_GAP, voice: 'type', gain: 0.2 });
    for (let i = 0; i < this.chips.length; i += 3) cues.push({ t: S1 + i * 0.04, voice: 'type', gain: 0.16 });
    cues.push({ t: S2, voice: 'step', gain: 0.5, pitch: 1.0 });
    this.spec.links.forEach((_, i) => cues.push({ t: S3 + i * 0.22, voice: 'reveal', gain: 0.4, pitch: 0.9 + i * 0.07 }));
    cues.push({ t: S3, voice: 'step', gain: 0.5, pitch: 1.2 });
    cues.push({ t: S4, voice: 'step', gain: 0.5, pitch: 1.4 });
    for (let t = S4 + 0.3; t < S4 + 3.0; t += 0.28) cues.push({ t, voice: 'type', gain: 0.16 });
    if (this.note) cues.push(this.note.cue());
    return cues;
  }
}
