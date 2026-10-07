// The note at the end of the 2026 beat: a '1996 vs 2026' headline, a label and one plain line.
// It appears at `note.at` seconds into the beat and then stays for LINGER seconds (the content checker enforces this).
import { Layer2D } from '../engine/gl';
import { rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog } from '../engine/util';
import { NOTE_FADE, type Cue, type SceneContent } from './types';

/** What the viewer reads for each kind of note (the data keeps the short keys). */
const LABELS = { ECHO: 'A SIMILAR IDEA', DIFFERS: 'DONE DIFFERENTLY NOW' } as const;

export class Note {
  layer = new Layer2D();
  constructor(private note: SceneContent['note']) {}

  /** Draw into a Canvas2D context the caller composites; `lt` is seconds into the 2026 beat. */
  draw(c: CanvasRenderingContext2D, lt: number) {
    const a = ease.outCubic(prog(lt, this.note.at, this.note.at + NOTE_FADE));
    if (a <= 0) return;
    c.save();
    c.globalAlpha = a;
    // band behind the note so it reads over whatever is on screen
    const g = c.createLinearGradient(0, 860, 0, 1080);
    g.addColorStop(0, rgba('ink', 0));
    g.addColorStop(0.3, rgba('ink', 0.92));
    g.addColorStop(1, rgba('ink', 0.96));
    c.fillStyle = g;
    c.fillRect(0, 860, 1920, 220);
    c.textBaseline = 'alphabetic';
    // the headline: this is a comparison, not part of the answer shown above it
    c.font = font(F.mono(500), 16);
    c.letterSpacing = '5px';
    let hx = 96;
    for (const [txt, col] of [['1996', 'signal'], [' VS ', 'ash'], ['2026', 'claude']] as const) {
      c.fillStyle = rgba(col, 1);
      c.fillText(txt, hx, 936);
      hx += c.measureText(txt).width;
    }
    c.font = font(F.mono(500), 18);
    c.letterSpacing = '4px';
    const isDiff = this.note.label === 'DIFFERS';
    c.fillStyle = isDiff ? rgba('claudeHot', 1) : rgba('claude', 1);
    const label = LABELS[this.note.label];
    const y = 988;
    c.fillText(label, 96, y);
    const lw = c.measureText(label).width;
    c.letterSpacing = '0px';
    c.strokeStyle = isDiff ? rgba('claudeHot', 0.9) : rgba('claude', 0.9);
    c.lineWidth = 1;
    c.strokeRect(86, y - 24, lw + 20, 34);
    // the sentence takes the rest of the line; it shrinks a little before it is squeezed
    const x = 96 + lw + 44, avail = 1824 - x;
    let size = 30;
    c.font = font(F.archivo(100, 500), size);
    while (size > 25 && c.measureText(this.note.text).width > avail) { size -= 1; c.font = font(F.archivo(100, 500), size); }
    c.fillStyle = rgba('bone', clamp(a * 1.2));
    c.fillText(this.note.text, x, y, avail);
    c.restore();
  }

  cue(): Cue { return { t: this.note.at, voice: 'reveal', gain: 0.45 }; }
}
