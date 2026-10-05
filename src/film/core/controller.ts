// The film's public control surface (Mode 2 attaches here). One source of truth for time and playback;
// state events fire on discrete changes (scene, beat, chain node, playing, muted), not every frame.
import type { BeatName, ThesisRef } from './types';
import { sceneDuration, type SceneContent } from './types';

export type FilmBeat = BeatName | 'intro' | 'outro';
export interface FilmState {
  t: number; playing: boolean; muted: boolean;
  scene: string | null; beat: FilmBeat | null; chainNode: number | null;
  refs: ThesisRef[];
}

export interface SceneSpan { id: string; start: number; end: number; content?: SceneContent; beats?: { name: BeatName; start: number; end: number }[] }

export class FilmController {
  t = 0;
  playing = true;
  muted = true;
  /** Set true for one frame after any jump, so the audio engine and stateful scenes can flush. */
  seeked = true;
  private listeners = new Set<(s: FilmState) => void>();
  private last = '';
  chainIndex: (spanId: string, lt: number) => number = () => -1;

  constructor(public duration: number, private spans: SceneSpan[]) {}

  play() { this.playing = true; this.emit(); }
  pause() { this.playing = false; this.emit(); }
  toggle() { this.playing ? this.pause() : this.play(); }
  seek(t: number) { this.t = Math.max(0, Math.min(this.duration - 0.001, t)); this.seeked = true; this.emit(); }
  seekTo(sceneId: string, beat?: string) {
    const s = this.spans.find((x) => x.id === sceneId);
    if (!s) return;
    const b = beat ? s.beats?.find((x) => x.name === beat) : undefined;
    this.seek(s.start + (b?.start ?? 0));
  }
  advance(dt: number) {
    if (!this.playing) return;
    this.t += dt;
    if (this.t >= this.duration) { this.t = 0; this.seeked = true; }
  }

  getState(): FilmState {
    const span = this.spans.find((s) => this.t >= s.start && this.t < s.end) ?? null;
    let beat: FilmBeat | null = null, chainNode: number | null = null, refs: ThesisRef[] = [];
    if (span) {
      const lt = this.t - span.start;
      if (span.content && span.beats) {
        const b = span.beats.find((x) => lt >= x.start && lt < x.end);
        beat = b?.name ?? null;
        if (beat === 'chain' && b) chainNode = this.chainIndex(span.id, lt - b.start);
        const c = span.content;
        refs = beat === 'bridge' ? c.bridge.refs ?? [] : beat === 'problem' ? c.problem?.refs ?? [] : beat === 'era1996' ? c.era1996.refs : [];
      } else beat = 'intro';
    }
    return { t: this.t, playing: this.playing, muted: this.muted, scene: span?.id ?? null, beat, chainNode, refs };
  }

  on(event: 'state', cb: (s: FilmState) => void) { void event; this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }

  /** Call every frame; emits only when something discrete changed. */
  tick() { this.emit(); }

  private emit() {
    const s = this.getState();
    const key = `${s.scene}|${s.beat}|${s.chainNode}|${s.playing}|${s.muted}`;
    if (key === this.last) return;
    this.last = key;
    this.listeners.forEach((cb) => cb(s));
    window.dispatchEvent(new CustomEvent('film:state', { detail: s }));
  }
}

export { sceneDuration };
