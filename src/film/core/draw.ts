// Small drawing helpers shared by beats: word wrapping, span measuring, the 1996 frame rate, big type.
import { textPath2D } from '../engine/type';

export interface WrappedLine { text: string; start: number; y: number }

/** Greedy word wrap for the context's current font. `start` is the index of the line in the source text. */
export function wrap(c: CanvasRenderingContext2D, text: string, maxW: number, lineH: number, y0: number): WrappedLine[] {
  const words = text.split(' ');
  const out: WrappedLine[] = [];
  let cur = '', start = 0, pos = 0;
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (cur && c.measureText(trial).width > maxW) {
      out.push({ text: cur, start, y: y0 + out.length * lineH });
      start = pos; cur = w;
    } else cur = trial;
    pos += w.length + 1;
  }
  if (cur) out.push({ text: cur, start, y: y0 + out.length * lineH });
  return out;
}

/** x extent of `sub` inside a wrapped line, or null if it is not on that line. */
export function spanOnLine(c: CanvasRenderingContext2D, line: WrappedLine, sub: string, x0: number) {
  const i = line.text.indexOf(sub);
  if (i < 0) return null;
  return { x0: x0 + c.measureText(line.text.slice(0, i)).width, x1: x0 + c.measureText(line.text.slice(0, i + sub.length)).width };
}

/** 1996 register: motion steps at a fixed low frame rate instead of flowing. */
export const STEP_FPS = 15;
export const stepTime = (t: number) => Math.floor(t * STEP_FPS + 1e-6) / STEP_FPS;

const bigCache = new Map<string, Path2D>();
/**
 * Fill very large type from the font's own outlines instead of fillText. The browser's GPU canvas draws big glyphs
 * through a glyph cache whose state changes what a handful of edge pixels look like (about one level), which
 * breaks "a frame is a pure function of time". Outlines are plain geometry, so they render the same every time.
 * Use it for display type of about 80 px and up; ordinary text is unaffected and stays on the fast path.
 */
export function fillBigText(c: CanvasRenderingContext2D, text: string, family: string, size: number, x: number, y: number) {
  const key = `${family}|${size}|${text}`;
  let p = bigCache.get(key);
  if (!p) { p = textPath2D(text, family, size, 0, 0); bigCache.set(key, p); }
  c.save();
  c.translate(x, y);
  c.fill(p);
  c.restore();
}
