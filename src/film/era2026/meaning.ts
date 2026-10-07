// 2026 beat, scene 2: how a modern model finds what is relevant, by meaning rather than by exact symbol match.
// Knowledge becomes points; similar meanings sit close together; the question becomes a point too; the nearest points
// come to the front; then a reply (verbatim from a recorded run). Stages 1-4 are a simplified illustration, labelled so.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, mulberry32, prog } from '../engine/util';
import { ruledSheet } from '../core/draw';
import { Note } from '../core/note';
import type { Cue, Era2026Renderer, Era2026Spec, Local, MeaningSpec, SceneContent } from '../core/types';
import { loadTranscript } from './transcript';

const LEAD_FROM = 0.2, LEAD_GAP = 0.12;
const S1 = 2.0, S2 = 3.4, S3 = 5.4, S4 = 6.8, S5 = 8.3;
const STAGE_AT = [S1, S2, S3, S4, S5];
const LABELS = [
  '1 · KNOWLEDGE BECOMES POINTS',
  '2 · SIMILAR MEANINGS SIT CLOSE TOGETHER',
  '3 · THE QUESTION BECOMES A POINT TOO',
  '4 · THE NEAREST POINTS COME TO THE FRONT',
  '5 · WRITE A REPLY, ONE WORD AT A TIME',
];
const RX = 96, RY = 335, RW = 1728, RH = 345;      // the region the cloud lives in

interface Pt { sx: number; sy: number; x: number; y: number; cluster: number; delay: number }

export default class MeaningRenderer implements Era2026Renderer {
  private lb = new LineBatch(4000, { blend: 'add' });
  private text = new Layer2D();
  private ctx!: SceneCtx;
  private spec!: MeaningSpec;
  private pts: Pt[] = [];
  private q = { x: 0, y: 0 };
  private nearest: number[] = [];          // indexes, closest first
  private foundIdx: number[] = [];          // the points that carry the labels
  private meta = '';
  private note: Note | null = null;

  constructor(private content?: SceneContent) {}

  init(spec: Era2026Spec, ctx: SceneCtx) {
    if (spec.kind !== 'meaning') throw new Error('MeaningRenderer needs a meaning spec');
    this.ctx = ctx; this.spec = spec;
    const tr = loadTranscript(spec.src);
    this.meta = tr.model ? `${tr.model} · ${tr.date ?? ''}` : 'layout fixture, not a recorded run';
    if (this.content) this.note = new Note(this.content.note);

    const rnd = mulberry32(2026);
    const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += rnd(); return (s - 2) * 1.2; };
    spec.clusters.forEach((cl, ci) => {
      for (let i = 0; i < cl.n; i++) {
        const ang = rnd() * Math.PI * 2, rad = Math.abs(gauss()) * cl.r * RW;
        this.pts.push({
          sx: RX + rnd() * RW, sy: RY + rnd() * RH,
          x: RX + cl.x * RW + Math.cos(ang) * rad, y: RY + cl.y * RH + Math.sin(ang) * rad * 0.8,
          cluster: ci, delay: rnd() * 0.7,
        });
      }
    });
    // the question lands near its cluster, pulled a little towards the next one (a cylinder question is about gases AND shapes)
    const near = spec.clusters.find((c) => c.name === spec.question.near)!;
    const other = spec.clusters.find((c) => c.name === 'SHAPES') ?? near;
    this.q = { x: RX + (near.x + (other.x - near.x) * 0.36) * RW, y: RY + (near.y + (other.y - near.y) * 0.36) * RH };
    const byDist = this.pts.map((p, i) => ({ i, d: Math.hypot(p.x - this.q.x, p.y - this.q.y) })).sort((a, b) => a.d - b.d);
    this.nearest = byDist.slice(0, 9).map((o) => o.i);
    // labelled hits: the two closest points of the question's cluster and the closest of the neighbouring one
    const nearIdx = spec.clusters.indexOf(near), otherIdx = spec.clusters.indexOf(other);
    const closestIn = (ci: number, skip: number[] = []) => byDist.find((o) => this.pts[o.i]!.cluster === ci && !skip.includes(o.i))!.i;
    const a = closestIn(nearIdx), b = closestIn(nearIdx, [a]), c = closestIn(otherIdx);
    this.foundIdx = [a, b, c].slice(0, spec.found.length);
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
    const orange = LIN.claude, hot = LIN.claudeHot;

    c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
    c.fillText('2026', 96, 140); c.letterSpacing = '0px';
    lb.seg2(96, 168, 1824, 168, 1, orange, 0.55);

    // the lead
    let x = 96;
    sp.lead.split(' ').forEach((w, i) => {
      const a = prog(lt, LEAD_FROM + i * LEAD_GAP, LEAD_FROM + i * LEAD_GAP + 0.22, ease.outCubic);
      c.font = font(F.archivo(100, 700), 54);
      if (a > 0) { c.save(); c.globalAlpha = a; c.fillStyle = rgba('bone', 1); c.fillText(w, x, 228 + (1 - a) * 14); c.restore(); }
      x += c.measureText(w + ' ').width;
    });

    // stage label + the honesty line
    const st = this.stage(lt);
    if (st >= 0) {
      for (let s = Math.max(0, st - 1); s <= st; s++) {
        const a = s === st ? ease.outCubic(prog(lt, STAGE_AT[s]!, STAGE_AT[s]! + 0.35)) : 1 - ease.outCubic(prog(lt, STAGE_AT[st]!, STAGE_AT[st]! + 0.25));
        if (a <= 0) continue;
        c.save(); c.globalAlpha = a; c.font = font(F.mono(500), 18); c.letterSpacing = '4px'; c.fillStyle = rgba('claude', 1);
        c.fillText(LABELS[s]!, 96, s === 4 ? 712 : 300); c.letterSpacing = '0px'; c.restore();
      }
      c.save(); c.globalAlpha = 0.9; c.textAlign = 'right'; c.font = font(F.mono(400), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      c.fillText('STAGES 1–4: SIMPLIFIED ILLUSTRATION OF MATCHING BY MEANING', 1824, 300);
      if (st >= 3) c.fillText('REAL SYSTEMS DO THIS INSIDE THE MODEL, OR BY LOOKING THINGS UP FIRST', 1824, 322);
      c.restore();
    }

    // the cloud: scattered at first, then settling into clusters
    const settle = (pt: Pt) => ease.inOutCubic(prog(lt, S2 + pt.delay, S2 + pt.delay + 0.9));
    this.pts.forEach((pt, i) => {
      const appear = ease.outCubic(prog(lt, S1 + (i / this.pts.length) * 0.9, S1 + (i / this.pts.length) * 0.9 + 0.3));
      if (appear <= 0) return;
      const k = settle(pt);
      const px = lerp(pt.sx, pt.x, k), py = lerp(pt.sy, pt.y, k);
      const isNear = lt >= S4 && this.nearest.indexOf(i) >= 0;
      const lit = ease.outCubic(prog(lt, S4, S4 + 0.5));
      const wdt = isNear ? 5 + 4 * lit : 4;
      lb.seg2(px, py, px + 0.01, py, wdt, isNear && lit > 0 ? hot : orange, (isNear ? 0.55 + 0.45 * lit : 0.5) * appear);
    });
    // cluster names, once settled
    const nameA = ease.outCubic(prog(lt, S2 + 1.0, S2 + 1.6));
    if (nameA > 0) {
      c.save(); c.globalAlpha = nameA * 0.9; c.textAlign = 'center'; c.font = font(F.mono(500), 14); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1);
      sp.clusters.forEach((cl) => c.fillText(cl.name, RX + cl.x * RW, Math.min(RY + RH + 28, RY + cl.y * RH + cl.r * RW * 0.8 + 20)));
      c.restore();
    }
    // the question as a point
    const qa = ease.outExpo(prog(lt, S3, S3 + 0.5));
    if (qa > 0) {
      const ring = 1 + (1 - qa) * 2;
      for (let i = 0; i < 24; i++) {
        const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2, r = 16 * ring;
        lb.seg2(this.q.x + Math.cos(a0) * r, this.q.y + Math.sin(a0) * r, this.q.x + Math.cos(a1) * r, this.q.y + Math.sin(a1) * r, 2.2, [2, 2, 2], qa);
      }
      lb.seg2(this.q.x, this.q.y, this.q.x + 0.01, this.q.y, 12, [2.4, 2.1, 1.8], qa);
      c.save(); c.globalAlpha = qa; c.font = font(F.mono(500), 17); c.letterSpacing = '2px'; c.fillStyle = rgba('bone', 1); c.textAlign = 'right';
      c.fillText(sp.question.label.toUpperCase(), this.q.x - 26, this.q.y - 30); c.restore();
    }
    // rays to the nearest points, and the labelled hits
    this.nearest.forEach((idx, i) => {
      const k = ease.outExpo(prog(lt, S4 + 0.1 + i * 0.07, S4 + 0.1 + i * 0.07 + 0.5));
      if (k <= 0) return;
      const pt = this.pts[idx]!;
      const strong = this.foundIdx.indexOf(idx) >= 0;
      lb.seg2(this.q.x, this.q.y, lerp(this.q.x, pt.x, k), lerp(this.q.y, pt.y, k), strong ? 2.4 : 1.1, hot, strong ? 0.9 : 0.35);
    });
    this.foundIdx.forEach((idx, i) => {
      const k = ease.outCubic(prog(lt, S4 + 0.45 + i * 0.32, S4 + 0.85 + i * 0.32));
      if (k <= 0) return;
      const pt = this.pts[idx]!;
      // label anchors sit well clear of the question, each joined to its point by a short leader
      const anchors = [[92, -84, 'left'], [-92, 88, 'right'], [120, 70, 'left']] as const;
      const [ax, ay, align] = anchors[i % anchors.length]!;
      const lx = this.q.x + ax, ly = this.q.y + ay;
      lb.seg2(pt.x, pt.y, lerp(pt.x, lx + (align === 'left' ? -8 : 8), k), lerp(pt.y, ly - 6, k), 1.2, hot, 0.7 * k);
      c.save(); c.globalAlpha = k; c.font = font(F.mono(500), 17); c.letterSpacing = '2px'; c.fillStyle = rgba('claudeHot', 1);
      c.textAlign = align;
      c.fillText(sp.found[i]!, lx, ly); c.restore();
    });

    // the reply: verbatim lines from the recorded run
    if (lt >= S5 && sp.reply.length) {
      const total = sp.reply.reduce((s, l) => s + l.length + 1, 0);
      const shownAll = Math.floor(total * prog(lt, S5 + 0.3, S5 + 2.6));
      let off = 0;
      c.save();
      c.font = font(F.mono(500), 15); c.letterSpacing = '3px'; c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
      c.fillText(`A REAL REPLY · ${this.meta.toUpperCase()}`, 1824, 712); c.letterSpacing = '0px'; c.textAlign = 'left';
      c.font = font(F.mono(500), 30);
      sp.reply.forEach((line, i) => {
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
    void dur; void clamp;
  }

  cues(_spec: Era2026Spec, dur: number): Cue[] {
    const cues: Cue[] = [];
    for (let i = 0; i < this.spec.lead.split(' ').length; i += 2) cues.push({ t: LEAD_FROM + i * LEAD_GAP, voice: 'type', gain: 0.2 });
    cues.push({ t: S1, voice: 'step', gain: 0.4, pitch: 0.9 });
    cues.push({ t: S2, voice: 'morph', gain: 0.35 });
    cues.push({ t: S3, voice: 'stamp', gain: 0.6, pitch: 1.2 });
    cues.push({ t: S4, voice: 'step', gain: 0.5, pitch: 1.3 });
    this.foundIdx.forEach((_, i) => cues.push({ t: S4 + 0.45 + i * 0.32, voice: 'lock', gain: 0.55, pitch: 0.95 + i * 0.15 }));
    cues.push({ t: S5, voice: 'step', gain: 0.5, pitch: 1.45 });
    for (let t = S5 + 0.3; t < S5 + 2.6; t += 0.28) cues.push({ t, voice: 'type', gain: 0.16 });
    if (this.note) cues.push(this.note.cue());
    return cues.sort((a, b) => a.t - b.t);
  }
}
