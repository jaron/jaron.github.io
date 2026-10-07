// 2026 beat, scene 6: a model shows its working. The recorded reply is a table of quantities, each with its value and
// where it came from; the film draws that table row by row, tags each source in plain words (given, looked up,
// assumed, worked out: the same vocabulary as the 1996 report), and ends on the model's own answer line.
// Every quantity, value, source and the answer are verbatim from the recording (check-content verifies them).
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import { Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, Local, SceneContent, WorkingSpec } from '../core/types';
import { loadTranscript, type Transcript } from './transcript';

const LEAD_FROM = 0.2, LEAD_GAP = 0.1;
const PROMPT_AT = 1.8;
const FORMULA_AT = 2.8;
const ROW_AT = 3.9, ROW_GAP = 1.0;
const ANSWER_AT = 9.0;
const COL = { q: 96, v: 560, tag: 900, src: 1090 };
const HEAD_Y = 512, ROW_Y0 = 562, ROW_H = 52;

export default class WorkingRenderer implements Era2026Renderer {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: WorkingSpec;
  private tr!: Transcript;
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'working') throw new Error('WorkingRenderer needs a working spec');
    this.ctx = ctx; this.spec = spec;
    this.tr = loadTranscript(spec.src);
    if (this.content) this.note = new Note(this.content.note);
  }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
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
      c.fillText('THE QUESTION', 96, 310); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 24); c.fillStyle = rgba('bone', 0.88);
      for (const l of wrap(c, this.tr.prompt, 1728, 31, 348)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    // the formula it chose
    const fa = ease.outCubic(prog(lt, FORMULA_AT, FORMULA_AT + 0.5));
    if (fa > 0) {
      c.save(); c.globalAlpha = fa;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
      c.fillText('ITS FORMULA', 96, 446); c.letterSpacing = '0px';
      c.font = font(F.mono(500), 34); c.fillStyle = rgba('claudeHot', 1);
      c.fillText(sp.formula.text, 330, 452);
      c.restore();
    }

    // the table, row by row
    const ha = ease.outCubic(prog(lt, ROW_AT - 0.3, ROW_AT + 0.2));
    if (ha > 0) {
      c.save(); c.globalAlpha = ha; c.font = font(F.mono(500), 13); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText('QUANTITY', COL.q, HEAD_Y); c.fillText('VALUE', COL.v, HEAD_Y); c.fillText('WHERE IT CAME FROM', COL.tag, HEAD_Y);
      c.restore();
      lb.seg2(96, HEAD_Y + 14, 1824, HEAD_Y + 14, 1, LIN.graphite, 0.6 * ha);
    }
    sp.rows.forEach((r, i) => {
      const t0 = ROW_AT + i * ROW_GAP;
      const a = ease.outCubic(prog(lt, t0, t0 + 0.4));
      if (a <= 0) return;
      const yy = ROW_Y0 + i * ROW_H;
      const assumed = r.tag === 'assumed';
      c.save(); c.globalAlpha = a;
      c.font = font(F.mono(500), 22); c.fillStyle = rgba('bone', 0.95);
      c.fillText(r.quantity, COL.q, yy, COL.v - COL.q - 24);
      c.fillStyle = rgba(assumed ? 'claudeHot' : 'bone', 1);
      c.fillText(r.value, COL.v, yy, COL.tag - COL.v - 24);
      // the plain-word tag, boxed when it is an assumption
      c.font = font(F.mono(500), 13); c.letterSpacing = '3px';
      const tag = r.tag.toUpperCase();
      const tw = c.measureText(tag).width;
      c.fillStyle = rgba(assumed ? 'claudeHot' : r.tag === 'looked up' ? 'claude' : 'ash', 1);
      c.fillText(tag, COL.tag, yy - 4);
      c.letterSpacing = '0px';
      if (assumed) { c.strokeStyle = rgba('claudeHot', 0.9); c.lineWidth = 1; c.strokeRect(COL.tag - 8, yy - 24, tw + 22, 28); }
      c.font = font(F.mono(400), 19); c.fillStyle = rgba('bone', 0.85);
      c.fillText(r.source, COL.src, yy, 1824 - COL.src);
      c.restore();
      if (assumed) lb.seg2(96, yy + 16, 1824, yy + 16, 1, hot, 0.25 * a);
    });

    // its own answer line
    const aa = ease.outCubic(prog(lt, ANSWER_AT, ANSWER_AT + 0.5));
    if (aa > 0) {
      c.save(); c.globalAlpha = aa;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
      c.fillText('ITS ANSWER', 96, 836); c.letterSpacing = '0px';
      c.font = font(F.mono(500), 26); c.fillStyle = rgba('claudeHot', 1);
      c.fillText(sp.answer, 300, 840, 1524);
      c.restore();
    }

    // honesty: how this was recorded
    const fo = ease.outCubic(prog(lt, ROW_AT, ROW_AT + 0.6));
    if (fo > 0) {
      c.save(); c.globalAlpha = 0.9 * fo; c.textAlign = 'right';
      c.font = font(F.mono(400), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText('A REAL REPLY · THE MODEL WAS ASKED TO SHOW ITS WORKING · EXCERPTS', 1824, 470);
      c.restore();
    }
    this.note?.draw(c, lt);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(_spec: Era2026Spec): Cue[] {
    const cues: Cue[] = [];
    const nLead = this.spec.lead.split(' ').length;
    for (let i = 0; i < nLead; i += 2) cues.push({ t: LEAD_FROM + i * LEAD_GAP, voice: 'type', gain: 0.2 });
    cues.push({ t: FORMULA_AT, voice: 'reveal', gain: 0.4, pitch: 0.9 });
    this.spec.rows.forEach((r, i) => cues.push({ t: ROW_AT + i * ROW_GAP, voice: r.tag === 'assumed' ? 'lock' : 'step', gain: 0.4, pitch: 0.9 + i * 0.07 }));
    cues.push({ t: ANSWER_AT, voice: 'stamp', gain: 0.6, pitch: 1.0 });
    if (this.note) cues.push(this.note.cue());
    return cues;
  }
}
