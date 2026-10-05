// 2026 beat: a recorded model transcript, streamed in at a fixed authored rate (deterministic),
// with highlighted phrases in signal blue. Raindrop visualisations will replace this behind the same interface.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { prog } from '../engine/util';
import { ruledSheet, wrap } from '../core/draw';
import { NOTE_AT, Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, Local, SceneContent } from '../core/types';

export interface Transcript {
  fixture?: boolean;
  model: string | null;
  date: string | null;
  prompt: string;
  turns: { type: 'text'; text: string }[];
  excerpt?: { from: number; to: number };
}

const files = import.meta.glob<Transcript>('../data/transcripts/*.json', { eager: true, import: 'default' });
export const loadTranscript = (src: string): Transcript => {
  const t = files[`../data/transcripts/${src}.json`];
  if (!t) throw new Error(`transcript not found: ${src}`);
  return t;
};

/** The renderer shows plain mono text: drop bold markers, turn list dashes into middle dots. */
const cleanMarkdown = (s: string) => s.replace(/\*\*/g, '').replace(/^- /gm, '· ');

const START = 0.9;
const LINE_H = 40, TOP = 410, MAXLINES = 12;

export default class TranscriptRenderer implements Era2026Renderer {
  private lb = new LineBatch(1500, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private tr!: Transcript;
  private body = '';
  private highlight: string[] = [];
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}
  setContent(c: SceneContent) { this.content = c; }

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'transcript') throw new Error('TranscriptRenderer needs a transcript spec');
    this.ctx = ctx;
    this.tr = loadTranscript(spec.src);
    const full = this.tr.turns.map((t) => t.text).join('\n\n');
    this.body = cleanMarkdown(this.tr.excerpt ? full.slice(this.tr.excerpt.from, this.tr.excerpt.to) : full);
    this.highlight = spec.highlight ?? [];
    if (this.content) this.note = new Note(this.content.note);
  }

  private streamEnd(dur: number) { return dur * NOTE_AT - 0.4; }

  render(_f: Frame, out: THREE.WebGLRenderTarget, { lt, p, dur }: Local) {
    const { renderer, comp } = this.ctx;
    clearRT(renderer, out, LIN.ink);
    const lb = this.lb; lb.clear();
    const T = this.text; T.clear();
    const c = T.ctx;
    ruledSheet(lb, 0.05);
    c.textBaseline = 'alphabetic';

    c.font = font(F.mono(500), 18);
    c.letterSpacing = '4px';
    c.fillStyle = rgba('claude', 1);
    c.fillText('2026', 96, 140);
    c.fillStyle = rgba('ash', 1);
    c.textAlign = 'right';
    const who = this.tr.model ? `${this.tr.model.toUpperCase()} · ${this.tr.date ?? ''}` : 'LAYOUT FIXTURE · NOT A RECORDED RUN';
    c.fillText(who, 1920 - 96, 140);
    c.textAlign = 'left';
    c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, LIN.claude, 0.6);

    // prompt
    c.font = font(F.mono(500), 15);
    c.letterSpacing = '4px';
    c.fillStyle = rgba('ash', 1);
    c.fillText('PROMPT', 96, 222);
    c.letterSpacing = '0px';
    c.font = font(F.archivo(100, 500), 34);
    c.fillStyle = rgba('bone', 0.85);
    for (const l of wrap(c, this.tr.prompt, 1560, 46, 270)) c.fillText(l.text, 96, l.y);
    lb.seg2(96, 346, 1824, 346, 1, LIN.graphite, 0.5);

    // response, streamed
    c.font = font(F.mono(500), 15);
    c.letterSpacing = '4px';
    c.fillStyle = rgba('claude', 1);
    c.fillText('RESPONSE', 96, 392);
    c.letterSpacing = '0px';
    const end = this.streamEnd(dur);
    const total = Math.floor(this.body.length * prog(lt, START, end));
    c.font = font(F.mono(400), 26);
    // wrap per paragraph so blank lines survive
    type Row = { text: string; start: number; blank: boolean };
    const rows: Row[] = [];
    let off = 0;
    for (const para of this.body.split('\n')) {
      if (!para.trim()) { rows.push({ text: '', start: off, blank: true }); off += 1; continue; }
      for (const l of wrap(c, para, 1560, 0, 0)) rows.push({ text: l.text, start: off + l.start, blank: false });
      off += para.length + 1;
    }
    const visible = rows.filter((r) => r.start < total || r.blank && r.start <= total);
    const first = Math.max(0, visible.length - MAXLINES);
    visible.slice(first).forEach((r, i) => {
      const y = TOP + 36 + i * LINE_H;
      const shown = Math.min(r.text.length, total - r.start);
      if (shown <= 0) return;
      this.drawRow(c, r.text.slice(0, shown), 96, y);
    });
    if (p < NOTE_AT - 0.02 && Math.floor(lt * 3) % 2 === 0) {
      const last = visible[visible.length - 1];
      if (last) {
        const w = c.measureText(last.text.slice(0, Math.max(0, Math.min(last.text.length, total - last.start)))).width;
        const i = Math.min(visible.length, MAXLINES) - 1;
        c.fillStyle = rgba('claude', 1);
        c.fillRect(96 + w + 6, TOP + 36 + i * LINE_H - 22, 12, 28);
      }
    }
    this.note?.draw(c, p);

    lb.render(renderer, out);
    comp.draw(renderer, T.upload(), out);
  }

  /** Draw one row, colouring highlighted phrases in signal blue. */
  private drawRow(c: CanvasRenderingContext2D, text: string, x: number, y: number) {
    const marks: [number, number][] = [];
    for (const h of this.highlight) { const i = text.indexOf(h); if (i >= 0) marks.push([i, i + h.length]); }
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
    const end = this.streamEnd(dur);
    for (let t = START; t < end; t += 0.28) cues.push({ t, voice: 'type', gain: 0.16 });
    if (this.note) cues.push(this.note.cue(dur));
    return cues;
  }
}
