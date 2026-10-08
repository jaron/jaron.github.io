// The outro: pages of plain type, one after another, each clearing completely before the next. Pure data.
// Three of the author's 1996 predictions come first, each with how it turned out and a small drawing; the film then
// ends on a parting thought, not on credits (credits live in the repository), and stays on that page.
export interface Run {
  text: string;
  emphasis?: 'past' | 'present' | 'coda';
  /** seconds of silence before this run's first word */
  pauseBefore?: number;
  /** start a new paragraph: a blank line, then this run */
  newParagraph?: boolean;
  /** type size for this run (default: the page's) */
  size?: number;
  /** pixels from the previous line's baseline to this run's first baseline (overrides newParagraph) */
  gap?: number;
}
export interface Prediction {
  /** thesis page the quote is on (printed number) */
  page: number;
  verdict: string;
  /** orange when the 1996 idea came true, grey when it was a road not taken */
  verdictKind: 'right' | 'missed';
  art: 'agents' | 'graph' | 'desktop';
}
export interface OutroPage { id: string; runs: Run[]; size: number; prediction?: Prediction; maxW?: number; wordGap?: number; /** 'sentence' or 'clause' (split at punctuation): each piece fades in whole, paced by its length, instead of word by word */ reveal?: 'sentence' | 'clause'; sentenceWord?: number; /** shortest wait before the next piece (default 0.8 s) */ minGap?: number; /** seconds the finished page stays before it clears (or the film ends) */ hold: number }

export const SENTENCE_FADE = 0.7;
const WORD_GAP = 0.19, LEAD_IN = 0.6, FADE = 0.6, GAP_BETWEEN = 0.4, END_FADE = 0;   // the final page stays on screen

/** A short quotation between the last scene and the predictions: a change of context and a breath. The saying is widely
    attributed to Niels Bohr, but its origin is uncertain (earliest known: a Danish book of 1948), so the screen says "attributed". */
export const INTERLUDE = {
  /** the quotation, in the pieces that fade in one after another, with the time each appears */
  clauses: [{ text: 'Prediction is very difficult,', at: 0.4 }, { text: 'especially if it’s about the future.', at: 1.5 }],
  by: 'ATTRIBUTED TO NIELS BOHR', byAt: 2.7,
  fadeIn: 0.8, fadeOutAt: 4.5, fadeOut: 0.6,
  /** seconds before the first prediction page begins */
  duration: 5.2,
};

export const OUTRO = {
  label: 'A PARTING THOUGHT',
  wordGap: WORD_GAP, leadIn: LEAD_IN, fade: FADE, gapBetween: GAP_BETWEEN, endFade: END_FADE,
  /** every quotation on the prediction pages, checked against the thesis text by check:content */
  refs: [
    { page: 163, pdfPage: 170, quote: 'system would consist of several domain experts' },
    { page: 163, pdfPage: 170, quote: 'all controlled by the problem solver' },
    { page: 162, pdfPage: 169, quote: 'already described some potential heuristics based on a knowledge base that learns from experience' },
    { page: 162, pdfPage: 169, quote: 'However, heuristics will not improve the speed of search if insufficient knowledge has been provided to solve the problem' },
    { page: 174, pdfPage: 181, quote: 'Perhaps one day people will run an automatic problem solver instead of reaching for a calculator' },
  ] as { page: number; pdfPage: number; quote: string }[],
  pages: [
    {
      id: 'agents',
      size: 30, maxW: 1060, wordGap: 0.15, reveal: 'sentence', hold: 4.4,
      prediction: { page: 163, verdict: 'I WAS RIGHT, AGENTS WERE THE FUTURE!', verdictKind: 'right', art: 'agents' },
      runs: [
        { text: 'In my thesis, I made several predictions…', size: 30 },
        { text: '“An agent based [solver] system would consist of several domain experts… all controlled by the problem solver.”', emphasis: 'past', size: 40, gap: 78, pauseBefore: 0.5 },
        { text: 'I first met software agents in 1993. Each had its own specialism, took requests in a high-level language, and decided for itself how to react. Giving a general reasoning engine specialised tools to call is what we now call tool-calling.', gap: 136, pauseBefore: 0.9 },
      ],
    },
    {
      id: 'learned-choice',
      size: 30, maxW: 1060, wordGap: 0.15, reveal: 'sentence', hold: 4.9,
      prediction: { page: 162, verdict: 'LEARNING WAS TO PROVE FAR MORE IMPORTANT THAN STATIC KNOWLEDGE', verdictKind: 'right', art: 'graph' },
      runs: [
        { text: 'A Road Not Taken', size: 30 },
        { text: '“[I have] already described some potential heuristics based on a knowledge base that learns from experience. However, heuristics will not improve the speed of search if insufficient knowledge has been provided to solve the problem.”', emphasis: 'past', size: 36, gap: 78, pauseBefore: 0.5 },
        { text: 'Not having time to explore the emerging field of unsupervised learning is the road not taken I regret most. If only I’d found citation and social network analysis then. I’d have represented the knowledge base as a graph.', gap: 136, pauseBefore: 0.9 },
      ],
    },
    {
      id: 'calculator',
      size: 30, maxW: 1060, wordGap: 0.15, reveal: 'sentence', hold: 2.9,
      prediction: { page: 174, verdict: 'RIGHT, BUT NOT HOW I EXPECTED', verdictKind: 'right', art: 'desktop' },
      runs: [
        { text: 'The Calculator That Knows Everything', size: 30 },
        { text: '“Perhaps one day people will run an automatic problem solver instead of reaching for a calculator.”', emphasis: 'past', size: 40, gap: 78, pauseBefore: 0.5 },
        { text: 'It came true. But if you’d told me in 1996 that neural networks would be the technology that changed the world, I’d have been amazed. Back then they were black magic: weird and unintelligible. Look how they’ve grown.', gap: 136, pauseBefore: 0.9 },
      ],
    },
    {
      id: 'connections',
      reveal: 'clause', sentenceWord: 0.1,
      size: 56,
      hold: 1, minGap: 0.42,
      runs: [
        { text: 'We never know where our roads will lead. How the endeavours of one will become the inspirations of another. The story you’ve been watching is how technology is ' },
        { text: 'a tale of connections', emphasis: 'past' },
        { text: ', from past and present, laying the foundations for possibilities yet to come.' },
      ],
    },
    {
      id: 'dad',
      reveal: 'clause', sentenceWord: 0.07,
      size: 52,
      hold: 5, minGap: 0.35,
      runs: [
        { text: 'Sometimes the connections are simple acts of kindness, like the time my father bought me a Sinclair Spectrum home computer in the summer of 1983, and encouraged me to use it. Looking back, his inspired decision was the first step on the road that culminated in this thesis, and what you’re reading now. ' },
        { text: 'Thanks\u00a0Dad.', emphasis: 'present', pauseBefore: 0.6 },
        { text: 'Everything worthwhile is built from love.', emphasis: 'coda', pauseBefore: 2.4, newParagraph: true },
      ],
    },
  ] as OutroPage[],
};

/** when each word of a page appears, in seconds from the page's start (pauses included) */
export function wordTimes(p: OutroPage): number[] {
  const times: number[] = [];
  let t = LEAD_IN;
  if (p.reveal) {
    // every word of a piece shares one time; the next piece follows after a pause that scales with its length.
    // A sentence ends at . ! ? or the end of its run; a clause also ends at , ; : or … (a run may continue a clause).
    const stop = p.reveal === 'clause' ? /[.!?,;:…][”"]?$/ : /[.!?][”"]?$/;
    const toks: { w: string; first: boolean; last: boolean; pause: number }[] = [];
    for (const r of p.runs) {
      const ws = r.text.split(/[ \t\r\n]+/).filter(Boolean);
      ws.forEach((w, k) => toks.push({ w, first: k === 0, last: k === ws.length - 1, pause: k === 0 ? r.pauseBefore ?? 0 : 0 }));
    }
    let n = 0;
    toks.forEach((tk, k) => {
      if (n === 0) t += tk.pause;
      n++;
      const end = k === toks.length - 1 || stop.test(tk.w) || (p.reveal === 'sentence' && tk.last);
      if (!end) return;
      for (let j = 0; j < n; j++) times.push(t);
      t += Math.max(p.minGap ?? 0.8, n * (p.sentenceWord ?? 0.14));
      n = 0;
    });
    return times;
  }
  for (const r of p.runs) {
    t += r.pauseBefore ?? 0;
    for (const _ of r.text.split(/[ \t\r\n]+/).filter(Boolean)) { times.push(t); t += p.wordGap ?? WORD_GAP; }
  }
  return times;
}

/** seconds a word takes to fade in */
export const fadeIn = (p: OutroPage) => (p.reveal === 'sentence' ? SENTENCE_FADE : p.reveal === 'clause' ? 0.7 : 0.24);

/** start and end of each page, seconds into the outro */
export function outroTimes() {
  let t = INTERLUDE.duration;
  const out = OUTRO.pages.map((p, i) => {
    const wt = wordTimes(p);
    const typed = wt[wt.length - 1]! + (p.reveal ? fadeIn(p) : p.wordGap ?? WORD_GAP) + 0.3;
    const start = t;
    const clearAt = start + typed + p.hold;                 // the page is finished, has held, and now clears
    const last = i === OUTRO.pages.length - 1;
    t = last ? clearAt + END_FADE : clearAt + FADE + GAP_BETWEEN;
    return { start, typedEnd: start + typed, clearAt, end: t, last };
  });
  return out;
}
export const OUTRO_DURATION = outroTimes()[OUTRO.pages.length - 1]!.end;

/** The outro's music (made with Gemini Music to Jaron's brief; see the README). It plays only when the viewer has sound on. */
export const MUSIC = {
  file: 'audio/outro-music.mp3',
  /** seconds after the first parting-thought page begins: the drone has gone, and there is a moment of silence first */
  delay: 1.5,
  fadeIn: 1.2,
  /** the file is about -28 LUFS as supplied; this brings it to about -33, a quiet accompaniment under the film's own sounds */
  gain: 0.58,
};
/** When the music starts, in seconds into the outro. */
export const musicStart = () => outroTimes()[3]!.start + MUSIC.delay;
