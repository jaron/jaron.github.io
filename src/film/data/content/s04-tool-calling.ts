import type { SceneContent } from '../../core/types';

// Scene 4: reasoning and calculating are different jobs. The Solver decided what to find and handed each calculation
// to a specialist (thesis ch. 5); a model now does the same by calling a tool. Quotes are verbatim from the thesis.
const content: SceneContent = {
  id: 's04-tool-calling',
  bridge: {
    text: 'Reasoning and calculating are different jobs. My solver decided what to find. Specialist programs did the sums, and it carried on with their answers.',
    emphasis: 'Specialist programs did the sums, and it carried on with their answers.',
    refs: [{ page: 91, pdfPage: 98, quote: 'were delegated to other objects' }],
  },
  figure: '§5.4–5.7 · THE SPECIALISTS',
  number: 4,
  total: 7,
  title: 'Tool calling',
  beats: { bridge: 5.2, era1996: 15.6, era2026: 15.4 },
  era1996Speed: 1.15,   // the 1996 animation is authored in its own seconds; this plays it 1.15x faster
  era1996: {
    kind: 'handoff',
    refs: [
      { page: 93, pdfPage: 100, quote: "Direct interpretation is employed when the unknown quantity is by itself on one side of the equation's equals sign" },
      { page: 93, pdfPage: 100, quote: 'consisting of thousands of direct interpretation calls' },
      { page: 95, pdfPage: 102, quote: 'In keeping with the policy of task delegation' },
      { page: 104, pdfPage: 111, quote: 'All integral operations have been delegated to the' },
    ],
    data: {
      label: 'THE SOLVER AND ITS SPECIALISTS',
      source: 'THESIS P.91–104 · THE EQUATIONS SHOWN ARE ILLUSTRATIONS',
      specialists: [
        { id: 'interp', title: 'THE INTERPRETER', sub: 'works out a formula' },
        { id: 'halving', title: 'NARROWING IN', sub: 'tries values, halving the range' },
        { id: 'pair', title: 'LINKED EQUATIONS', sub: 'solves unknowns that depend on each other' },
        { id: 'integral', title: 'INTEGRALS', sub: 'another specialist' },
      ],
      // the equation the "narrowing in" specialist works on, as f(x) = 0 over [lo, hi]
      halving: { equation: 'x = 2 cos x', lo: 0, hi: 2, trials: 7 },
      handoffs: [
        { id: 'sum', node: 'A SUM', packet: ['x = 3 + 4 × 2'], work: ['4 × 2 = 8', '3 + 8 = 11'], answer: 'x = 11', need: 1.4, send: 1.8, working: 2.7, back: 4.3 },
        { id: 'halving', node: 'A TRICKY EQUATION', packet: ['x = 2 cos x'], work: [], answer: 'x ≈ 1.0299', need: 4.9, send: 5.3, working: 6.2, back: 10.4 },
        { id: 'pair', node: 'LINKED UNKNOWNS', packet: ['change = final − original', 'stretch = change ÷ original'], work: [], answer: 'both found', need: 11.6, send: 12.2, working: 13.0, back: 15.0 },
      ],
      loop: { t: 11.2 },
      integral: 16.1,
      final: 17.0,
      captions: [
        { t: 1.0, text: 'The Solver decides what to find. When a number needs working out, it hands the formula to a specialist.' },
        { t: 4.8, text: 'Some formulae can’t be rearranged. A second specialist tries values and narrows in, halving the range each time.' },
        { t: 9.7, text: 'It can take thousands of tries, which is why the Solver doesn’t do this itself.' },
        { t: 11.1, text: 'Unknowns that depend on each other send the search in circles. The Solver hands over both formulae.' },
        { t: 15.0, text: 'Every value comes back at once, and the search carries on.' },
        { t: 16.1, text: 'Integrals went to yet another specialist. The Solver decided; the specialists calculated.' },
      ],
    },
  },
  chain: 'toolcalling',
  era2026: {
    kind: 'toolcall',
    src: 's04-tool-calling',
    prompt: 'Solve x = 2 cos(x) for x in radians, to six decimal places.',
    lead: 'Now a model decides for itself when to ask a tool.',
    toolLabel: 'A PYTHON INTERPRETER',
    call: ['from math import cos', 'x=1.0', 'for _ in range(100):', "    x=x-(x-2*cos(x))/(1+2*__import__('math').sin(x))", "print('%.10f'%x)"],
    result: ['1.0298665293'],
    reply: ["x ≈ 1.029867 radians (more precisely, 1.0298665293). I found it with Newton's method on f(x) = x − 2cos(x)."],
    highlight: ['1.029867'],
  },
  note: { label: 'ECHO', text: 'Same split. I wired in each specialist; now the model chooses when to call a tool.', at: 9.9 },
};
export default content;
