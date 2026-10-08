// Mode 1 player: autoplays silently on load; sound is opt-in. Space pauses (or replays at the end), arrows seek. The film stops at its end and offers a replay; it does not loop. ui/progress.ts is the viewer's
// progress bar (sections, label, play/pause, click to jump a scene, drag to scrub).
// `?debug` shows a scrubber and fps, `?t=12` starts at a time. Frames are a pure function of time.
import { Engine } from './engine/engine';
import { PW, PH } from './engine/gl';
import { buildTimeline } from './timeline';
import { FilmController } from './core/controller';
import type FigureScene from './core/figure';
import type { Cue } from './core/types';
import { SoundEngine } from './audio/engine';
import { makeEraAt } from './audio/era';
import { renderAudio } from './audio/offline';
import { makeBedAt } from './audio/bed';
import { MUSIC, musicStart } from './data/outro';
import { mountProgress } from './ui/progress';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const START = params.get('t') ? parseFloat(params.get('t')!) : 0;

const canvas = document.getElementById('film') as HTMLCanvasElement;
canvas.width = PW;
canvas.height = PH;
const status = document.getElementById('status')!;
const scrub = document.getElementById('scrub') as HTMLInputElement;
const info = document.getElementById('info')!;
const soundBtn = document.getElementById('sound') as HTMLButtonElement;

async function boot() {
  const built = buildTimeline();
  const engine = new Engine(canvas, () => built.entries, built.duration);
  await engine.init();
  if (engine.errors.length) throw new Error(engine.errors.join('\n\n'));
  status.remove();
  document.body.classList.toggle('debug', DEBUG);

  const ctl = new FilmController(built.duration, built.spans);
  ctl.chainIndex = (id, lt) => (engine.loaded.get(id)?.scene as FigureScene | undefined)?.chainIndex(lt) ?? -1;
  ctl.t = Math.max(0, Math.min(built.duration - 0.001, START));
  ctl.playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // sound cues come from the loaded scenes, which derive them from the same constants as their animation
  const cues: Cue[] = built.entries.flatMap((e) => (engine.loaded.get(e.id)?.scene as { cues?: (s: number) => Cue[] } | undefined)?.cues?.(e.start) ?? []);
  const eraAt = makeEraAt(built.spans);
  const bedAt = makeBedAt(built.spans, eraAt);
  const outroSpan = built.spans.find((x) => x.id === 'outro')!;
  const musicSpec = { url: `${import.meta.env.BASE_URL}${MUSIC.file}`, start: outroSpan.start + musicStart(), fadeIn: MUSIC.fadeIn, level: MUSIC.gain };
  const sound = new SoundEngine(cues, eraAt, bedAt, musicSpec);
  let fullAudio: [Float32Array, Float32Array] | null = null;
  const soundLabel = document.getElementById('soundLabel')!;
  const syncButton = () => { soundLabel.textContent = sound.muted ? 'SOUND OFF' : 'SOUND ON'; soundBtn.setAttribute('aria-pressed', String(!sound.muted)); };
  soundBtn.onclick = async () => {
    soundBtn.classList.remove('attention');
    if (sound.muted) { await sound.enable(); } else sound.disable();
    ctl.muted = sound.muted;
    syncButton();
    ctl.tick();
  };
  syncButton();

  const progress = mountProgress(ctl, built.spans);
  scrub.max = String(built.duration);
  scrub.step = '0.001';
  scrub.oninput = () => ctl.seek(parseFloat(scrub.value));
  canvas.onclick = () => ctl.toggle();
  window.addEventListener('keydown', (ev) => {
    // a focused button handles Space / Enter itself
    if ((ev.target as HTMLElement | null)?.tagName === 'BUTTON' && (ev.key === ' ' || ev.key === 'Enter')) return;
    if (ev.key === ' ') { ev.preventDefault(); ctl.toggle(); }
    if (ev.key === 'ArrowRight') ctl.seek(ctl.t + (ev.shiftKey ? 5 : 1));
    if (ev.key === 'ArrowLeft') ctl.seek(ctl.t - (ev.shiftKey ? 5 : 1));
    if (ev.key === '.') ctl.seek(ctl.t + 1 / 60);
    if (ev.key === ',') ctl.seek(ctl.t - 1 / 60);
    if (ev.key === 'm') soundBtn.click();
  });

  let last = performance.now();
  let frames = 0, fpsT = last, fps = 0;
  let busy = false;   // true while a test renders frames itself: the live loop must not touch the shared buffers
  const tick = (now: number) => {
    if (busy) { last = now; requestAnimationFrame(tick); return; }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    ctl.advance(dt);
    engine.render(ctl.t, 1 / 60);
    sound.update(ctl.t, ctl.playing, ctl.seeked);
    ctl.seeked = false;
    ctl.tick();
    progress.update();
    frames++;
    if (now - fpsT > 500) { fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now; }
    if (DEBUG) {
      scrub.value = String(ctl.t);
      const s = ctl.getState();
      info.textContent = `${ctl.t.toFixed(2)}s / ${built.duration.toFixed(0)}s  ${fps.toFixed(0)}fps  ${s.scene ?? '-'} · ${s.beat ?? '-'}${s.chainNode != null && s.chainNode >= 0 ? ' · node ' + (s.chainNode + 1) : ''}`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const w = window as unknown as { film: FilmController; __film: unknown };
  w.film = ctl;
  // Determinism check: every frame must be a pure function of t, whatever order or how often it is rendered.
  const hashFrame = async (t: number) => {
    engine.render(t, 1 / 60);
    const px = engine.readPixels();   // synchronous: no GPU-fence race between render and readback
    let h = 2166136261;
    for (let i = 0; i < px.length; i += 7) h = Math.imul(h ^ px[i]!, 16777619);
    return (h >>> 0).toString(16);
  };
  const determinism = async (times: number[]) => {
    busy = true;
    try {
      // warm-up: the very first renders in a fresh browser differ by about one level on a few hundred pixels
      // (cold GPU/text pipeline). Render every time once and let it settle before measuring.
      for (const t of times) engine.render(t, 1 / 60);
      await new Promise((r) => setTimeout(r, 1500));
      const first = new Map<number, string>();
      for (const t of times) first.set(t, await hashFrame(t));
      const shuffled = [...times].reverse().concat(times.slice(0, 3));
      const bad: { t: number; a: string; b: string }[] = [];
      for (const t of shuffled) { const h = await hashFrame(t); if (h !== first.get(t)) bad.push({ t, a: first.get(t)!, b: h }); }
      return { checked: shuffled.length, mismatches: bad };
    } finally { busy = false; }
  };
  w.__film = { engine, sound, built, duration: built.duration, still: (x: number) => engine.render(x, 1 / 60), determinism,
    /** the film's sound for t0..t1 as plain number arrays (for scripts/render-audio.mjs) */
    renderAudio: async (t0: number, t1: number, withBed = true, withMusic = true) => {
      const data = withMusic ? await (await fetch(musicSpec.url)).arrayBuffer() : null;
      const [l, r] = await renderAudio(cues, eraAt, withBed ? bedAt : null, t0, t1, data ? { data, start: musicSpec.start, fadeIn: musicSpec.fadeIn, level: musicSpec.level } : null); return { left: Array.from(l), right: Array.from(r) }; },
    /** the whole film's sound, rendered once and kept in the page; fetched with audioChunk (for scripts/render-video.mjs) */
    renderAudioFull: async () => {
      const data = await (await fetch(musicSpec.url)).arrayBuffer();
      fullAudio = await renderAudio(cues, eraAt, bedAt, 0, built.duration, { data, start: musicSpec.start, fadeIn: musicSpec.fadeIn, level: musicSpec.level });
      return Math.min(fullAudio[0].length, Math.round(built.duration * 48000));
    },
    /** `n` stereo samples from `from`, as interleaved 16-bit little-endian, base64 */
    audioChunk: (from: number, n: number) => {
      const [l, r] = fullAudio!, out = new Int16Array(n * 2);
      for (let i = 0; i < n; i++) { out[2 * i] = Math.max(-32768, Math.min(32767, Math.round((l[from + i] ?? 0) * 32767))); out[2 * i + 1] = Math.max(-32768, Math.min(32767, Math.round((r[from + i] ?? 0) * 32767))); }
      const bytes = new Uint8Array(out.buffer); let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    } };
}

boot().catch((e) => {
  console.error(e);
  status.textContent = String(e?.stack ?? e);
  status.classList.add('error');
});
