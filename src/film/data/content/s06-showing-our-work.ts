import type { SceneContent } from '../../core/types';

// Scene 6: the solver wrote out its working, so anyone could check it. The copper bar's report (Fig 5.8) used a formula
// with pi where Euler's has pi squared, so the solver's answer was wrong, and the working is what lets us see it.
// Quotes are verbatim from the thesis (check-content verifies them). The failure report is an illustration.
const content: SceneContent = {
  id: 's06-showing-our-work',
  bridge: {
    text: 'An answer nobody can check is not trusted. So my solver wrote out its working: every formula, and where every value came from.',
    emphasis: 'wrote out its working: every formula, and where every value came from.',
    refs: [{ page: 105, pdfPage: 112, quote: 'The user will expect to see how the answer was derived' }],
  },
  figure: '§5.8 · THE EXPLANATION WINDOW',
  number: 6,
  total: 7,
  title: 'Showing our work',
  beats: { bridge: 5.2, era1996: 23, era2026: 21.8 },
  era1996Speed: 1.2,   // the 1996 animation is authored in its own seconds; this plays it 1.2x faster
  era1996: {
    kind: 'explain',
    refs: [
      { page: 84, pdfPage: 91, quote: 'A cylindrical bar of copper is 5 centimetres in radius' },
      { page: 106, pdfPage: 113, quote: 'been given as problem parameters, or have resulted from a calculation earlier in the report' },
      { page: 106, pdfPage: 113, quote: 'it was felt that the system should be able to offer a reasonable explanation of why it was not possible to solve a problem' },
      { page: 107, pdfPage: 114, quote: 'to calculate the resistivity of an object the problem solver will need to know its temperature' },
    ],
    data: {
      label: 'THE SOLVER EXPLAINS ITS ANSWER',
      problem: { material: 'copper', geometry: 'cylinder' },
      // the copper bar of scene 1: r = 5 cm, l = 1.5 m; E for copper from the knowledge base
      inputs: { r: 0.05, l: 1.5, E: 1.2e11 },
      legend: [
        { key: 'given', label: 'GIVEN' },
        { key: 'kb', label: 'FROM THE KNOWLEDGE BASE' },
        { key: 'above', label: 'WORKED OUT ABOVE' },
      ],
      times: { problem: 0.9, solution: 2.4, explanation: 4.6, step1: 5.4, step1Value: 6.5, step2: 7.7, kb: 8.8, above: 9.6, given: 10.4, check: 12.0, pulse: 12.8, morph: 14.6, recompute: 15.8, fadeReport: 20.3, failure: 21.0 },
      callout: {
        head: 'THIRTY YEARS LATER',
        lines: ['A reader can check each step by hand.', 'Euler’s formula has π squared, so one step was wrong.', 'The answer changes by a factor of π.'],
      },
      failure: {
        title: 'FAILURE REPORT',
        problem: 'What is the resistivity of this copper wire?',
        result: 'Not solved',
        why: 'Not enough known quantities',
        supply: 'temperature',
        note: 'AN ILLUSTRATION OF THE FAILURE REPORT DESCRIBED ON THESIS P.106–107',
      },
      captions: [
        { t: 2.4, text: 'The solver gave its answer. An answer on its own can’t be checked.' },
        { t: 4.6, text: 'Under it, the working: each formula in the order it was used, and where every value came from.' },
        { t: 8.4, text: 'Each value says whether it was given, looked up in the knowledge base, or worked out earlier.' },
        { t: 12.0, text: 'Thirty years later, the working lets me check it.' },
        { t: 14.4, text: 'Euler’s buckling formula has π squared. The formula in the knowledge base was missing a square.' },
        { t: 15.8, text: 'With the same values, the answer is 2.6 million newtons, not 0.82 million.' },
        { t: 18.0, text: 'An answer can be wrong. Without the working, how would we ever know?' },
        { t: 21.2, text: 'When it failed, it said why, and what to supply next.' },
      ],
    },
  },
  chain: 'explaining',
  era2026: {
    kind: 'working',
    src: 's06-showing-our-work',
    prompt: 'A cylindrical bar of copper is 5 centimetres in radius, and 1.5 metres in length. What is the bar’s critical load in Newtons ? Show your working, and say where each value comes from.',
    lead: 'Now a model shows its working too, and says what it assumed.',
    formula: { evidence: 'P_{cr} = \\frac{\\pi^2 E I}{(K L)^2}', text: 'P_cr = π² E I / (K L)²' },
    rows: [
      { quantity: 'Radius, r', value: '0.05 m', source: 'Given (5 cm)', tag: 'given' },
      { quantity: 'Length, L', value: '1.5 m', source: 'Given', tag: 'given' },
      { quantity: "Young's modulus, E", value: '≈ 117 GPa', source: 'Standard handbook value for copper', tag: 'looked up' },
      { quantity: 'End condition factor, K', value: '1.0', source: "Assumption: both ends pinned, since the question doesn't specify.", tag: 'assumed' },
      { quantity: 'Second moment of area, I', value: '4.909×10⁻⁶ m⁴', source: 'Calculated below for a solid circular section', tag: 'worked out' },
    ],
    answer: 'P_cr ≈ 2.5 MN (about 2,520,000 N), assuming pinned–pinned ends.',
    caveat: {
      intro: 'You often see models correct themselves. Wait…',
      quote: ['So in practice the bar would yield in compression before it buckles.', '…the real failure load is much lower…'],
      figure: '≈ 0.55 MN',
      figureTag: 'ITS OWN ESTIMATE OF THE REAL LOAD, FOR ANNEALED COPPER',
    },
  },
  note: { label: 'DIFFERS', text: 'My report recorded what the solver did. A model’s explanation is more text, and may not be what happened inside it.', at: 16.0 },
};
export default content;
