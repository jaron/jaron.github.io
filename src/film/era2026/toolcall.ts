// 2026 beat, scene 4: a model asks a tool for help. Left, the model; right, the tool. The model's call (its own code)
// is typed, a packet crosses to the tool, the tool works and returns a value, the packet comes back, and the model
// carries on and replies. Everything shown is verbatim from one recorded run; the footnote says how it was recorded.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, lerp, prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import { Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, Local, SceneContent, ToolCallSpec } from '../core/types';
import { loadTranscript, type Transcript } from './transcript';

const LEAD_FROM = 0.2, LEAD_GAP = 0.1;
const PROMPT_AT = 1.5;
const CALL_AT = 2.6, CALL_LEN = 1.9;           // the model's call is typed
const SEND_AT = 4.8, SEND_LEN = 0.6;            // the call crosses to the tool
const RUN_AT = 5.4, RUN_LEN = 1.0;              // the tool works
const RESULT_AT = 6.4;                           // the value appears in the tool
const BACK_AT = 7.0, BACK_LEN = 0.6;            // and comes back
const REPLY_AT = 7.7, REPLY_LEN = 1.8;          // the model carries on
const BOX_Y = 450, BOX_H = 290;
const LX = 96, LW = 860, RX = 1100, RW = 724;

export default class ToolCallRenderer implements Era2026Renderer {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: ToolCallSpec;
  private tr!: Transcript;
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'toolcall') throw new Error('ToolCallRenderer needs a toolcall spec');
    this.ctx = ctx; this.spec = spec;
    this.tr = loadTranscript(spec.src);
    if (this.content) this.note = new Note(this.content.note);
  }

  private box(lb: LineBatch, x: number, w: number, a: number, hot: boolean) {
    const col = hot ? LIN.claudeHot : LIN.claude;
    lb.polyline([{ x, y: BOX_Y }, { x: x + w, y: BOX_Y }, { x: x + w, y: BOX_Y + BOX_H }, { x, y: BOX_Y + BOX_H }, { x, y: BOX_Y }], hot ? 2.4 : 1.4, col, (hot ? 0.95 : 0.6) * a);
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

    // the lead, word by word
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
      c.fillText('THE QUESTION', 96, 330); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 30); c.fillStyle = rgba('bone', 0.9);
      for (const l of wrap(c, this.tr.prompt, 1728, 38, 376)) c.fillText(l.text, 96, l.y);
      c.restore();
    }

    // the two boxes
    const boxA = ease.outCubic(prog(lt, CALL_AT - 0.3, CALL_AT + 0.2));
    const toolHot = lt >= SEND_AT + SEND_LEN && lt < BACK_AT;
    if (boxA > 0) {
      this.box(lb, LX, LW, boxA, lt >= CALL_AT && lt < SEND_AT + SEND_LEN || lt >= REPLY_AT);
      this.box(lb, RX, RW, boxA, toolHot);
      c.save(); c.globalAlpha = boxA;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
      c.fillText('THE MODEL', LX + 24, BOX_Y + 36);
      c.fillText(sp.toolLabel, RX + 24, BOX_Y + 36); c.letterSpacing = '0px';
      c.restore();
    }

    // the model's call, typed line by line
    const callText = sp.call;
    const callTotal = callText.reduce((s, l) => s + l.length + 1, 0);
    const shownAll = Math.floor(callTotal * prog(lt, CALL_AT, CALL_AT + CALL_LEN));
    c.save();
    c.font = font(F.mono(500), 21);
    c.fillStyle = rgba('bone', 0.96);
    let off = 0;
    callText.forEach((line, i) => {
      const shown = Math.max(0, Math.min(line.length, shownAll - off));
      off += line.length + 1;
      if (shown > 0) c.fillText(line.slice(0, shown), LX + 24, BOX_Y + 84 + i * 32, LW - 48);
    });
    c.restore();
    if (lt >= CALL_AT && lt < SEND_AT) {
      const ca = ease.outCubic(prog(lt, CALL_AT, CALL_AT + 0.3));
      c.save(); c.globalAlpha = ca; c.font = font(F.mono(400), 14); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
      c.fillText('ITS OWN CODE', LX + LW - 24, BOX_Y + 36); c.restore();
    }

    // the packet out and back
    const midY = BOX_Y + BOX_H / 2;
    const out1 = ease.inOutCubic(prog(lt, SEND_AT, SEND_AT + SEND_LEN));
    const back = ease.inOutCubic(prog(lt, BACK_AT, BACK_AT + BACK_LEN));
    const x0 = LX + LW + 6, x1 = RX - 6;
    if (out1 > 0 && out1 < 1) this.packet(lb, c, lerp(x0, x1, out1), midY, 'CALL');
    if (back > 0 && back < 1) this.packet(lb, c, lerp(x1, x0, back), midY + 28, 'RESULT');
    if (lt >= SEND_AT) lb.seg2(x0, midY, x1, midY, 1.2, orange, 0.35);

    // the tool works, then returns a value
    if (lt >= RUN_AT && lt < RESULT_AT) {
      const dots = '.'.repeat(1 + (Math.floor((lt - RUN_AT) * 4) % 3));
      c.save(); c.font = font(F.mono(500), 24); c.fillStyle = rgba('ash', 1);
      c.fillText(`RUNNING${dots}`, RX + 24, BOX_Y + 100); c.restore();
    }
    if (lt >= RESULT_AT) {
      const ra = ease.outCubic(prog(lt, RESULT_AT, RESULT_AT + 0.35));
      c.save(); c.globalAlpha = ra;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText('RETURNED', RX + 24, BOX_Y + 100); c.letterSpacing = '0px';
      c.font = font(F.mono(500), 46); c.fillStyle = rgba('claudeHot', 1);
      sp.result.forEach((l, i) => c.fillText(l, RX + 24, BOX_Y + 170 + i * 56, RW - 48));
      c.restore();
    }

    // the model carries on
    if (lt >= REPLY_AT) {
      const ra = ease.outCubic(prog(lt, REPLY_AT, REPLY_AT + 0.3));
      c.save(); c.globalAlpha = ra;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
      c.fillText('THE MODEL CARRIES ON', 96, 786); c.letterSpacing = '0px';
      const full = sp.reply.join(' ');
      const n = Math.floor(full.length * prog(lt, REPLY_AT + 0.2, REPLY_AT + 0.2 + REPLY_LEN));
      c.font = font(F.mono(500), 24);
      const lines = wrap(c, full, 1728, 34, 824);
      for (const l of lines) {
        const shown = Math.min(l.text.length, n - l.start);
        if (shown <= 0) continue;
        this.drawRow(c, l.text.slice(0, shown), 96, l.y);
      }
      c.restore();
    }

    // honesty: how this was recorded
    const fa = ease.outCubic(prog(lt, CALL_AT, CALL_AT + 0.6));
    if (fa > 0) {
      c.save(); c.globalAlpha = 0.9 * fa; c.textAlign = 'right';
      c.font = font(F.mono(400), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText('A REAL RUN · THE MODEL WAS TOLD A PYTHON TOOL WAS AVAILABLE · THE CODE IS ITS OWN', 1824, 764);
      c.restore();
    }
    this.note?.draw(c, p);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  private packet(lb: LineBatch, c: CanvasRenderingContext2D, x: number, y: number, label: string) {
    lb.seg2(x, y, x + 0.01, y, 26, LIN.claude, 0.3);
    lb.seg2(x, y, x + 0.01, y, 12, LIN.claudeHot, 0.95);
    c.save(); c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('claudeHot', 1); c.textAlign = 'center';
    c.fillText(label, x, y - 24); c.restore();
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
    for (let t = CALL_AT; t < CALL_AT + CALL_LEN; t += 0.12) cues.push({ t, voice: 'type', gain: 0.14 });
    cues.push({ t: SEND_AT, voice: 'call', gain: 0.6 });
    cues.push({ t: RESULT_AT, voice: 'lock', gain: 0.6, pitch: 1.2 });
    cues.push({ t: BACK_AT, voice: 'call', gain: 0.45, pitch: 1.3 });
    for (let t = REPLY_AT + 0.2; t < REPLY_AT + 0.2 + REPLY_LEN; t += 0.2) cues.push({ t, voice: 'type', gain: 0.14 });
    if (this.note) cues.push(this.note.cue(dur));
    return cues;
  }
}
