// Cold open: the author's challenge, a scientific problem drawn as a vector raindrop, the machine's chain of
// questions (full sentences, so the viewer always knows why the next step is needed), the payoff, a title card.
// Pure data. Timing in film seconds. Quotes are verbatim from the thesis (checked by check-content).
import type { ThesisRef } from '../core/types';

export interface Beat {
  /** time the question slams in */
  at: number;
  q: string;
  a: string;
  /** a smaller mono line under the answer */
  sub?: string;
  /** node the camera moves to */
  focus: string;
  /** nodes that appear with the answer */
  reveal?: string[];
  /** node that locks to KNOWN with the answer */
  lock?: string;
}

const BEAT = 2.5;
const FIRST = 12.2;
const at = (i: number) => +(FIRST + i * BEAT).toFixed(2);

export const COLD_OPEN = {
  duration: 41,
  challenge: {
    date: 'SEPTEMBER 1993.',
    text: 'My PhD supervisor, Professor Jack Smith, set me a challenge: build intelligent software that was better at solving scientific problems than I was.',
    emphasis: 'better at solving scientific problems than I was.',
    wordsFrom: 2.9, wordGap: 0.17,
    /** the quote clears away here, handing over to the drawing */
    exitAt: 7.9, end: 8.5,
  },
  /** the bridge: a scientific problem, drawn */
  problem: {
    label: 'A SCIENTIFIC PROBLEM',
    drawFrom: 8.6,      // raindrop outline
    barFrom: 9.8,       // diameter bar
    arrowFrom: 10.5,    // downward arrow and the question mark
    prompt: { text: 'Calculate the force due to gravity acting on a raindrop, 1 millimetre in diameter.', from: 9.0, to: 11.7 },
  },
  beatLen: BEAT,
  beats: [
    { at: at(0), q: 'What is force?',                       a: 'F = m g',                              sub: 'Mass times gravity.',            focus: 'F',   reveal: ['f1', 'm', 'g'] },
    { at: at(1), q: 'Gravity? We know that.',               a: 'g = 9.81',                             sub: 'KNOWN · m/s²',                   focus: 'g',   lock: 'g' },
    { at: at(2), q: 'But what is its mass?',                a: 'm = ρ V',                              sub: 'Density times volume.',          focus: 'm',   reveal: ['f2', 'rho', 'V'] },
    { at: at(3), q: 'Density of what?',                     a: 'Raindrops are water.',                 sub: 'KNOWN · 1000 kg/m³',             focus: 'rho', lock: 'rho' },
    { at: at(4), q: 'But what is its volume?',              a: 'It’s a sphere.',                       sub: 'V = 4/3 π r³',                   focus: 'V',   reveal: ['f3', 'r'] },
    { at: at(5), q: 'But that requires knowing its radius.', a: 'We know its diameter. Just halve it.', sub: 'r = d / 2',                      focus: 'r',   reveal: ['f4', 'd'] },
    { at: at(6), q: 'And the diameter?',                    a: '1 mm. You told me.',                   sub: 'KNOWN · given',                  focus: 'd',   lock: 'd' },
  ] as Beat[],
  /** working back up the tree: each value is filled into its node, with the plain-language rule that produced it */
  ledger: [
    { at: 29.9, node: 'r', say: 'radius = half the diameter' },
    { at: 30.5, node: 'V', say: 'volume = 4/3 π r³' },
    { at: 31.1, node: 'm', say: 'mass = density × volume' },
    { at: 31.7, node: 'F', say: 'force = mass × gravity' },
  ],
  workBack: { q: 'Now work back up.', at: 29.75 },
  answer: { at: 32.3, text: 'Every value traced back to its source.' },
  reveal: { from: 33.9, to: 36.9, caption: 'Each question was a node in a search tree.', captionAt: 34.9 },
  card: {
    from: 36.9,
    lines: ['How I got', 'machines', 'to think.'],
    tag: '(in 1996)',
    sub: 'A PhD thesis in artificial intelligence, thirty years on',
  },
  refs: [
    { page: 2, pdfPage: 9, quote: 'Calculate the force due to gravity acting on a raindrop, 1 millimetre in diameter.' },
    { page: 4, pdfPage: 11, quote: 'When the author began development of the QPS system in 1993' },
    { page: null, pdfPage: 3, quote: 'Professor Jack Smith' },
  ] as ThesisRef[],
};
