import type { SceneContent } from '../../core/types';

// Scene 1. Quotes are verbatim from the thesis (check-content verifies them once the verified text exists).
const content: SceneContent = {
  id: 's01-understanding',
  bridge: {
    text: 'In 1996, it was extremely difficult for machines to understand natural language. We interacted through user interfaces to compensate.',
    emphasis: 'We interacted through user interfaces to compensate.',
    refs: [{ page: 84, pdfPage: 91, quote: 'In the absence of a natural language interface' }],
  },
  figure: '§5.3 · EXAMPLE 3',
  number: 1,
  total: 7,
  title: 'Understanding the question',
  era1996: {
    kind: 'form',
    refs: [
      { page: 84, pdfPage: 91, quote: 'A cylindrical bar of copper is 5 centimetres in radius' },
      { page: 84, pdfPage: 91, quote: 'the problem is phrased in terms of its known quantities, the goal to be computed, and the material and geometry involved' },
    ],
    data: {
      sentence: 'A cylindrical bar of copper is 5 centimetres in radius, and 1.5 metres in length. What is the bar’s critical load in Newtons ?',
      caption: 'Entity extraction, by hand',
      fields: [
        { key: 'material', value: 'copper', from: ['copper'] },
        { key: 'geometry', value: 'cylinder', from: ['cylindrical'] },
        { key: 'known quantities', value: 'r = 5 cm   l = 1.5 m', from: ['5 centimetres in radius', '1.5 metres'] },
        { key: 'goal quantity', value: 'P_e = ? N', from: ['critical load'] },
      ],
    },
  },
  beats: { bridge: 4.5, era2026: 12 },
  chain: 'understanding',
  era2026: {
    kind: 'language',
    src: 's01-understanding',
    lead: 'Now we’ve been speaking to machines naturally for years.',
    rows: [
      ['A', 'cylindrical', 'bar', 'of', 'copper', 'is', '5', 'centimetres', 'in', 'radius', ','],
      ['and', '1.5', 'metres', 'in', 'length', '.'],
      ['What', 'is', 'the', 'bar', '’s', 'critical', 'load', 'in', 'Newtons', '?'],
    ],
    // flattened indexes: row 1 = 0-10, row 2 = 11-16, row 3 = 17-26
    links: [
      { a: 1, b: 2, w: 0.55 }, { a: 4, b: 2, w: 0.9 }, { a: 6, b: 7, w: 0.8 }, { a: 7, b: 9, w: 0.95 },
      { a: 12, b: 13, w: 0.8 }, { a: 13, b: 15, w: 0.95 },
      { a: 20, b: 22, w: 0.7 }, { a: 21, b: 22, w: 0.95 }, { a: 22, b: 24, w: 0.85 },
    ],
    reply: ['Formula: P_cr = π²EI / L²', '· Radius: r = 0.05 m', '· Length: L = 1.5 m'],
    highlight: ['Radius: r = 0.05 m', 'Length: L = 1.5 m'],
  },
  note: { label: 'ECHO', text: 'The fixed form my program required is gone: the model reads the sentence itself.' },
};
export default content;
