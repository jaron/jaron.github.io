// The ECHO / DIFFERS note at the end of the 2026 beat: a label and one plain line.
import { Layer2D } from '../engine/gl';
import { rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, ease, prog } from '../engine/util';
import type { Cue, SceneContent } from './types';

export const NOTE_AT = 0.62; // fraction of the 2026 beat

export class Note {
  layer = new Layer2D();
  constructor(private note: SceneContent['note'], private at = NOTE_AT) {}

  /** Draw into a Canvas2D context the caller composites; `p` is progress through the 2026 beat. */
  draw(c: CanvasRenderingContext2D, p: number, wrapMaxW = 1500) {
    const a = ease.outCubic(prog(p, this.at, this.at + 0.08));
    if (a <= 0) return;
    c.save();
    c.globalAlpha = a;
    // band behind the note so it reads over the transcript
    const g = c.createLinearGradient(0, 880, 0, 1080);
    g.addColorStop(0, rgba('ink', 0));
    g.addColorStop(0.35, rgba('ink', 0.92));
    g.addColorStop(1, rgba('ink', 0.96));
    c.fillStyle = g;
    c.fillRect(0, 880, 1920, 200);
    c.textBaseline = 'alphabetic';
    c.font = font(F.mono(500), 18);
    c.letterSpacing = '4px';
    const isDiff = this.note.label === 'DIFFERS';
    c.fillStyle = isDiff ? rgba('claudeHot', 1) : rgba('claude', 1);
    const label = this.note.label;
    c.fillText(label, 96, 978);
    const lw = c.measureText(label).width;
    c.letterSpacing = '0px';
    c.strokeStyle = isDiff ? rgba('claudeHot', 0.9) : rgba('claude', 0.9);
    c.lineWidth = 1;
    c.strokeRect(86, 954, lw + 20, 34);
    c.font = font(F.archivo(100, 500), 30);
    c.fillStyle = rgba('bone', clamp(a * 1.2));
    c.fillText(this.note.text, 96 + lw + 44, 978, wrapMaxW - lw);
    c.restore();
  }

  cue(dur: number): Cue { return { t: dur * this.at, voice: 'reveal', gain: 0.45 }; }
}
