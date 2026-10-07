// 2026 beat, scene 3: a real recorded reply in which the model gets its own number wrong, notices, and goes back.
// Four verbatim excerpts, in order, from one run (the one scene 1 trimmed): the claim, its own working that
// disagrees, the catch, and the corrected answer. The rail on the left echoes the 1996 search tree: the claim is
// struck out and the line backs up to it, like the program retracing its steps. The slip is arithmetic, fixed in
// the model's own words, and the footnote says so.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import { Note } from '../core/note';
import type { CorrectionSpec, Cue, Era2026Renderer, Era2026Spec, Local, SceneContent } from '../core/types';
import { loadTranscript, type Transcript } from './transcript';

const LEAD_FROM = 0.2, LEAD_GAP = 0.1;
const PROMPT_AT = 1.9;
// when each line starts to type, and how long it takes
const LINE_AT = [2.6, 4.0, 5.4, 7.0];
const LINE_LEN = [1.0, 1.0, 1.2, 0.9];
const STRIKE_AT = 5.3, RETRACT_AT = 5.6, RETRACT_LEN = 0.8;
const ROW_Y = [490, 580, 670, 760];
const RAIL_X = 470, TEXT_X = 512;
const TAGS: Record<string, string> = { claim: 'ITS ANSWER', working: 'ITS OWN WORKING', catch: 'THE CATCH', answer: 'THE CORRECTED ANSWER' };

export default class CorrectionRenderer implements Era2026Renderer {
  private lb = new LineBatch(1200, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: CorrectionSpec;
  private tr!: Transcript;
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'correction') throw new Error('CorrectionRenderer needs a correction spec');
    this.ctx = ctx; this.spec = spec;
    this.tr = loadTranscript(spec.src);
    if (this.content) this.note = new Note(this.content.note);
  }

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

    // the lead, word by word, wrapped onto two lines
    let x = 96, y = 232;
    c.font = font(F.archivo(100, 700), 48);
    sp.lead.split(' ').forEach((w, i) => {
      const wd = c.measureText(w + ' ').width;
      if (x + wd > 1824) { x = 96; y += 60; }
      const a = prog(lt, LEAD_FROM + i * LEAD_GAP, LEAD_FROM + i * LEAD_GAP + 0.22, ease.outCubic);
      if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = rgba('bone', 1); c.fillText(w, x, y + (1 - a) * 14); c.restore(); }
      x += wd;
    });

    // the question, as in scene 1
    const pa = ease.outCubic(prog(lt, PROMPT_AT, PROMPT_AT + 0.4));
    if (pa > 0) {
      c.save(); c.globalAlpha = pa;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText('THE QUESTION FROM SCENE 1', 96, 352); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 25); c.fillStyle = rgba('bone', 0.8);
      for (const l of wrap(c, this.tr.prompt, 1728, 32, 392)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    // the rail: dots joined top to bottom, each row's dot lighting as its line begins
    const strike = ease.outCubic(prog(lt, STRIKE_AT, STRIKE_AT + 0.35));
    sp.lines.forEach((ln, i) => {
      const t0 = LINE_AT[i]!;
      const a = ease.outCubic(prog(lt, t0, t0 + 0.3));
      if (a <= 0) return;
      const y0 = ROW_Y[i]!;
      const dim = ln.role === 'claim' ? 1 - 0.55 * strike : 1;
      if (i > 0) {
        const prevY = ROW_Y[i - 1]!;
        lb.seg2(RAIL_X, prevY + 10, RAIL_X, prevY + 10 + (y0 - 10 - (prevY + 10)) * a, 1.6, orange, 0.55 * a);
      }
      lb.seg2(RAIL_X, y0 - 10, RAIL_X + 0.01, y0 - 10, ln.role === 'answer' ? 15 : 11, ln.role === 'answer' ? hot : orange, a * dim);
      // tag
      c.save(); c.globalAlpha = a * dim;
      c.font = font(F.mono(500), 14); c.letterSpacing = '3px'; c.fillStyle = rgba(ln.role === 'answer' ? 'claudeHot' : 'claude', 1);
      c.textAlign = 'right'; c.fillText(TAGS[ln.role]!, RAIL_X - 96, y0 - 5);
      c.restore();
      // the line, typed
      const typed = Math.floor(ln.text.length * prog(lt, t0 + 0.1, t0 + 0.1 + LINE_LEN[i]!));
      c.save();
      c.globalAlpha = dim; c.textAlign = 'left';
      c.font = font(F.mono(500), 28);
      const shown = ln.text.slice(0, typed);
      c.fillStyle = ln.role === 'answer' ? rgba('claudeHot', 1) : rgba('bone', 0.96);
      c.fillText(ln.role === 'claim' ? `… ${shown}` : shown, TEXT_X, y0);
      if (ln.role === 'claim' && strike > 0) {
        const w = c.measureText(`… ${ln.text}`).width * strike;
        lb.seg2(TEXT_X - 6, y0 - 9, TEXT_X - 6 + w, y0 - 9, 3, hot, 0.95);
      }
      c.restore();
    });

    // the retraction: from the catch, a curve backs up to the struck claim, like the program retracing its steps
    const rp = ease.inOutCubic(prog(lt, RETRACT_AT, RETRACT_AT + RETRACT_LEN));
    if (rp > 0) {
      const y1 = ROW_Y[2]! - 10, y2 = ROW_Y[0]! - 10;
      const pts: { x: number; y: number }[] = [];
      const N = 32;
      for (let q = 0; q <= Math.floor(N * rp); q++) {
        const u = q / N;
        pts.push({ x: RAIL_X - 70 * 4 * u * (1 - u), y: y1 + (y2 - y1) * u });
      }
      lb.polyline(pts, 2.2, hot, 0.95);
      lb.polyline(pts, 10, hot, 0.16);
    }

    // the honesty line
    const fa = ease.outCubic(prog(lt, LINE_AT[1]!, LINE_AT[1]! + 0.5));
    if (fa > 0) {
      c.save(); c.globalAlpha = 0.9 * fa; c.textAlign = 'right';
      c.font = font(F.mono(400), 14); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText('EXCERPTS, IN ORDER, FROM THE RECORDED RUN SHOWN IN SCENE 1', 1824, 830);
      c.fillText('THE SLIP WAS IN THE ARITHMETIC, CAUGHT AND FIXED IN ITS OWN WORDS', 1824, 854);
      c.restore();
    }
    this.note?.draw(c, lt);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(_spec: Era2026Spec, dur: number): Cue[] {
    const cues: Cue[] = [];
    const nLead = this.spec.lead.split(' ').length;
    for (let i = 0; i < nLead; i += 2) cues.push({ t: LEAD_FROM + i * LEAD_GAP, voice: 'type', gain: 0.2 });
    LINE_AT.forEach((t0, i) => {
      cues.push({ t: t0, voice: 'step', gain: 0.4, pitch: 1.0 + i * 0.1 });
      for (let t = t0 + 0.1; t < t0 + 0.1 + LINE_LEN[i]!; t += 0.28) cues.push({ t, voice: 'type', gain: 0.16 });
    });
    cues.push({ t: STRIKE_AT, voice: 'fail', gain: 0.5, pitch: 1.1 });
    cues.push({ t: RETRACT_AT, voice: 'morph', gain: 0.3 });
    if (this.note) cues.push(this.note.cue());
    return cues;
  }
}
