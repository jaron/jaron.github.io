import type { SceneContent } from '../../core/types';

// Scene 5: every measurement is a little wrong, so the program carried a best guess with a lower and upper bound through
// every calculation (thesis ch. 6). We replay the film's own raindrop with an assumed measurement error, as an illustration.
// Quotes are verbatim from the thesis (check-content verifies them).
const content: SceneContent = {
  id: 's05-uncertainty',
  bridge: {
    text: "Every measurement is a little wrong. A single number pretends otherwise. So my program carried each number's uncertainty through every step.",
    emphasis: "carried each number's uncertainty through every step.",
    refs: [{ page: 109, pdfPage: 116, quote: 'Almost all numerical scientific data is subject to error' }],
  },
  figure: '§6.5 · THE TRIANGULAR FUZZY NUMBER',
  number: 5,
  total: 7,
  title: 'Knowing how sure we are',
  beats: { bridge: 6.5, era1996: 19, era2026: 15.0 },
  era1996: {
    kind: 'triangles',
    refs: [
      { page: 119, pdfPage: 126, quote: 'at least 200 measurements' },
      { page: 130, pdfPage: 137, quote: 'is a triangular inequality of the form [lower bound, optimum value, upper bound]' },
      { page: 131, pdfPage: 138, quote: 'People prefer thinking with crisp values' },
      { page: 108, pdfPage: 115, quote: 'Everything is vague to a degree you do not realise till you have tried to make it precise.' },
    ],
    data: {
      label: 'THE RAINDROP AGAIN, WITH UNCERTAINTY',
      source: 'THESIS P.130–136 · THE MEASUREMENT ERROR OF ±0.05 MM IS AN ASSUMPTION FOR ILLUSTRATION',
      // the film's own raindrop (cold open): a 1 mm drop of water, measured to the nearest tenth of a millimetre
      inputs: { diameter: { lower: 0.95, best: 1.0, upper: 1.05 }, density: 1000, gravity: 9.81 },
      rows: [
        { id: 'diameter', name: 'DIAMETER', rule: 'measured to the nearest tenth of a millimetre', unit: 'mm', scale: 1, decimals: 2, at: 1.2 },
        { id: 'radius', name: 'RADIUS', rule: 'half the diameter', unit: 'mm', scale: 1, decimals: 3, at: 3.6 },
        { id: 'volume', name: 'VOLUME', rule: '4/3 × π × radius × radius × radius', unit: '×10⁻¹⁰ m³', scale: 1e10, decimals: 1, at: 5.6 },
        { id: 'mass', name: 'MASS', rule: 'density × volume', unit: '×10⁻⁷ kg', scale: 1e7, decimals: 1, at: 7.6 },
        { id: 'force', name: 'FORCE', rule: 'mass × gravity', unit: 'µN', scale: 1e6, decimals: 1, at: 9.4 },
      ],
      bracket: 11.2,
      quote: 14.9,
      captions: [
        { t: 1.0, text: 'A drop measured to the nearest tenth of a millimetre isn’t exactly 1 mm. It’s a best guess with a lower and an upper bound.' },
        { t: 3.5, text: 'Each step carries the whole range along, not just the best guess.' },
        { t: 5.5, text: 'The volume uses the radius three times, so the range widens.' },
        { t: 9.3, text: 'The answer is a range, and so is every value on the way to it.' },
        { t: 11.1, text: 'A wobble of 5% in the width became about 15% in the force.' },
        { t: 13.0, text: 'Why not probability? That needs hundreds of repeated measurements. An engineer with one ruler has one.' },
      ],
      closing: { text: 'Everything is vague to a degree you do not realise till you have tried to make it precise.', by: 'BERTRAND RUSSELL' },
    },
  },
  chain: 'uncertainty',
  era2026: {
    kind: 'range',
    src: 's05-uncertainty',
    prompt: 'Calculate the force due to gravity acting on a raindrop, 1 millimetre in diameter. Give your best estimate and a range showing how uncertain it is.',
    lead: 'Now a model can say how sure it is, in its own words.',
    unit: 'µN',
    axis: { min: 3, max: 8, step: 1 },
    ranges: [
      { label: 'ITS RANGE', low: 4, best: 5.1, high: 7, evidence: 'Plausible range:** roughly 4×10⁻⁶ to 7×10⁻⁶ N' },
      { label: 'IF “1 MM” MEANS ±0.05 MM', low: 4.4, best: 5.1, high: 5.9, evidence: 'F ranges from about 4.4×10⁻⁶ N to 5.9×10⁻⁶ N' },
    ],
    reply: [
      'Diameter: this dominates. Force scales as d³, so a 10% error in diameter gives a ~33% error in force.',
      'If it really means 0.95 to 1.05 mm (rounded to the nearest 0.1 mm), then F ranges from about 4.4×10⁻⁶ N to 5.9×10⁻⁶ N (about ±14%).',
      'Best estimate: F ≈ 5×10⁻⁶ N (5.1 µN)',
      'Plausible range: roughly 4×10⁻⁶ to 7×10⁻⁶ N, driven almost entirely by how precisely "1 mm" is meant.',
    ],
    highlight: ['Force scales as d³', '4.4×10⁻⁶ N to 5.9×10⁻⁶ N', '5.1 µN', '4×10⁻⁶ to 7×10⁻⁶ N'],
  },
  note: { label: 'ECHO', text: 'Same cube law, same range, and no one gave it the rule. Its confidence is learned, so it can be wrong.', at: 9.5 },
};
export default content;
