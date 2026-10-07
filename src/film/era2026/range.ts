// 2026 beat, scene 5: a real recorded reply in which the model gives its own best estimate and range for the raindrop.
// The reply lines are verbatim excerpts, in order; the triangles on the right are drawn from the numbers the reply states.
// The footnote says the model was asked for a range, so nobody mistakes it for something it volunteered.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, lerp, prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import { Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, Local, RangeSpec, SceneContent } from '../core/types';
import { loadTranscript, type Transcript } from './transcript';

const LEAD_FROM = 0.2, LEAD_GAP = 0.1;
const PROMPT_AT = 1.7;
const LINE_AT = [2.6, 4.7, 7.0, 7.9];            // when each reply line starts typing
const LINE_LEN = [1.8, 2.0, 0.8, 1.4];
const TRI_AT = [7.4, 6.4];                        // when each range's triangle grows: [its range, the conditional one]
const TX = 96, TW = 940;                          // the reply
const CX0 = 1130, CX1 = 1800, BASE = 700;         // the chart

export default class RangeRenderer implements Era2026Renderer {
  private lb = new LineBatch(2500, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: RangeSpec;
  private tr!: Transcript;
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'range') throw new Error('RangeRenderer needs a range spec');
    this.ctx = ctx; this.spec = spec;
    this.tr = loadTranscript(spec.src);
    if (this.content) this.note = new Note(this.content.note);
  }

  private ax(v: number) { const a = this.spec.axis; return lerp(CX0, CX1, (v - a.min) / (a.max - a.min)); }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt, p }: Local) {
    const { renderer, comp } = this.ctx;
    const sp = this.spec;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    ruledSheet(lb, 0.05);
    c.textBaseline = 'alphabetic';
    const orange = LIN.claude, hot = LIN.claudeHot;

    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
    c.fillText('2026', 96, 140);
    c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
    c.fillText(this.tr.model ? `${this.tr.model.toUpperCase()} · ${this.tr.date ?? ''}` : 'LAYOUT FIXTURE · NOT A RECORDED RUN', 1824, 140);
    c.textAlign = 'left'; c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, orange, 0.6);

    // the lead
    let x = 96, y = 232;
    c.font = font(F.archivo(100, 700), 48);
    sp.lead.split(' ').forEach((w, i) => {
      const wd = c.measureText(w + ' ').width;
      if (x + wd > 1824) { x = 96; y += 60; }
      const a = prog(lt, LEAD_FROM + i * LEAD_GAP, LEAD_FROM + i * LEAD_GAP + 0.22, ease.outCubic);
      if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = rgba('bone', 1); c.fillText(w, x, y + (1 - a) * 14); c.restore(); }
      x += wd;
    });

    // the question
    const pa = ease.outCubic(prog(lt, PROMPT_AT, PROMPT_AT + 0.4));
    if (pa > 0) {
      c.save(); c.globalAlpha = pa;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText('THE QUESTION', 96, 304); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 25); c.fillStyle = rgba('bone', 0.88);
      for (const l of wrap(c, this.tr.prompt, 1728, 32, 342)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    // the reply, line by line (bold markers and bullets are already gone: these are the sentences themselves)
    c.save();
    c.font = font(F.mono(500), 21);
    let yy = 440;
    sp.reply.forEach((line, i) => {
      const t0 = LINE_AT[i] ?? LINE_AT[LINE_AT.length - 1]!;
      const typed = Math.floor(line.length * prog(lt, t0, t0 + (LINE_LEN[i] ?? 1.2)));
      const rows = wrap(c, line, TW, 29, yy);
      rows.forEach((r) => {
        const shown = Math.min(r.text.length, typed - r.start);
        if (shown > 0) this.drawRow(c, r.text.slice(0, shown), TX, r.y);
      });
      yy += rows.length * 29 + 14;
    });
    c.restore();

    // the chart: an axis, and a triangle for each range the model gave
    const ca = ease.outCubic(prog(lt, TRI_AT[1]! - 0.5, TRI_AT[1]! + 0.1));
    if (ca > 0) {
      lb.seg2(CX0, BASE, CX1, BASE, 1.2, LIN.graphite, 0.8 * ca);
      c.save(); c.globalAlpha = ca; c.font = font(F.mono(400), 14); c.fillStyle = rgba('ash', 1); c.textAlign = 'center';
      const ax = sp.axis;
      for (let v = ax.min; v <= ax.max + 1e-9; v += ax.step) {
        lb.seg2(this.ax(v), BASE - 5, this.ax(v), BASE + 5, 1.2, LIN.graphite, 0.8 * ca);
        c.fillText(String(v), this.ax(v), BASE + 28);
      }
      c.textAlign = 'right'; c.letterSpacing = '3px';
      c.fillText(`THE FORCE, IN ${sp.unit}`, CX1, BASE + 60); c.restore();
    }
    sp.ranges.forEach((r, i) => {
      const k = ease.outCubic(prog(lt, TRI_AT[i]!, TRI_AT[i]! + 0.9));
      if (k <= 0) return;
      const bx = this.ax(r.best), peakH = i === 0 ? 120 : 190;
      const lx = lerp(bx, this.ax(r.low), k), ux = lerp(bx, this.ax(r.high), k);
      const col = i === 0 ? hot : orange;
      lb.polyline([{ x: lx, y: BASE }, { x: bx, y: BASE - peakH }, { x: ux, y: BASE }], i === 0 ? 3 : 2, col, i === 0 ? 0.95 : 0.7);
      if (i === 0) lb.polyline([{ x: lx, y: BASE }, { x: bx, y: BASE - peakH }, { x: ux, y: BASE }], 12, orange, 0.2);
      for (let hx = Math.ceil(lx / 8) * 8; hx <= ux; hx += 8) {
        const t2 = hx <= bx ? lerp(BASE, BASE - peakH, (hx - lx) / Math.max(1, bx - lx)) : lerp(BASE - peakH, BASE, (hx - bx) / Math.max(1, ux - bx));
        lb.seg2(hx, BASE, hx, t2, 1, col, 0.11);
      }
      // the label above the peak
      c.save(); c.globalAlpha = k; c.textAlign = 'center'; c.font = font(F.mono(500), 13); c.letterSpacing = '2px'; c.fillStyle = rgba(i === 0 ? 'claudeHot' : 'claude', 1);
      c.fillText(r.label, bx + (i === 0 ? 200 : 0), BASE - peakH - 14 - (i === 0 ? 0 : 0));
      c.restore();
      lb.seg2(this.ax(r.low), BASE - 5, this.ax(r.low), BASE + 5, 1.8, col, k); lb.seg2(this.ax(r.high), BASE - 5, this.ax(r.high), BASE + 5, 1.8, col, k);
    });

    // honesty: how this was recorded
    const fa = ease.outCubic(prog(lt, LINE_AT[0]!, LINE_AT[0]! + 0.6));
    if (fa > 0) {
      c.save(); c.globalAlpha = 0.9 * fa; c.textAlign = 'right';
      c.font = font(F.mono(400), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText('A REAL REPLY · THE MODEL WAS ASKED FOR A RANGE · EXCERPTS, IN ORDER', 1824, 840);
      c.restore();
    }
    this.note?.draw(c, lt);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  /** a row of reply text, with highlighted phrases in the hot orange */
  private drawRow(c: CanvasRenderingContext2D, text: string, x: number, y: number) {
    const marks: [number, number][] = [];
    for (const h of this.spec.highlight ?? []) { const i = text.indexOf(h); if (i >= 0) marks.push([i, i + h.length]); }
    marks.sort((a, b) => a[0] - b[0]);
    let pos = 0, cx = x;
    const seg = (s: string, hl: boolean) => {
      if (!s) return;
      c.fillStyle = hl ? rgba('claudeHot', 1) : rgba('bone', 0.95);
      c.fillText(s, cx, y);
      cx += c.measureText(s).width;
    };
    for (const [a, b] of marks) { seg(text.slice(pos, a), false); seg(text.slice(a, b), true); pos = b; }
    seg(text.slice(pos), false);
  }

  cues(_spec: Era2026Spec, dur: number): Cue[] {
    const cues: Cue[] = [];
    const nLead = this.spec.lead.split(' ').length;
    for (let i = 0; i < nLead; i += 2) cues.push({ t: LEAD_FROM + i * LEAD_GAP, voice: 'type', gain: 0.2 });
    LINE_AT.forEach((t0, i) => { for (let t = t0; t < t0 + (LINE_LEN[i] ?? 1); t += 0.2) cues.push({ t, voice: 'type', gain: 0.14 }); });
    TRI_AT.forEach((t, i) => cues.push({ t, voice: 'reveal', gain: 0.4, pitch: 0.9 + i * 0.2 }));
    if (this.note) cues.push(this.note.cue());
    return cues;
  }
}
