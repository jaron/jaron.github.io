import type { SceneContent } from '../../core/types';

// Scene 3: how the program coped with paths that go nowhere and paths that go in circles (backtracking), and how
// models do the same move now. Quotes are verbatim from the thesis (check-content verifies them).
const content: SceneContent = {
  id: 's03-dead-ends',
  bridge: {
    text: 'In my system, scientific formulae were the rules for problem solving. But the route to the answer may hit dead ends, so it was essential the solver could detect potential failures and backtrack from them.',
    emphasis: 'detect potential failures and backtrack from them.',
    refs: [{ page: 82, pdfPage: 89, quote: 'retraces its steps to its most recent choice' }],
  },
  figure: '§5.3 · EXAMPLE 4 (FIG 5.4, REDRAWN)',
  number: 3,
  total: 7,
  title: 'Backtracking from failure',
  beats: { bridge: 8, era1996: 15, era2026: 13.7 },
  era1996: {
    kind: 'backtrack',
    refs: [
      { page: 86, pdfPage: 93, quote: 'If a quantity reappears in a search tree path, the search must abort, otherwise it would enter an infinite cycle.' },
      { page: 82, pdfPage: 89, quote: 'retraces its steps to its most recent choice' },
      { page: 105, pdfPage: 112, quote: 'the user will not be interested in the search paths that failed' },
    ],
    data: {
      label: 'EXAMPLE 4 · THE MASS OF THE HELIUM',
      source: 'SIMPLIFIED REDRAWING OF FIG 5.4 · THESIS P.86–87',
      // Centres on the 1920 x 1080 canvas. kind: goal | formula | quantity | known | fail. The tree follows Fig 5.4.
      nodes: [
        { id: 'root', label: 'mass  m = ?', tag: 'THE GOAL', kind: 'goal', x: 235, y: 560 },
        // the branch that goes in a circle
        { id: 'fmg', parent: 'root', label: 'F = m g', tag: 'FORMULA', kind: 'formula', x: 575, y: 360 },
        { id: 'force', parent: 'fmg', label: 'force  F', tag: 'NOT KNOWN', kind: 'quantity', x: 915, y: 360 },
        { id: 'fma', parent: 'force', label: 'F = m a', tag: 'FORMULA', kind: 'formula', x: 1255, y: 360 },
        { id: 'mass2', parent: 'fma', label: 'mass  m', tag: 'A LOOP', kind: 'fail', x: 1595, y: 360 },
        // the branch that works, after a dead end
        { id: 'mMn', parent: 'root', label: 'm = M n', tag: 'FORMULA', kind: 'formula', x: 575, y: 640 },
        { id: 'molar', parent: 'mMn', label: 'molar mass  M', tag: 'KNOWN', kind: 'known', x: 915, y: 560 },
        { id: 'moles', parent: 'mMn', label: 'moles  n', tag: 'NOT KNOWN', kind: 'quantity', x: 915, y: 740 },
        { id: 'knN', parent: 'moles', label: 'n from N', tag: 'FORMULA', kind: 'formula', x: 1255, y: 670 },
        { id: 'count', parent: 'knN', label: 'molecules  N', tag: 'DEAD END', kind: 'fail', x: 1595, y: 670 },
        { id: 'gas', parent: 'moles', label: 'P = n R T / V', tag: 'FORMULA', kind: 'formula', x: 1255, y: 810 },
        { id: 'given', parent: 'gas', label: 'P  T  R  V', tag: 'ALL KNOWN', kind: 'known', x: 1595, y: 810 },
      ],
      // when each node is reached (seconds into the beat) and what it becomes
      marks: [
        { node: 'root', t: 0.6, state: 'open' },
        { node: 'fmg', t: 1.6, state: 'open' },
        { node: 'force', t: 2.8, state: 'open' },
        { node: 'fma', t: 3.8, state: 'open' },
        { node: 'mass2', t: 4.8, state: 'fail' },
        { node: 'mMn', t: 7.2, state: 'open' },
        { node: 'molar', t: 8.0, state: 'known' },
        { node: 'moles', t: 8.8, state: 'open' },
        { node: 'knN', t: 9.6, state: 'open' },
        { node: 'count', t: 10.4, state: 'fail' },
        { node: 'gas', t: 12.0, state: 'open' },
        { node: 'given', t: 12.8, state: 'known' },
      ],
      // the search cursor: the order in which it visits nodes (backing up is just visiting a parent again)
      walk: [
        { node: 'root', t: 0.6 }, { node: 'fmg', t: 1.6 }, { node: 'force', t: 2.8 }, { node: 'fma', t: 3.8 }, { node: 'mass2', t: 4.8 },
        { node: 'fma', t: 6.0 }, { node: 'force', t: 6.3 }, { node: 'fmg', t: 6.6 }, { node: 'root', t: 6.9 }, { node: 'mMn', t: 7.2 },
        { node: 'molar', t: 8.0 }, { node: 'mMn', t: 8.4 }, { node: 'moles', t: 8.8 }, { node: 'knN', t: 9.6 }, { node: 'count', t: 10.4 },
        { node: 'knN', t: 11.2 }, { node: 'moles', t: 11.6 }, { node: 'gas', t: 12.0 }, { node: 'given', t: 12.8 },
      ],
      loop: { from: 'mass2', to: 'root', t: 5.1 },
      // the winning path, lit once the search succeeds
      path: ['root', 'mMn', 'moles', 'gas', 'given'],
      success: 13.4,
      backFrom: [5.8, 11.0],
      captions: [
        { t: 1.0, text: 'It tries a formula that contains the mass: force = mass × gravity.' },
        { t: 2.4, text: 'But the force isn’t known either, so it looks for a formula for force.' },
        { t: 3.5, text: 'Force = mass × acceleration. That needs the mass.' },
        { t: 4.6, text: 'The mass is what it set out to find: the path has gone in a circle, so it stops.' },
        { t: 5.8, text: 'It backs up, one step at a time, to its last choice.' },
        { t: 7.1, text: 'It tries the next formula: mass = molar mass × moles.' },
        { t: 8.0, text: 'The molar mass of helium is a known property.' },
        { t: 8.9, text: 'Moles has two formulae. The first needs a count of molecules.' },
        { t: 10.3, text: 'Nothing in the knowledge base gives that count: a dead end. It backs up again.' },
        { t: 11.9, text: 'The second formula, the gas law, needs only quantities it can find.' },
        { t: 13.4, text: 'Solved. Only the path that worked goes into the final report.' },
      ],
    },
  },
  chain: 'backtracking',
  era2026: {
    kind: 'correction',
    src: 's03-dead-ends',
    lead: 'Now a model can do the same: try something, notice it’s wrong, and go back.',
    lines: [
      { role: 'claim', text: 'the critical load is about 1.5 × 10⁶ N (≈1.5 MN).' },
      { role: 'working', text: 'P_cr ≈ 5.67 × 10⁶ / 2.25 ≈ 2.5 × 10⁶ N' },
      { role: 'catch', text: 'I made an arithmetic slip above, so here is the corrected calculation:' },
      { role: 'answer', text: 'Answer: P_cr ≈ 2.5 × 10⁶ N (about 2.5 MN)' },
    ],
  },
  note: { label: 'ECHO', text: 'Same move: try, notice a dead end, go back. Then by rules I wrote; now learned from practice.', at: 8.2 },
};
export default content;
