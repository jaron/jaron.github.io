// Which era a moment of the film belongs to, as a number: 0 is 1996 (dry, square-wave beeps), 1 is 2026 (warm, bell-like
// tones). The chain between them morphs from one to the other, the same way the picture dissolves.
import type { SceneSpan } from '../core/controller';

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const CHAIN_FADE_OUT = 1.3;       // the chain fades out over its last 1.3 s (see core/chain.ts)

export function makeEraAt(spans: SceneSpan[]): (t: number) => number {
  return (t) => {
    const s = spans.find((sp) => t >= sp.start && t < sp.end);
    if (!s) return 1;
    if (s.id === 'cold-open') return 0;
    if (s.id === 'outro') return 1;
    const lt = t - s.start;
    const b = s.beats?.find((x) => lt >= x.start && lt < x.end);
    if (!b) return 0;
    if (b.name === 'chain') return smooth(clamp01((lt - b.start) / Math.max(0.1, b.end - b.start - CHAIN_FADE_OUT)));
    return b.name === 'era2026' ? 1 : 0;
  };
}
