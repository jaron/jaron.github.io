# QPS at 30: Technical spec (Mode 1)

Companions: [storyboard.md](storyboard.md) (what the film says), [design.md](design.md) (look, PDF pipeline), [roadmap.md](roadmap.md) (what is done and what is next).
Status: draft for review. Describes the system to build on top of the forked engine already in `src/film/engine/`.

## 1. Goals and non-goals

Goals (Mode 1):

- A ~5:00 zero-click film at `/thesis`, autoplaying silently, 16:9 stage scaled to fit.
- Every frame a pure function of film time `t` (scrubbable, seekable, exportable, identical live and offline).
- Content (text, dates, quotes, trees, transcripts) lives in structured data, separate from animation code.
- Sound effects, off by default, enabled by a button.
- A 2026 beat that can swap transcripts for Raindrop visualisations without touching the scene engine.
- A controller API and state events so Mode 2 can attach later without changing the film.

Non-goals now: Mode 2 UI, the thesis reader, mobile portrait layout, the PDF edition itself (separate pipeline, see design.md).

## 2. Architecture

```
src/film/
  engine/            forked pdoom-video engine (renderer, post, lines, type, stroke, util). Few edits; keep diffable.
  core/              film layer, ours:
    figure.ts          FigureScene: the Problem/1996/Chain/2026 template
    chain.ts           Connections chain component
    dissolve.ts        1996 -> 2026 morph pass
    note.ts            ECHO / DIFFERS label
    controller.ts      play/pause/seek + state events (Mode 2 hook)
    quality.ts         tier detection
  era1996/           one renderer per scene's 1996 beat (tree, lattice, handoffs, ...)
  era2026/           slot implementations: transcript.ts now, raindrop.ts later
  audio/             cues.ts (types), engine.ts (Web Audio), voices.ts (synthesized sounds)
  data/
    content/         one file per scene + cold-open + outro (see section 4)
    figures/         search trees etc. as data, shared with the PDF edition
    chains.json      Connections nodes with sources and verification status
    transcripts/     recorded real model runs, raw
  timeline.ts        builds the master timeline from content
  main.ts            boot, player loop
scripts/
  render.ts          offline export (headless Chrome -> ffmpeg), ported from pdoom-video
  check-content.ts   validates data (refs, quotes, chain verification, durations)
  determinism.ts     renders frames twice, out of order, compares hashes
```

Rendering stack: three.js `WebGLRenderer` with HDR half-float targets, bloom/halation/grain post, `LineBatch` hairlines, `Layer2D` Canvas2D for type. DOM is used only for the stage, the sound button and the accessible transcript, never for film imagery.

## 3. Time model

- `t` is film seconds, 0 to `DURATION` (~300).
- The master timeline is a list of `TimelineEntry` (engine type): `{ id, load, start, end, params, post }`. One entry per scene: cold open, 7 figure scenes, outro.
- Scene boundaries are hard cuts unless a scene sets `handlesTransition` (the engine crossfades overlapping entries by default).
- Inside a figure scene, time is divided into five **beats**: `bridge` (first-person lead-in), `problem`, `era1996`, `chain`, `era2026`. Default durations are 3.5 (bridge) / 4.5 / 11 / 9 / 8.5 s (36.5 s) and are overridable per scene. Scene durations sum with the cold open (41 s) and outro (25 s) to about 5:20.
- Timing is authored in seconds. There is no beat grid. Scenes may expose named internal events (`'node.lock'`) for cues, defined from the same constants that drive animation.

Rules (inherited from the engine, enforced by `determinism.ts`):

- Output depends only on `f.t` and seeded randomness (`mulberry32`, `hash`). No `Math.random()`, `Date.now()`, `performance.now()` in render paths.
- Per-frame flicker uses `frameIdx(t)`, not `Math.floor(t*60)`.
- Stateful scenes are avoided; if unavoidable they set `stateful = true` and cannot be exported with adaptive sampling.

## 4. Content data

Each figure scene is one file in `data/content/`, typed:

```ts
interface SceneContent {
  id: string;                    // 's03-dead-ends'
  figure: string;                // 'FIG. 5.4' (the thesis figure it redraws)
  title: string;                 // 'Dead ends and loops'
  beats?: Partial<Record<'problem'|'era1996'|'chain'|'era2026', number>>; // seconds, overrides defaults
  problem: { text: string; why: string };      // 5 s: bold statement + one line on why it is hard
  era1996: { kind: string; figureData?: string; refs: ThesisRef[]; script: Step[] };
  chain: string;                 // key into chains.json
  era2026: Era2026Spec;
  note: { label: 'ECHO' | 'DIFFERS'; text: string };
}

interface ThesisRef { page: number; pdfPage: number; quote?: string; }
```

- `page` is the original thesis pagination (thesis page = PDF page − 7); `pdfPage` is the scan page.
- `quote` strings are verbatim from the verified text. `check-content.ts` fails the build if a quote is not found at its page in the extracted text.
- `script: Step[]` is the 1996 beat's authored sequence (`{ at: number; do: 'reveal'|'lock'|'fail'|'solve'; target: string }`), consumed by the scene's `era1996` renderer. Keeps timing in data, not scattered in render code.

### Figures as data

Search trees live in `data/figures/*.json`, schema:

```ts
interface Tree { nodes: TreeNode[]; solveOrder: string[]; }
interface TreeNode {
  id: string; label: string;
  kind: 'goal' | 'formula' | 'qty' | 'known' | 'fail';
  parent?: string; join?: 'AND' | 'OR';
  note?: string;           // 'KNOWN: water 1000 kg/m³', 'Quantity reappeared'
}
```

The film draws and animates them. The PDF edition renders the same files to static vector SVG. Layout is computed (left-to-right tidy tree) and cached, not hand-placed; the current placeholder in `scenes/raindrop.ts` becomes `figures/raindrop.json` plus the generic tree renderer.

### Chains

`chains.json`:

```ts
interface ChainNode {
  year: number; name: string; gist: string;   // one line, plain
  source: { title: string; authors: string; url: string };
  verified: boolean;                          // false until checked against the primary source
}
```

`check-content.ts` warns on `verified: false`. With `--strict` it fails on unverified chain nodes, fixture transcripts and thesis quotes it cannot find. `--strict` is **not wired into `npm run build` yet**, so the site keeps deploying while the film is in progress; wire it in (CI step) before the film is linked publicly.

## 5. The figure scene template

`FigureScene` (extends engine `Scene`) composes four beat renderers from a `SceneContent`:

| Beat | Renderer | Notes |
|---|---|---|
| problem | `ProblemBeat` | bold Archivo statement, mono "why it is hard" line, figure number |
| era1996 | scene-specific, from `era1996/` | draws only in the 1996 register |
| chain | `Chain` + `Dissolve` | section 6 |
| era2026 | slot from `era2026/` | section 7 |

Per-frame flow: determine the beat from `f.lt` and the beat table; render to a target; chain beat blends the two eras. Beats share one hairline-engraving visual grammar from the engine's `hatch`/`engrave` and `LineBatch`.

Registers:

- **1996:** `bone`/`graphite` hairlines, integer-stepped motion (snapped eases), no bloom except KNOWN locks, no halation, tight grain. Palette from `palette.ts`.
- **2026:** same geometry softened: signal-blue glow, bloom on, fields and heatmaps instead of boxes.

## 6. Connections chain and the morph

Chain beat (8.5 s), for N nodes (3–5):

- Nodes appear along a path on the stage: `year` in mono, `name` in Archivo, `gist` in smaller mono, each with a connector drawn from the previous node. Reveal time `t_i = chainStart + i * (9 / N)`.
- A morph scalar `k ∈ [0,1]` rises in a spring step at each node (`k = (i+1)/N`).
- `Dissolve` is a post pass blending two render targets: `A` = 1996 final frame (held at the beat's last time, no further animation), `B` = 2026 first frame. Controlled by `k`:
  - blur radius grows with `k` (lines become glow),
  - posterisation/stepping falls with `k` (discrete to continuous),
  - noise-threshold dissolve for `A -> B` with edge glow in `signal`,
  - hairline width tracks `k` from 1.2 px to a soft 4 px.
- 4K: `Dissolve` runs at the target scale; all pixel radii use `PX_SCALE` as in the engine's `pxLine` convention.

Tuning knob: with 3–4 nodes in 8.5 s, each node reads for ~2–3 s. If that is too fast in review, drop to 3 nodes or lengthen the beat. This is a content/timing change, not a code change.

## 7. The 2026 slot

```ts
interface Era2026Renderer {
  init(spec: Era2026Spec, ctx: SceneCtx): Promise<void>;
  render(f: Frame, out: THREE.WebGLRenderTarget, local: { lt: number; p: number }): void;
}
type Era2026Spec =
  | { kind: 'transcript'; src: string; highlight?: Span[]; }
  | { kind: 'language';   src: string; lead: string; rows: string[][]; links: Link[]; reply: string[]; }   // how a model reads the sentence
  | { kind: 'raindrop';   src: string; };            // later: model-internals visualisation
```

Registry: `era2026/index.ts` maps `kind` to a renderer. Scenes never import a renderer directly.

### Transcript renderer (now)

Input `data/transcripts/<scene>.json`, recorded from real runs:

```ts
interface Transcript {
  model: string; date: string; tool?: string;     // e.g. 'claude-opus-5-5', '2026-10-06'
  prompt: string;
  turns: Turn[];                                  // reasoning / answer / tool_call / tool_result
}
```

- Text streams in at a constant authored rate (not the recorded latency), so timing is deterministic.
- Tool calls render as cards (name, arguments, result) that slide in and resolve, which doubles as the scene 4 hero.
- `highlight` spans mark the phrases that carry the scene's point; they glow in `signal`.
- Transcripts are raw, unedited model output trimmed to the beat's length; trimming is logged in the file (`trimmed: true`, source offsets). Nothing shown on screen was not actually produced.

### Raindrop renderer (later)

Same interface. Takes model-internals data (format TBD by that project). The slot contract is the only dependency; no scene changes needed.

## 8. Sound

Principle: sound is data derived from the same timing as the animation, never a side effect of `render()`.

```ts
interface Cue { t: number; voice: VoiceName; gain?: number; pan?: number; }
```

- Each scene exposes `cues(start): Cue[]`, computed from the same constants that drive its animation (reveal times, lock times, typing spans). Because the cues depend on loaded content (e.g. the transcript), `main.ts` collects them from the loaded scenes after `engine.init()` and hands them to the sound engine.
- `audio/engine.ts` (Web Audio): each frame it fires cues in `(lastT, t]` only when playing forward and not seeking; a seek flushes scheduled sounds. Cues are scheduled ahead on the audio clock for sample-accurate timing.
- Voices are synthesized in `audio/voices.ts`, no sample files: `type` (soft tick), `reveal`, `lock` (clear high ping, the KNOWN beat), `fail` (low short thud), `call` (tool-call blip), `step` (chain node), `morph` (rising filtered noise sweep), `stamp`. One shared limiter and master gain, quiet by default.
- Default muted. A small unobtrusive "enable sound" control sits in a corner, hidden during stills/export; the first user gesture resumes the `AudioContext`. State persisted in `localStorage` (try/catch).
- Export: `scripts/render.ts` mixes the cue list with `OfflineAudioContext` into a WAV and muxes it with the video via ffmpeg. Because cues are data, the export is deterministic.

## 9. Controller and Mode 2 hook

```ts
interface FilmState {
  t: number; playing: boolean;
  scene: string | null; beat: 'problem'|'era1996'|'chain'|'era2026'|'intro'|'outro'|null;
  chainNode?: number;
  refs: ThesisRef[];            // thesis passages currently on screen
  muted: boolean;
}
interface FilmController {
  play(): void; pause(): void; seek(t: number): void;
  seekTo(sceneId: string, beat?: string): void;
  getState(): FilmState;
  on(event: 'state', cb: (s: FilmState) => void): () => void;
}
```

Exposed as `window.film` and emitted as DOM events. `refs` is built from the active scene content, so Mode 2 can open the reader at the right page and branch out of the flow with no change to the film code.

## 10. Quality and performance

- Logical layout stays 1920×1080; `SCALE` (engine, set once at load) is 1 or 2.
- Tier chosen at boot from a probe render: **high** (SCALE 2 on 4K/retina displays with headroom), **mid** (SCALE 1, full post), **low** (SCALE 1, bloom radius and grain reduced, no halation). The probe measures ~30 frames; if sustained < 30 fps on **low**, show the YouTube embed of the same film instead of the live canvas (privacy-enhanced `youtube-nocookie.com` embed, loaded only when needed, so nothing is requested from YouTube until then).
- Budget: < 12 ms/frame at 1080p on a mid laptop. The placeholder measured 6.2 ms/frame on an M4 (no post tuning yet).
- Loading: fonts and scene modules load behind a short "loading" state; scenes load lazily and the first scene starts as soon as it is ready. Archivo widths/weights unused by scenes are pruned from `public/fonts`.
- `prefers-reduced-motion`: do not autoplay; show a poster frame and a play button.

## 11. Accessibility and fallbacks

- A visually hidden, auto-generated transcript (`<details>`/`aria-live` off) from content data: problem text, 1996 summary, chain nodes, 2026 note. The canvas itself is `role="img"` with a label.
- WebGL2 unavailable: show the YouTube embed with the same transcript.
- All sound is optional and off by default.

## 12. Export and hosting

- `scripts/render.ts` ported from pdoom-video: headless Chrome via playwright-core, frames streamed over a WebSocket to ffmpeg. Modes: `stills` (PNGs at given times), `sheet` (contact sheet), `video` (range or full, `--scale 2` for 4K, `--samples auto` adaptive motion blur).
- Output: a 4K60 H.264 MP4 master, uploaded by the author to **YouTube** (decided). The video is not stored in the Git repo.
- YouTube re-encodes everything, and compression smears film grain (pdoom-video's README notes the same). The export therefore has a `--grain` override: the upload master uses reduced grain and the full-quality motion-blur sampling (`--samples auto`), while the live canvas keeps the full grain.
- Uploading is a manual step for the author (account and publication are theirs); the pipeline only produces the file.
- The page needs the YouTube video ID once it exists; until then the fallback in section 10 is disabled.
- Tooling requirements: bun is not needed, the repo uses npm. playwright-core, ffmpeg (already installed) and Chrome.

## 13. Verification

- `npm run check:content`: schema, thesis page refs, verbatim quotes, chain verification flags, beat durations sum to the target runtime.
- Determinism: `window.__film.determinism(times)` (in the page) renders the times in order, then reversed with repeats, and compares frame hashes. Currently run by hand in the browser; to become a script (`scripts/determinism.ts`) with the export pipeline. Two traps found while building it: the live render loop must be paused during the test (it renders into the same buffers), and pixels must be read back **synchronously** (`readPixels`): the async fence readback raced with the next render and produced a false mismatch roughly one run in eight. With both fixed: 150 renders over the cold open and scene 1, zero mismatches. The export pipeline must use the same synchronous readback when it compares frames.
- Stills review: `scripts/render.ts stills` at each beat boundary and mid-beat, inspected visually after every scene change.
- CI: `tsc --noEmit` and `astro build`. The GitHub Pages workflow already runs the build (Node 22).

## 14. Milestones

| # | Deliverable | Notes |
|---|---|---|
| M0 | Fork engine, `/thesis` stage, placeholder scene | **Done** |
| M1 | This spec | In review |
| M2 | Core: `FigureScene`, `ProblemBeat`, `Chain`, `Dissolve`, note label, cues + audio engine, controller, content schema + `check-content` | **Done** (scene 1 as the slice; determinism verified in-page: 17 renders, 0 mismatches) |
| M3 | Cold open + scene 1 fully built (all four beats, real chain, real transcript) | Proves the look, the morph, the timing |
| M4 | Scenes 2–7 | Each: 1996 renderer, data, chain, transcript, cues |
| M5 | Outro, loading/quality tiers, accessibility, fallback | |
| M6 | Export pipeline, 4K master, upload to YouTube (author), embed fallback | |
| M7 | PDF edition integration (links, page refs), Mode 2 groundwork | Depends on the marker/typeset pipeline |

## 15. Risks and open items

- **Unexplained determinism flake (updated).** Beyond the first-frame case below, one page load produced 3 consistent mismatches (frames 0.4 and 38.6, the two largest-type frames); a fresh load of the identical code then passed 7 consecutive runs (about 300 renders), and every direct pixel comparison (first vs repeat renders, different predecessors, different dt) was exact. The cause is not found. Original note: The in-page hash test occasionally (about 1 run in 8, only on the first frame after a fresh load) reported a mismatch. A pixel-exact comparison could not reproduce it: 240 stress renders of four frames, each after a random other frame, and three fresh loads all matched exactly. Treat as a possible one-off startup artifact until the export pipeline compares frames across two full passes. Mitigation for export: always render and discard one warm-up frame before frame 0.
- **Chain accuracy.** Years and attributions are unverified. Blocking for M3 and any publication.
- **Transcript honesty.** Only real, logged model runs; document model, date and any trimming on screen or in credits.
- **Performance on weak devices.** Mitigated by tiers and the YouTube fallback; real device testing needed.
- **Hosting of the video.** Resolved: YouTube. The embed is the fallback for weak devices. It is a plain video: no cue-synced sound control and no Mode 2 hooks.
- **Engine drift.** The fork diverges from pdoom-video; changes to `engine/` stay small and documented so useful upstream changes can be diffed in.
- **Attribution.** Credit pdoom-video (MIT, Giacomo Magnanini) and the font licenses (OFL) in the page credits.
- **Thesis edition.** Re-typeset edition only; the scan is not published. PDF regeneration is in progress (marker, chunked).
