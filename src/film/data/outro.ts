// The outro: pages of plain type, one after another, each clearing completely before the next. Pure data.
// Planned: a page of the author's 1996 predictions and how they turned out will go before these (under discussion);
// the film then ends on a parting thought, not on credits (credits live in the repository), and stays on that page.
export interface Run {
  text: string;
  emphasis?: 'past' | 'present' | 'coda';
  /** seconds of silence before this run's first word */
  pauseBefore?: number;
  /** start a new paragraph: a blank line, then this run */
  newParagraph?: boolean;
}
export interface OutroPage { id: string; runs: Run[]; size: number; /** seconds the finished page stays before it clears (or the film ends) */ hold: number }

const WORD_GAP = 0.19, LEAD_IN = 0.6, FADE = 0.6, GAP_BETWEEN = 0.4, END_FADE = 0;   // the final page stays on screen

export const OUTRO = {
  label: 'A PARTING THOUGHT',
  wordGap: WORD_GAP, leadIn: LEAD_IN, fade: FADE, gapBetween: GAP_BETWEEN, endFade: END_FADE,
  pages: [
    {
      id: 'connections',
      size: 56,
      hold: 3.4,
      runs: [
        { text: 'We never know where our roads will lead. How the endeavours of one will become the inspirations of another. The story you’ve been watching is how technology is ' },
        { text: 'a tale of connections', emphasis: 'past' },
        { text: ', from past and present, laying the foundations for possibilities yet to come.' },
      ],
    },
    {
      id: 'dad',
      size: 52,
      hold: 5,
      runs: [
        { text: 'Sometimes the connections are simple acts of kindness, like the time my father bought me a Sinclair Spectrum home computer in the summer of 1983, and encouraged me to use it. Looking back, his inspired decision was the first step on the road that culminated in this thesis, and what you’re reading now. ' },
        { text: 'Thanks\u00a0Dad.', emphasis: 'present' },
        { text: 'Everything worthwhile is built from love.', emphasis: 'coda', pauseBefore: 2.4, newParagraph: true },
      ],
    },
  ] as OutroPage[],
};

/** when each word of a page appears, in seconds from the page's start (pauses included) */
export function wordTimes(p: OutroPage): number[] {
  const times: number[] = [];
  let t = LEAD_IN;
  for (const r of p.runs) {
    t += r.pauseBefore ?? 0;
    for (const _ of r.text.split(/[ \t\r\n]+/).filter(Boolean)) { times.push(t); t += WORD_GAP; }
  }
  return times;
}

/** start and end of each page, seconds into the outro */
export function outroTimes() {
  let t = 0;
  const out = OUTRO.pages.map((p, i) => {
    const wt = wordTimes(p);
    const typed = wt[wt.length - 1]! + WORD_GAP + 0.3;
    const start = t;
    const clearAt = start + typed + p.hold;                 // the page is finished, has held, and now clears
    const last = i === OUTRO.pages.length - 1;
    t = last ? clearAt + END_FADE : clearAt + FADE + GAP_BETWEEN;
    return { start, typedEnd: start + typed, clearAt, end: t, last };
  });
  return out;
}
export const OUTRO_DURATION = outroTimes()[OUTRO.pages.length - 1]!.end;
