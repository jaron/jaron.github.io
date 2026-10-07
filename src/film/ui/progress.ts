// Viewer-facing progress bar for the film: one segment per section (the opening, then each scene), a short label
// for where we are, a play/pause button, and click-to-jump / drag-to-scrub. It fades away while the film plays and
// returns on movement or when paused, leaving only a hairline. It reads and drives the FilmController only, so
// Mode 2 can reuse it. Clicking a segment always lands on the start of that scene (which fades up from black).
import type { FilmController, SceneSpan } from '../core/controller';

const IDLE_MS = 2600, FIRST_SHOW_MS = 4500, DRAG_PX = 4;

interface Seg { span: SceneSpan; el: HTMLElement; fill: HTMLElement; label: string }

const labelOf = (s: SceneSpan) =>
  s.content ? `${s.content.number} of ${s.content.total} · ${s.content.title}` : (s.label ?? 'The challenge');

export function mountProgress(ctl: FilmController, spans: SceneSpan[]) {
  const dock = document.getElementById('dock');
  const segsEl = document.getElementById('segs');
  const labelEl = document.getElementById('seekLabel');
  const seekEl = document.getElementById('seek');
  const playBtn = document.getElementById('play') as HTMLButtonElement | null;
  if (!dock || !segsEl || !labelEl || !seekEl || !playBtn) return { update() {} };

  const total = spans[spans.length - 1]!.end;
  const segs: Seg[] = spans.map((span) => {
    const el = document.createElement('div');
    el.className = 'seg';
    el.style.flexGrow = String(span.end - span.start);
    const fill = document.createElement('div');
    fill.className = 'fill';
    el.appendChild(fill);
    segsEl.appendChild(el);
    return { span, el, fill, label: labelOf(span) };
  });
  seekEl.setAttribute('aria-valuemax', String(Math.round(total)));

  // ---- label: the hovered section while pointing, otherwise the current one
  let hover = -1, current = -1, shown = '';
  const setLabel = (text: string) => { if (text !== shown) { shown = text; labelEl.textContent = text; } };
  const indexAt = (t: number) => Math.max(0, spans.findIndex((s) => t >= s.start && t < s.end));

  // ---- idle fade
  let idleTimer = 0;
  const wake = () => {
    dock.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => { if (ctl.playing && !dragging && !dock.matches(':hover, :focus-within')) dock.classList.add('idle'); }, IDLE_MS);
  };
  window.addEventListener('pointermove', wake);
  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);
  dock.addEventListener('focusin', wake);
  wake();
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => { if (ctl.playing && !dock.matches(':hover, :focus-within')) dock.classList.add('idle'); }, FIRST_SHOW_MS);

  // ---- play / pause
  playBtn.addEventListener('click', () => { ctl.toggle(); wake(); });
  const syncPlay = () => {
    const playing = ctl.playing;
    playBtn.setAttribute('aria-label', ctl.ended ? 'Replay' : playing ? 'Pause' : 'Play');
    playBtn.dataset.state = ctl.ended ? 'ended' : playing ? 'playing' : 'paused';
    if (!playing) dock.classList.remove('idle');
  };
  window.addEventListener('film:state', syncPlay);
  syncPlay();

  // ---- pointer: click a segment to jump to its scene; drag along the bar to scrub
  let dragging = false, downX = 0, moved = false;
  const timeAtX = (x: number) => {
    let best = 0, bestD = Infinity;
    segs.forEach((s, i) => {
      const r = s.el.getBoundingClientRect();
      const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      if (d < bestD) { bestD = d; best = i; }
    });
    const r = segs[best]!.el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width)));
    const s = segs[best]!.span;
    return { t: s.start + f * (s.end - s.start), index: best };
  };
  segsEl.addEventListener('pointerdown', (ev) => {
    dragging = true; moved = false; downX = ev.clientX;
    segsEl.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  segsEl.addEventListener('pointermove', (ev) => {
    const { index, t } = timeAtX(ev.clientX);
    hover = index;
    if (dragging) {
      if (!moved && Math.abs(ev.clientX - downX) < DRAG_PX) return;
      moved = true;
      ctl.seek(t);
    }
  });
  const end = (ev: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (!moved) { const { index } = timeAtX(ev.clientX); ctl.seek(segs[index]!.span.start); }
    hover = -1;   // the label follows the film again until the pointer moves
    wake();
  };
  segsEl.addEventListener('pointerup', end);
  segsEl.addEventListener('pointercancel', () => { dragging = false; });
  segsEl.addEventListener('pointerleave', () => { if (!dragging) hover = -1; });

  let lastFill = '';
  let last26 = false;
  return {
    /** Call every frame. */
    update() {
      const t = ctl.t;
      current = indexAt(t);
      // fills
      let key = '';
      segs.forEach((s, i) => {
        const f = i < current ? 1 : i > current ? 0 : (t - s.span.start) / (s.span.end - s.span.start);
        key += f.toFixed(3) + ',';
      });
      if (key !== lastFill) {
        lastFill = key;
        const fs = key.split(',');
        segs.forEach((s, i) => { s.fill.style.transform = `scaleX(${fs[i]})`; s.el.classList.toggle('past', i < current); s.el.classList.toggle('now', i === current); });
      }
      setLabel(segs[hover >= 0 ? hover : current]!.label);
      seekEl.setAttribute('aria-valuenow', String(Math.round(t)));
      seekEl.setAttribute('aria-valuetext', segs[current]!.label);
      // orange while the scene is in its 2026 half, like the film itself
      const now26 = ctl.getState().beat === 'era2026';
      if (now26 !== last26) { last26 = now26; dock.classList.toggle('is2026', now26); }
    },
  };
}
