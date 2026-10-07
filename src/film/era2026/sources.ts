// 2026 beat, scene 7: a real recorded reply to the film's raindrop question, with the three facts the 1996 program had
// to be given (a formula, a property value, a constant) marked as things nobody typed in, beside the published training
// data of one large model (GPT-3, Brown et al. 2020, Table 2.2). The reply lines are verbatim; the figures are the
// paper's, quoted with their citation on screen.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { ease, lerp, prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import { Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, Local, SceneContent, SourcesSpec } from '../core/types';
import { loadTranscript, type Transcript } from './transcript';

const LEAD_FROM = 0.2, LEAD_GAP = 0.1;
const PROMPT_AT = 2.2;
const REPLY_AT = 3.0, REPLY_LEN = 4.4;
const MIX_AT = 7.6, MIX_GAP = 0.45;
const SUM_AT = 10.6, CROWD_AT = 11.4;
const RX = 1210, RW = 614;               // the training-mix panel
const TAG_X = 930;

export default class SourcesRenderer implements Era2026Renderer {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: SourcesSpec;
  private tr!: Transcript;
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'sources') throw new Error('SourcesRenderer needs a sources spec');
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

    // the question, below however many lines the lead took
    const pa = ease.outCubic(prog(lt, PROMPT_AT, PROMPT_AT + 0.4));
    const qy = Math.max(310, y + 40);
    if (pa > 0) {
      c.save(); c.globalAlpha = pa;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('ash', 1);
      c.fillText('THE QUESTION', 96, qy); c.letterSpacing = '0px';
      c.font = font(F.archivo(100, 500), 28); c.fillStyle = rgba('bone', 0.9);
      c.fillText(this.tr.prompt, 96, qy + 40);
      c.restore();
    }

    // the reply, typed; each of the three facts gets a tag the moment its line is typed
    c.save();
    c.font = font(F.mono(500), 21);
    let yy = 440;
    const total = sp.reply.reduce((s, l) => s + l.length + 1, 0);
    const shownAll = Math.floor(total * prog(lt, REPLY_AT, REPLY_AT + REPLY_LEN));
    let off = 0;
    sp.reply.forEach((line) => {
      const shown = Math.max(0, Math.min(line.length, shownAll - off));
      const lineDone = shown >= line.length;
      off += line.length + 1;
      if (shown > 0) {
        const fact = sp.facts.find((f) => line.includes(f.text));
        if (fact) {
          const i0 = line.indexOf(fact.text);
          const before = line.slice(0, Math.min(shown, i0));
          c.fillStyle = rgba('bone', 0.95); c.fillText(before, 96, yy);
          const wb = c.measureText(before).width;
          if (shown > i0) { c.fillStyle = rgba('claudeHot', 1); c.fillText(line.slice(i0, Math.min(shown, i0 + fact.text.length)), 96 + wb, yy); }
          const wf = c.measureText(line.slice(i0, Math.min(shown, i0 + fact.text.length))).width;
          if (shown > i0 + fact.text.length) { c.fillStyle = rgba('bone', 0.95); c.fillText(line.slice(i0 + fact.text.length, shown), 96 + wb + wf, yy); }
          if (lineDone) {
            const ta = ease.outCubic(prog(lt, REPLY_AT, REPLY_AT + REPLY_LEN) >= 0 ? 1 : 0);
            c.save(); c.globalAlpha = ta; c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('claudeHot', 1);
            c.fillText(`← ${fact.tag}`, TAG_X, yy - 4); c.restore();
            lb.seg2(96 + wb, yy + 6, 96 + wb + wf, yy + 6, 2, hot, 0.9);
          }
        } else {
          c.fillStyle = rgba('bone', 0.95); c.fillText(line.slice(0, shown), 96, yy);
        }
      }
      yy += 38;
    });
    c.restore();

    // "nobody typed any of this in"
    const na = ease.outCubic(prog(lt, REPLY_AT + REPLY_LEN, REPLY_AT + REPLY_LEN + 0.6));
    if (na > 0) {
      c.save(); c.globalAlpha = na;
      c.font = font(F.archivo(100, 700), 34); c.fillStyle = rgba('claudeHot', 1);
      c.fillText('Nobody typed any of it in.', 96, 722);
      c.restore();
    }

    // the published training mix
    const mix = sp.mix;
    const ma = ease.outCubic(prog(lt, MIX_AT - 0.3, MIX_AT + 0.3));
    if (ma > 0) {
      c.save(); c.globalAlpha = ma;
      c.font = font(F.mono(500), 15); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
      c.fillText(mix.title, RX, 440); c.letterSpacing = '0px';
      c.font = font(F.mono(400), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText(mix.subtitle, RX, 464); c.letterSpacing = '0px';
      c.restore();
    }
    const max = Math.max(...mix.parts.map((p) => p.billions));
    mix.parts.forEach((p, i) => {
      const t0 = MIX_AT + i * MIX_GAP;
      const k = ease.outCubic(prog(lt, t0, t0 + 0.7));
      if (k <= 0) return;
      const by = 512 + i * 62;
      const w = Math.max(6, (RW - 20) * (p.billions / max));
      lb.seg2(RX, by, RX + w * k, by, 14, orange, 0.8);
      lb.seg2(RX, by, RX + w * k, by, 26, orange, 0.12);
      c.save(); c.globalAlpha = k;
      c.font = font(F.mono(500), 17); c.fillStyle = rgba('bone', 1);
      c.fillText(`${p.name}`, RX, by - 16);
      c.textAlign = 'right'; c.fillStyle = rgba('claudeHot', 1);
      c.fillText(`${p.billions} billion`, RX + RW, by - 16);
      c.textAlign = 'left'; c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 1);
      c.fillText(p.gloss, RX, by + 22);
      c.restore();
    });
    const sa = ease.outCubic(prog(lt, SUM_AT, SUM_AT + 0.5));
    if (sa > 0) {
      const sum = mix.parts.reduce((s, p) => s + p.billions, 0);
      c.save(); c.globalAlpha = sa; c.textAlign = 'left';
      c.font = font(F.mono(500), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('claudeHot', 1);
      c.fillText(`${sum} BILLION TOKENS OF TEXT · ${mix.seenBillions} BILLION SEEN IN TRAINING`, RX, 828);
      c.fillStyle = rgba('ash', 1); c.font = font(F.mono(400), 13); c.letterSpacing = '0px';
      wrap(c, mix.citation, RW, 18, 868).forEach((l) => c.fillText(l.text, RX, l.y)); c.restore();
    }
    const cr = ease.outCubic(prog(lt, CROWD_AT, CROWD_AT + 0.6));
    if (cr > 0) {
      c.save(); c.globalAlpha = cr;
      c.font = font(F.archivo(100, 700), 34); c.fillStyle = rgba('bone', 1);
      c.fillText(sp.crowd, 96, 790, 1050);
      c.restore();
    }
    void lerp;
    this.note?.draw(c, lt);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(_spec: Era2026Spec): Cue[] {
    const cues: Cue[] = [];
    const nLead = this.spec.lead.split(' ').length;
    for (let i = 0; i < nLead; i += 2) cues.push({ t: LEAD_FROM + i * LEAD_GAP, voice: 'type', gain: 0.2 });
    for (let t = REPLY_AT; t < REPLY_AT + REPLY_LEN; t += 0.16) cues.push({ t, voice: 'type', gain: 0.14 });
    cues.push({ t: REPLY_AT + REPLY_LEN, voice: 'lock', gain: 0.5, pitch: 1.2 });
    this.spec.mix.parts.forEach((_, i) => cues.push({ t: MIX_AT + i * MIX_GAP, voice: 'step', gain: 0.3, pitch: 0.8 + i * 0.08 }));
    cues.push({ t: SUM_AT, voice: 'stamp', gain: 0.6, pitch: 1.0 });
    if (this.note) cues.push(this.note.cue());
    return cues;
  }
}
