// Shared types for the film layer (see docs/spec.md). Data files import only types from here, so the
// content checker can load them under plain Node.
import type * as THREE from 'three';
import type { Frame, SceneCtx } from '../engine/scene';

export type BeatName = 'bridge' | 'problem' | 'era1996' | 'chain' | 'era2026';
export const BEAT_ORDER: BeatName[] = ['bridge', 'problem', 'era1996', 'chain', 'era2026'];
export const DEFAULT_BEATS: Record<BeatName, number> = { bridge: 3.5, problem: 4.5, era1996: 11, chain: 11, era2026: 8.5 };

/** Original thesis pagination vs scan page: thesis page = PDF page - 7. */
/** `page` is null for unnumbered front matter (title page, abstract, acknowledgements). */
export interface ThesisRef { page: number | null; pdfPage: number; quote?: string }

export type VoiceName = 'type' | 'reveal' | 'lock' | 'fail' | 'call' | 'step' | 'morph' | 'stamp';
/** A sound cue at film time `t` (seconds). Sound is data: derived from the same timing as the animation. */
export interface Cue { t: number; voice: VoiceName; gain?: number; pan?: number; /** frequency multiplier (1 = the voice's own pitch) */ pitch?: number }

/** How a modern model reads the same sentence: pieces, numbers, attention, a reply. A simplified illustration. */
export interface LanguageSpec {
  kind: 'language';
  /** transcript the reply lines are taken from (verbatim) */
  src: string;
  lead: string;
  /** the sentence split into display pieces, in rows */
  rows: string[][];
  /** word relations to draw as arcs: flattened token indexes within one row, weight 0..1 */
  links: { a: number; b: number; w: number }[];
  /** verbatim lines from the transcript excerpt to show as the reply */
  reply: string[];
  highlight?: string[];
}

/** How a modern model finds what is relevant by meaning: knowledge as points, a question as a point, the nearest light up. */
export interface MeaningSpec {
  kind: 'meaning';
  src: string;
  lead: string;
  /** clusters of knowledge, drawn as labelled groups of points */
  clusters: { name: string; x: number; y: number; r: number; n: number }[];
  /** the question and which cluster it lands next to */
  question: { label: string; near: string };
  /** items that light up, as labels (they match what the recorded reply actually uses) */
  found: string[];
  /** verbatim lines from the transcript excerpt to show as the reply */
  reply: string[];
  highlight?: string[];
}

/** A model's real self-correction: the lines are verbatim excerpts, in order, from one recorded reply. */
export interface CorrectionSpec {
  kind: 'correction';
  src: string;
  lead: string;
  lines: { role: 'claim' | 'working' | 'catch' | 'answer'; text: string }[];
}

/** How a model asks a tool for help: its call, the tool's result, and its reply. Lines are verbatim from one recorded run. */
export interface ToolCallSpec {
  kind: 'toolcall';
  src: string;
  /** the question put to the model when the run was recorded (scripts/capture-transcript.ts) */
  prompt: string;
  lead: string;
  /** what the tool is, in plain words */
  toolLabel: string;
  /** verbatim lines from the model's tool call (its code) */
  call: string[];
  /** verbatim lines the tool returned */
  result: string[];
  /** verbatim lines from the model's reply after the result */
  reply: string[];
  highlight?: string[];
}

/** A model's own estimates and ranges, drawn as triangles. Each range's evidence must appear in the recorded reply. */
export interface RangeSpec {
  kind: 'range';
  src: string;
  /** the question put to the model when the run was recorded (scripts/capture-transcript.ts) */
  prompt: string;
  lead: string;
  /** what the numbers are measured in, e.g. 'µN', and the span of the axis */
  unit: string;
  axis: { min: number; max: number; step: number };
  /** the ranges the model gave, headline first; `evidence` is a verbatim fragment of its reply that states them */
  ranges: { label: string; low: number; best: number; high: number; evidence: string }[];
  /** verbatim lines from the model's reply, in order */
  reply: string[];
  highlight?: string[];
}

/** A model's working, as a table of quantities with where each value came from. Every field is verbatim from the recorded reply. */
export interface WorkingSpec {
  kind: 'working';
  src: string;
  prompt: string;
  lead: string;
  /** the formula as the reply typesets it, and a plain-text rendering of it for the screen */
  formula: { evidence: string; text: string };
  /** `tag` is our plain-word classification of the source: given, looked up, assumed, worked out */
  rows: { quantity: string; value: string; source: string; tag: 'given' | 'looked up' | 'assumed' | 'worked out' }[];
  /** the model's answer line */
  answer: string;
}

export type Era2026Spec =
  | { kind: 'transcript'; src: string; highlight?: string[] }
  | WorkingSpec
  | RangeSpec
  | ToolCallSpec
  | CorrectionSpec
  | LanguageSpec
  | MeaningSpec
  | { kind: 'raindrop'; src: string };

export interface Era1996Spec {
  kind: string;
  refs: ThesisRef[];
  /** Renderer-specific data (kept as data, not scattered through render code). */
  data: Record<string, unknown>;
}

export interface SceneContent {
  id: string;
  /** a short first-person lead-in that says why this scene matters (like the supervisor's challenge) */
  bridge: { text: string; emphasis?: string; refs?: ThesisRef[] };
  /** Short label for the thesis passage the scene redraws, e.g. '§5.3 · EXAMPLE 3'. */
  figure: string;
  /** 1-based scene number and the total, for the "01 / 07" marker. */
  number: number;
  total: number;
  title: string;
  beats?: Partial<Record<BeatName, number>>;
  /** Optional: a scene whose bridge already says the problem can skip this beat. */
  problem?: { text: string; why: string; refs?: ThesisRef[] };
  era1996: Era1996Spec;
  /** Key into data/chains.json. */
  chain: string;
  era2026: Era2026Spec;
  /** The closing comparison. `at` is when it appears, in seconds into the 2026 beat; the viewer then gets a 5 s linger (see LINGER). */
  note: { label: 'ECHO' | 'DIFFERS'; text: string; at: number };
}

/** A Connections chain: an opening line, then dated nodes that each led to the next. */
export interface ChainData { intro?: string; nodes: ChainNode[] }

export interface ChainNode {
  year: number;
  name: string;
  /** One plain sentence on why it mattered (not just what it was). */
  gist: string;
  source: { title: string; authors: string; url: string };
  /** False until checked against the primary source. */
  verified: boolean;
}

/** Local time within a beat. */
export interface Local { lt: number; p: number; dur: number }

export interface Era1996Renderer {
  init(content: SceneContent, ctx: SceneCtx): void | Promise<void>;
  render(f: Frame, out: THREE.WebGLRenderTarget, local: Local): void;
  /** Cue times relative to the beat start. */
  cues(content: SceneContent, dur: number): Cue[];
}

export interface Era2026Renderer {
  init(spec: Era2026Spec, ctx: SceneCtx): void | Promise<void>;
  render(f: Frame, out: THREE.WebGLRenderTarget, local: Local): void;
  cues(spec: Era2026Spec, dur: number): Cue[];
}

/** Seconds the finished 2026 screen (with its note) stays before the next scene, to read it and take a breath. */
export const LINGER = 5;
/** Seconds the note takes to fade in. */
export const NOTE_FADE = 0.5;

export function beatDurations(c: SceneContent): Record<BeatName, number> {
  const d = { ...DEFAULT_BEATS, ...(c.beats ?? {}) } as Record<BeatName, number>;
  if (!c.problem) d.problem = 0;
  return d;
}
export const sceneDuration = (c: SceneContent) => BEAT_ORDER.reduce((s, b) => s + beatDurations(c)[b], 0);
