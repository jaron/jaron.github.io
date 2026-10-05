// 1996 beat, scene 1: the English question is phrased, by hand, as the fixed form the program accepts
// (thesis p.91). Keywords in the sentence are marked and snap into the form's fields.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog } from '../engine/util';
import { ruledSheet, spanOnLine, wrap } from '../core/draw';
import type { Cue, Era1996Renderer, Local, SceneContent } from '../core/types';

interface Field { key: string; value: string; from: string[] }
interface FormData { sentence: string; caption: string; fields: Field[] }

const TYPE_END = 2.6;
const MARK_AT = 2.9;
const ROW_AT = 4.4;
const ROW_GAP = 1.55;
const ROW_Y = 640, ROW_H = 78;
const STATUS_AT = ROW_AT + 4 * ROW_GAP + 0.3;

const circle = (lb: LineBatch, x: number, y: number, r: number, w: number, rgb: [number, number, number], a: number) => {
  const pts = Array.from({ length: 25 }, (_, i) => ({ x: x + Math.cos((i / 24) * Math.PI * 2) * r, y: y + Math.sin((i / 24) * Math.PI * 2) * r }));
  lb.polyline(pts, w, rgb, a);
};

export default class FormRenderer implements Era1996Renderer {
  private lb = new LineBatch(3000, { blend: 'add' });
  private text = new Layer2D();
  private d!: FormData;
  private ctx!: SceneCtx;

  init(content: SceneContent, ctx: SceneCtx) { this.d = content.era1996.data as unknown as FormData; this.ctx = ctx; }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt }: Local) {
    const { renderer, comp } = this.ctx;
    const { sentence, fields, caption } = this.d;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    ruledSheet(lb, 0.06);

    c.textBaseline = 'alphabetic';
    c.font = font(F.mono(500), 18);
    c.letterSpacing = '4px';
    c.fillStyle = rgba('bone', 1);
    c.fillText('1996', 96, 140);
    c.fillStyle = rgba('ash', 1);
    c.textAlign = 'right';
    c.fillText(caption.toUpperCase(), 1920 - 96, 140);
    c.textAlign = 'left';
    c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.bone, 0.35);

    // the sentence, typed
    const SIZE = 50;
    c.font = font(F.archivo(100, 500), SIZE);
    const lines = wrap(c, sentence, 1560, 104, 280);
    const total = Math.floor(sentence.length * prog(lt, 0.2, TYPE_END));
    for (const line of lines) {
      const shown = Math.max(0, Math.min(line.text.length, total - line.start));
      if (shown <= 0) continue;
      c.fillStyle = rgba('bone', 0.95);
      c.fillText(line.text.slice(0, shown), 96, line.y);
    }
    if (lt < TYPE_END + 0.4) {
      const last = [...lines].reverse().find((l) => total - l.start > 0) ?? lines[0]!;
      const shown = Math.min(last.text.length, Math.max(0, total - last.start));
      const w = c.measureText(last.text.slice(0, shown)).width;
      if (Math.floor(lt * 4) % 2 === 0) { c.fillStyle = rgba('signal', 1); c.fillRect(96 + w + 6, last.y - SIZE * 0.78, 4, SIZE * 0.95); }
    }

    // marks on the keywords, numbered
    fields.forEach((fld, i) => {
      const at = MARK_AT + i * 0.32;
      const p = prog(lt, at, at + 0.3, ease.outCubic);
      if (p <= 0) return;
      fld.from.forEach((span, j) => {
        for (const line of lines) {
          const r = spanOnLine(c, line, span, 96);
          if (!r) continue;
          const top = line.y - SIZE * 0.82, bot = line.y + SIZE * 0.22;
          const x0 = r.x0 - 8, x1 = r.x0 - 8 + (r.x1 - r.x0 + 16) * p;
          lb.polyline([{ x: x0, y: top }, { x: x1, y: top }, { x: x1, y: bot }, { x: x0, y: bot }, { x: x0, y: top }], 1.8, LIN.signal, p);
          if (j === 0) {
            circle(lb, r.x0 - 8, top - 22, 14, 1.4, LIN.signal, p);
            c.save();
            c.globalAlpha = p;
            c.font = font(F.mono(500), 15);
            c.textAlign = 'center';
            c.fillStyle = rgba('signal', 1);
            c.fillText(String(i + 1), r.x0 - 8, top - 17);
            c.restore();
          }
        }
      });
    });

    // the form
    const fx = 96;
    const formP = ease.outExpo(prog(lt, ROW_AT - 0.5, ROW_AT + 0.3));
    if (formP > 0) {
      c.font = font(F.mono(500), 15);
      c.letterSpacing = '4px';
      c.fillStyle = rgba('ash', formP);
      c.fillText('THE USER INTERFACE: A FIXED FORM', fx, ROW_Y - 62);
      c.letterSpacing = '0px';
      lb.seg2(fx, ROW_Y - 44, fx + 1000 * formP, ROW_Y - 44, 1, LIN.ash, 0.5);
    }
    fields.forEach((fld, i) => {
      const at = ROW_AT + i * ROW_GAP;
      const y = ROW_Y + i * ROW_H;
      const kp = prog(lt, at, at + 0.45);
      if (kp <= 0) return;
      circle(lb, fx + 14, y - 10, 14, 1.4, LIN.signal, 1);
      c.font = font(F.mono(500), 15);
      c.textAlign = 'center';
      c.fillStyle = rgba('signal', 1);
      c.fillText(String(i + 1), fx + 14, y - 5);
      c.textAlign = 'left';
      c.font = font(F.mono(400), 30);
      c.fillStyle = rgba('ash', 1);
      const key = `${fld.key} :`;
      c.fillText(key.slice(0, Math.floor(key.length * kp)), fx + 52, y);
      const kw = c.measureText(key).width;
      const vp = prog(lt, at + 0.45, at + 1.0);
      c.fillStyle = rgba('bone', 1);
      c.fillText(fld.value.slice(0, Math.floor(fld.value.length * vp)), fx + 52 + kw + 24, y);
      const locked = lt >= at + 1.0;
      lb.seg2(fx + 52, y + 18, fx + 52 + 760, y + 18, 1, locked ? LIN.signal : LIN.graphite, locked ? 0.75 : 0.5);
    });
    const sp = prog(lt, STATUS_AT, STATUS_AT + 0.4);
    if (sp > 0) {
      c.font = font(F.mono(500), 18);
      c.letterSpacing = '4px';
      c.fillStyle = rgba('signal', sp);
      c.fillText('STATUS: PROBLEM SPECIFIED', fx, ROW_Y + 4 * ROW_H + 18);
    }

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  cues(content: SceneContent): Cue[] {
    const fields = (content.era1996.data as unknown as FormData).fields;
    const cues: Cue[] = [];
    for (let t = 0.3; t < TYPE_END; t += 0.34) cues.push({ t, voice: 'type', gain: 0.22 });
    fields.forEach((_, i) => {
      cues.push({ t: MARK_AT + i * 0.32, voice: 'reveal', gain: 0.4 });
      cues.push({ t: ROW_AT + i * ROW_GAP + 1.0, voice: 'lock', gain: 0.6 });
    });
    cues.push({ t: STATUS_AT, voice: 'stamp', gain: 0.5 });
    return cues;
  }
}
