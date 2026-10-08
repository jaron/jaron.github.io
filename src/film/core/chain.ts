// The Connections chain: an opening line, then dated nodes along a line, each leading to the next. Each node
// advances the morph scalar k that drives the 1996 -> 2026 dissolve, and the accent colour shifts from signal
// blue (the thesis) to orange (the present) as k rises.
import chainData from '../data/chains.json';
import { Layer2D } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { HEX, LIN } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, lerp, prog } from '../engine/util';
import { wrap } from './draw';
import type { ChainData, Cue } from './types';

const CHAINS = chainData as unknown as Record<string, ChainData>;
const STEP_DUR = 0.7;     // morph spring per node
const INTRO_FROM = 0.6, INTRO_GAP = 0.085;
/** The finished chain (every node fully shown) stays this long before the screen fades out, so it can be read. */
export const CHAIN_LINGER = 2;
const NODE_POP = 0.55, FADE_OUT = 1.3;     // a node's pop-in, and how long before the beat's end the fade-out starts
/** Time the intro line needs before the first node (shared with the content checker's arithmetic). */
export const chainLead = (intro: string | undefined) => (intro ? INTRO_FROM + intro.split(' ').length * INTRO_GAP + 0.55 : 0.35);

export const chainOf = (key: string): ChainData => {
  const c = CHAINS[key];
  if (!c) throw new Error(`unknown chain '${key}'`);
  return c;
};

const hexRgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const A = hexRgb(HEX.signal), B = hexRgb(HEX.claude);

/** the accent at morph position k: signal blue -> orange, as CSS and as linear RGB for line batches */
export function accent(k: number) {
  const kk = ease.inOutCubic(clamp(k));
  const rgb = [0, 1, 2].map((i) => Math.round(lerp(A[i]!, B[i]!, kk)));
  const lin: [number, number, number] = [lerp(LIN.signal[0], LIN.claude[0], kk), lerp(LIN.signal[1], LIN.claude[1], kk), lerp(LIN.signal[2], LIN.claude[2], kk)];
  return { css: (a = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`, lin };
}

export class Chain {
  data: ChainData;
  private lb = new LineBatch(800, { blend: 'add' });
  private layer = new Layer2D();
  private lead: number;
  constructor(key: string, private dur: number) {
    this.data = chainOf(key);
    // the opening line needs room before the first node
    this.lead = chainLead(this.data.intro);
  }
  get nodes() { return this.data.nodes; }

  /** Time (seconds into the beat) node i appears. */
  at(i: number) { const span = (this.dur - this.lead - (FADE_OUT + CHAIN_LINGER + NODE_POP)) / Math.max(1, this.nodes.length - 1); return this.lead + i * span; }

  /** Morph scalar 0..1 at local time lt. Each node adds 1/N with an eased step. */
  k(lt: number) {
    const n = this.nodes.length;
    let k = 0;
    for (let i = 0; i < n; i++) k += ease.inOutCubic(prog(lt, this.at(i) + 0.15, this.at(i) + 0.15 + STEP_DUR)) / n;
    return clamp(k);
  }

  /** Index of the latest visible node at lt, or -1. */
  index(lt: number) { let r = -1; for (let i = 0; i < this.nodes.length; i++) if (lt >= this.at(i)) r = i; return r; }

  /** Draw the intro line and the nodes over the dissolve. */
  draw(lt: number) {
    const lb = this.lb; lb.clear();
    const L = this.layer; L.clear();
    const c = L.ctx;
    const n = this.nodes.length;
    const fadeOut = 1 - ease.inOutCubic(prog(lt, this.dur - FADE_OUT, this.dur - 0.3));
    // each node carries its own colour: the line runs from signal blue (earliest) to orange (now)
    const at = (i: number) => accent(n === 1 ? 1 : i / (n - 1));
    const bone = (a: number) => `rgba(238,233,223,${a})`;

    // scrims so the text reads over the dissolving frames
    const top = c.createLinearGradient(0, 100, 0, 440);
    top.addColorStop(0, `rgba(5,5,7,${0.94 * fadeOut})`); top.addColorStop(0.72, `rgba(5,5,7,${0.9 * fadeOut})`); top.addColorStop(1, 'rgba(5,5,7,0)');
    c.fillStyle = top; c.fillRect(0, 100, 1920, 340);
    const bot = c.createLinearGradient(0, 520, 0, 1000);
    bot.addColorStop(0, 'rgba(5,5,7,0)'); bot.addColorStop(0.3, `rgba(5,5,7,${0.9 * fadeOut})`); bot.addColorStop(1, `rgba(5,5,7,${0.94 * fadeOut})`);
    c.fillStyle = bot; c.fillRect(0, 520, 1920, 560);

    c.textBaseline = 'alphabetic';
    // the opening line: why these innovations matter at all
    if (this.data.intro) {
      c.font = font(F.archivo(100, 700), 54);
      const lines = wrap(c, this.data.intro, 1560, 66, 222);
      let wi = 0;
      for (const line of lines) {
        let x = 96;
        for (const w of line.text.split(' ')) {
          const p = prog(lt, INTRO_FROM + wi * INTRO_GAP, INTRO_FROM + wi * INTRO_GAP + 0.2, ease.outCubic);
          if (p > 0) { c.save(); c.globalAlpha = p * fadeOut; c.font = font(F.archivo(100, 700), 54); c.fillStyle = bone(1); c.fillText(w, x, line.y + (1 - p) * 12); c.restore(); }
          c.font = font(F.archivo(100, 700), 54);
          x += c.measureText(w + ' ').width;
          wi++;
        }
      }
    }

    const y = 650, x0 = 270, x1 = 1650;
    const xs = Array.from({ length: n }, (_, i) => x0 + (n === 1 ? 0 : ((x1 - x0) * i) / (n - 1)));
    for (let i = 0; i < n; i++) {
      const p = prog(lt, this.at(i), this.at(i) + 0.55, ease.outExpo);
      if (p <= 0) continue;
      const a = p * fadeOut;
      if (i > 0) {
        const lp = ease.inOutCubic(prog(lt, this.at(i) - 0.45, this.at(i) + 0.1));
        const hx = xs[i - 1]! + (xs[i]! - xs[i - 1]!) * lp;
        const seg = at(i - 0.5);
        lb.seg2(xs[i - 1]!, y, hx, y, 1.6, seg.lin, 0.9 * fadeOut);
        if (lp > 0 && lp < 1) lb.seg2(hx, y, hx + 0.01, y, 14, seg.lin, 1);
      }
      const ac = at(i);
      lb.seg2(xs[i]!, y, xs[i]! + 0.01, y, 14 + 8 * (1 - p), ac.lin, a);
      lb.seg2(xs[i]!, y, xs[i]! + 0.01, y, 5, [1.4, 1.4, 1.4], a);
      const node = this.nodes[i]!;
      c.save();
      c.globalAlpha = a;
      c.textAlign = 'center';
      c.font = font(F.archivo(100, 900), 64);
      c.fillStyle = bone(1);
      c.fillText(String(node.year), xs[i]!, y - 40 + (1 - p) * 20);
      c.font = font(F.archivo(100, 700), 30);
      c.fillStyle = ac.css(1);
      c.fillText(node.name, xs[i]!, y + 62);
      c.font = font(F.archivo(100, 500), 22);
      c.fillStyle = bone(0.8);
      const gl = wrap(c, node.gist, 410, 30, y + 108);
      for (const l of gl) c.fillText(l.text, xs[i]!, l.y);
      c.restore();
    }
    return { layer: L, lb };
  }

  cues(): Cue[] {
    const cues: Cue[] = [{ t: 0.05, voice: 'transition', gain: 0.5 }];     // the handover starts with the chain and is over before the first node
    if (this.data.intro) for (let i = 0; i < this.data.intro.split(' ').length; i += 3) cues.push({ t: INTRO_FROM + i * INTRO_GAP, voice: 'type', gain: 0.18 });
    const n = this.nodes.length;
    for (let i = 0; i < n; i++) cues.push({ t: this.at(i), voice: 'step', gain: 0.55, pitch: 0.9 + i * 0.12, pan: n > 1 ? (i / (n - 1) - 0.5) * 1.0 : 0 });   // the nodes arrive left to right
    return cues;
  }
}
