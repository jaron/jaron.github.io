import type { SceneContent } from '../../core/types';

// Scene 2: how the solver found the few formulae that mattered, why that is hard (the P versus NP shape), and the
// heuristic that made it workable. Quotes are verbatim from the thesis (check-content verifies them).
const content: SceneContent = {
  id: 's02-finding-knowledge',
  bridge: {
    text: 'My solver knew 122 formulae. Checking whether one fits is easy. Knowing which to try is the hard part.',
    emphasis: 'Knowing which to try is the hard part.',
    refs: [{ page: 154, pdfPage: 161, quote: '122 formulae' }],
  },
  figure: '§5.2 · EXAMPLE 4',
  number: 2,
  total: 7,
  title: 'Finding the right knowledge',
  beats: { bridge: 3.6, era1996: 15, era2026: 16.5 },
  era1996: {
    kind: 'formulae',
    refs: [
      { page: 85, pdfPage: 92, quote: 'A cylinder 2 centimetres in diameter, and 10 centimetres in length, is filled with helium gas' },
      { page: 84, pdfPage: 91, quote: 'Find all formulæ that contain the goal quantity' },
      { page: 82, pdfPage: 89, quote: 'select the formula with the least number of unknown quantities' },
      { page: 92, pdfPage: 99, quote: 'some searches for common quantities like mass can be around 20 levels deep' },
    ],
    data: {
      sentence: 'A cylinder 2 centimetres in diameter, and 10 centimetres in length, is filled with helium gas. Measurements of the gas show it is at a temperature of 293 K, and at a pressure of 2 × 10⁵ Pa. What is the mass of the gas in grams ?',
      caption: 'Exact match, by symbol',
      goal: 'm',
      field: 122,
      // the three formulae the thesis's own search tree (Fig 5.4) lists for the mass, then a few others it shows
      candidates: [
        { formula: 'F = m g', unknowns: ['F'] },
        { formula: 'F = m a', unknowns: ['F', 'a'] },
        { formula: 'm = M n', unknowns: ['n'] },
      ],
      others: ['P = n R T / V', 'V = π r² l', 'r = d / 2', 'I = π r⁴ / 4', 'm = ρ V', 'k = n R / N', 'E = V / d', 'P = π² E I / l²'],
      branching: 3,
      depth: 20,
    },
  },
  chain: 'finding',
  era2026: {
    kind: 'meaning',
    src: 's02-finding-knowledge',
    lead: 'Now we don’t tell it where to look. We just ask.',
    clusters: [
      { name: 'GASES', x: 0.22, y: 0.55, r: 0.085, n: 170 },
      { name: 'SHAPES', x: 0.45, y: 0.3, r: 0.08, n: 150 },
      { name: 'FORCES', x: 0.66, y: 0.62, r: 0.09, n: 170 },
      { name: 'MATERIALS', x: 0.84, y: 0.3, r: 0.075, n: 140 },
      { name: 'CIRCUITS', x: 0.5, y: 0.8, r: 0.07, n: 130 },
      { name: 'HEAT', x: 0.1, y: 0.22, r: 0.065, n: 110 },
    ],
    question: { label: 'the helium question', near: 'GASES' },
    found: ['IDEAL GAS LAW', 'MOLAR MASS OF HELIUM', 'VOLUME OF A CYLINDER'],
    reply: ['V = πr²L = π(0.01)²(0.10) = 3.14 × 10⁻⁵ m³', 'n = PV/(RT) = (2 × 10⁵ × 3.14 × 10⁻⁵) / (8.314 × 293)', 'Helium molar mass = 4.00 g/mol'],
    highlight: ['V = πr²L', 'Helium molar mass'],
  },
  note: { label: 'DIFFERS', text: 'Nothing here solves P versus NP. A model finds by learned intuition, not by guarantee: usually right, never certain.', at: 11.0 },
};
export default content;
