// FigureScene: one thesis-to-present scene built from content. Four beats: PROBLEM, 1996, CHAIN, 2026.
// The chain beat blends a frozen last frame of 1996 into the first frame of 2026 under the Connections chain.
import type * as THREE from 'three';
import { Scene, type Frame } from '../engine/scene';
import { makeRT, Layer2D } from '../engine/gl';
import { createEra1996 } from '../era1996';
import { createEra2026 } from '../era2026';
import { Chain } from './chain';
import { Dissolve } from './dissolve';
import { ease, prog } from '../engine/util';
import { stepTime } from './draw';
import { BridgeBeat } from './bridge';
import { ProblemBeat } from './problem';
import { BEAT_ORDER, beatDurations, type BeatName, type Cue, type Era1996Renderer, type Era2026Renderer, type SceneContent } from './types';

export interface BeatSpan { name: BeatName; start: number; end: number }

/** Beat boundaries relative to the scene start. */
export function beatSpans(c: SceneContent): BeatSpan[] {
  const d = beatDurations(c);
  let t = 0;
  return BEAT_ORDER.map((name) => { const s = { name, start: t, end: t + d[name] }; t += d[name]; return s; });
}

export default class FigureScene extends Scene {
  handlesTransition = false;
  private content!: SceneContent;
  private spans!: BeatSpan[];
  private bridge!: BridgeBeat;
  private problem: ProblemBeat | null = null;
  private e96!: Era1996Renderer;
  private e26!: Era2026Renderer;
  private chain!: Chain;
  private dissolve = new Dissolve();
  private rtA = makeRT();
  private rtB = makeRT();
  private overlay = new Layer2D();

  async init() {
    this.content = this.ctx.params.content as SceneContent;
    this.spans = beatSpans(this.content);
    this.bridge = new BridgeBeat(this.content, this.ctx);
    if (this.content.problem) this.problem = new ProblemBeat(this.content, this.content.problem, this.ctx);
    this.e96 = await createEra1996(this.content.era1996.kind);
    await this.e96.init(this.content, this.ctx);
    this.e26 = createEra2026(this.content.era2026, this.content);
    await this.e26.init(this.content.era2026, this.ctx);
    const chainSpan = this.spans.find((s) => s.name === 'chain')!;
    this.chain = new Chain(this.content.chain, chainSpan.end - chainSpan.start);
  }

  /** Index of the latest chain node visible at local chain time `lt` (for the controller state). */
  chainIndex(lt: number) { return this.chain.index(lt); }

  private local(name: BeatName, lt: number) {
    const s = this.spans.find((x) => x.name === name)!;
    const dur = s.end - s.start;
    return { lt, p: lt / dur, dur };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx;
    const t = f.lt;
    const span = this.spans.find((s) => t >= s.start && t < s.end) ?? this.spans[this.spans.length - 1]!;
    const lt = t - span.start;
    const L = this.local(span.name, lt);
    switch (span.name) {
      case 'bridge': this.bridge.render(f, out, L); break;
      case 'problem': this.problem?.render(f, out, L); break;
      case 'era1996': this.e96.render(f, out, { ...L, lt: stepTime(lt) }); break;
      case 'era2026': this.e26.render(f, out, L); break;
      case 'chain': {
        const d96 = this.local('era1996', this.spans.find((s) => s.name === 'era1996')!.end - this.spans.find((s) => s.name === 'era1996')!.start);
        this.e96.render(f, this.rtA, { ...d96, lt: d96.dur, p: 1 });
        const d26 = this.local('era2026', 0);
        this.e26.render(f, this.rtB, d26);
        const k = this.chain.k(lt);
        // the old screen goes fully black, quickly, so nothing shows through the new text
        this.dissolve.render(renderer, this.rtA.texture, this.rtB.texture, out, k, Math.min(1, Math.max(0, 1 - ease.outCubic(prog(lt, 0, 0.3))) + ease.inCubic(prog(lt, L.dur - 1.2, L.dur))));
        const { layer, lb } = this.chain.draw(lt);
        lb.render(renderer, out);
        comp.draw(renderer, layer.upload(), out);
        break;
      }
    }
    // the scene fades up from black, so the cut from the previous scene is never abrupt
    const fade = span.name === 'bridge' ? 1 - ease.outCubic(prog(lt, 0, 0.45)) : 0;
    return { bloom: span.name === 'era1996' ? 0.35 : 0.8, halation: span.name === 'era1996' ? 0.05 : 0.25, fade };
  }

  /** All sound cues of this scene in film time (scene start added by the timeline). */
  cues(start: number): Cue[] {
    const out: Cue[] = [];
    const add = (cs: Cue[], at: number) => cs.forEach((c) => out.push({ ...c, t: c.t + at + start }));
    const s = (n: BeatName) => this.spans.find((x) => x.name === n)!;
    add(this.bridge.cues(), s('bridge').start);
    if (this.problem) add(this.problem.cues(), s('problem').start);
    add(this.e96.cues(this.content, s('era1996').end - s('era1996').start), s('era1996').start);
    add(this.chain.cues(), s('chain').start);
    add(this.e26.cues(this.content.era2026, s('era2026').end - s('era2026').start), s('era2026').start);
    return out.sort((a, b) => a.t - b.t);
  }
}
