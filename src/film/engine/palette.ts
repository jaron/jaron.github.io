import { hexToLinear } from './util';

// The film lives in a restrained palette: ink, bone, and one signal colour (the site's electric blue).
// Forked from pdoom-video (MIT, Giacomo Magnanini); the orange signal is swapped for #007AFF.
export const HEX = {
  ink: '#050507', // background black (very slightly cool, to sit with the blue)
  ink2: '#0E1014', // raised black (panels, paper-in-the-dark)
  graphite: '#5E5B57', // dim lines, secondary text
  ash: '#9C978F', // mid grey
  bone: '#EEE9DF', // paper white, primary text
  signal: '#007AFF', // electric blue (the site accent): the moving subject, highlights
  ember: '#7CBAFF', // hot core: a lighter blue for cores/highlights (pure blue is low-luminance)
  blood: '#0A3FBF', // deep blue for shadows of signal
  claude: '#D97757', // the 2026 accent: a warm orange (the chain shifts from signal blue to this)
  claudeHot: '#F2A98A', // lighter orange for highlights on the 2026 side
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
