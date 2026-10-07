import type { SceneContent } from '../../core/types';

// Scene 7: the bottleneck was the knowledge itself. In 1996 every entry was typed in and checked by hand (slow, and
// error-prone: scene 6); a model learns from text collected by software, where one wrong entry is lost in the crowd
// (Sutton's "bitter lesson", 2019, explained in a short chart). Thesis quotes are verbatim; the training-mix figures are GPT-3's, from its paper.
const content: SceneContent = {
  id: 's07-where-knowledge-comes-from',
  bridge: {
    text: 'Everything my solver could do depended on knowledge that someone had to type in. That someone was me.',
    emphasis: 'That someone was me.',
    refs: [{ page: 154, pdfPage: 161, quote: 'the knowledge base must first be populated with the necessary information' }],
  },
  figure: '§7.5 · THE KNOWLEDGE BASE',
  number: 7,
  total: 7,
  title: 'Where knowledge comes from',
  beats: { bridge: 7, era1996: 34.5, chain: 12, era2026: 18.5 },
  era1996: {
    kind: 'knowledge',
    refs: [
      { page: 154, pdfPage: 161, quote: '142 quantities, 122 formulae, 110 property values and 21 geometrical models' },
      { page: 172, pdfPage: 179, quote: 'a very large knowledge base is an continuing objective' },
      { page: 174, pdfPage: 181, quote: 'will increase with the size of its knowledge base' },
    ],
    data: {
      label: 'THE KNOWLEDGE BASE, AND HOW IT GOT THERE',
      source: 'THESIS P.154 · THE STEPS ARE AN OUTLINE OF THE WORK, NOT A QUOTATION',
      categories: [
        { id: 'quantities', label: 'QUANTITIES', count: 142, color: 'signal' },
        { id: 'formulae', label: 'FORMULAE', count: 122, color: 'bone' },
        { id: 'properties', label: 'PROPERTY VALUES', count: 110, color: 'ember' },
        { id: 'geometries', label: 'GEOMETRICAL MODELS', count: 21, color: 'ash' },
      ],
      counterAt: 0.5,
      steps: [
        { head: 'Fetch textbooks', gloss: 'Physics, engineering and chemistry books.', at: 2.0 },
        { head: 'Find formulae', gloss: 'Pick out each law as an equation.', at: 3.6 },
        { head: 'Find constants', gloss: 'And the values: gravity, density, stiffness.', at: 5.2 },
        { head: 'Type them in', gloss: 'Every entry, by hand.', at: 6.8 },
      ],
      entry: { text: 'Easy to make mistakes!', at: 8.3, flagAt: 10.0 },
      totalAt: 7.6,
      fadeOut: 10.8,
      lesson: {
        at: 11.6,
        title: 'THE BITTER LESSON',
        by: 'RICH SUTTON · MARCH 2019',
        schematic: 'SCHEMATIC: THE SHAPE OF THE ARGUMENT, NOT MEASURED DATA',
        axisX: 'TIME',
        axisY: 'AVAILABILITY OF MACHINE-READABLE DATA',
        hand: { label: 'WRITTEN BY HAND (SYMBOLIC)', from: 15.6, to: 18.2 },
        learned: { label: 'LEARNED FROM DATA (NEURAL)', from: 18.6, to: 22.0 },
        cross: { at: 22.2, label: 'THE CROSSOVER' },
        crossovers: { at: 24.6, text: 'Crossovers happen in every field eventually' },
        examples: [
          { at: 25.0, head: 'CHESS · 1997', line: 'Deep Blue beat the world champion with massive search, not chess knowledge.' },
          { at: 26.2, head: 'IMAGES · 2012', line: 'AlexNet learned from 1.2 million labelled photos and beat hand-designed vision systems.' },
          { at: 27.4, head: 'GO · 2016', line: 'AlphaGo learned from data and self-play, and beat one of the world’s best players.' },
        ],
      },
      captions: [
        { t: 1.0, text: 'Everything my program knew had to be typed in by hand. It was a laborious process.' },
        { t: 7.6, text: 'Every entry typed in, and checked, by hand.' },
        { t: 11.6, text: 'In 2019 the AI researcher Rich Sutton described a pattern observed over seventy years of AI research.\nHe called it The Bitter Lesson.' },
        { t: 15.6, text: 'Builders of symbolic AI systems populated them with all the data they could find. It works well enough, initially.' },
        { t: 18.6, text: 'But data and computing power keep growing. Methods that simply use more of them keep improving.' },
        { t: 22.2, text: 'In the end, the general method wins, by a large margin.' },
        { t: 25.0, text: 'It happened in chess, in image recognition, and then in Go.' },
        { t: 29.0, text: 'It is bitter because the approach that feels smartest, encoding our own human expertise, is the one that loses.\nWhen machines became able to read stored knowledge for themselves, everything changed.' },
      ],
    },
  },
  chain: 'ingestion',
  era2026: {
    kind: 'sources',
    src: 's07-where-knowledge-comes-from',
    prompt: 'Calculate the force due to gravity acting on a raindrop, 1 millimetre in diameter.',
    lead: 'Every AI model is pre-trained, that means they’ve already learned almost everything we know.',
    reply: [
      'V = (4/3)πr³ = (4/3)π(5 × 10⁻⁴ m)³ ≈ 5.24 × 10⁻¹⁰ m³',
      'Mass (water density ρ = 1000 kg/m³):',
      'm = ρV ≈ 1000 × 5.24 × 10⁻¹⁰ ≈ 5.24 × 10⁻⁷ kg (about 0.5 mg)',
      'Weight (g = 9.81 m/s²):',
      'F = mg ≈ 5.24 × 10⁻⁷ × 9.81 ≈ 5.1 × 10⁻⁶ N',
      'So the gravitational force on the raindrop is about 5 micronewtons.',
    ],
    facts: [
      { text: 'V = (4/3)πr³', tag: 'A FORMULA' },
      { text: 'ρ = 1000 kg/m³', tag: 'A PROPERTY VALUE' },
      { text: 'g = 9.81 m/s²', tag: 'A CONSTANT' },
    ],
    mix: {
      title: 'WHAT ONE LARGE MODEL LEARNED FROM',
      subtitle: 'GPT-3 (2020) · FIGURES PUBLISHED BY ITS MAKERS',
      citation: 'BROWN ET AL., “LANGUAGE MODELS ARE FEW-SHOT LEARNERS”, 2020, TABLE 2.2',
      parts: [
        { name: 'Common Crawl (filtered)', gloss: 'the public web, filtered', billions: 410 },
        { name: 'Books2', gloss: 'online books', billions: 55 },
        { name: 'WebText2', gloss: 'curated web pages', billions: 19 },
        { name: 'Books1', gloss: 'online books', billions: 12 },
        { name: 'Wikipedia', gloss: 'English-language Wikipedia', billions: 3 },
      ],
      seenBillions: 300,
    },
    crowd: 'At this scale, one wrong entry is lost in the crowd.',
  },
  note: { label: 'DIFFERS', text: 'Typed in by hand then; learned at scale now. Errors wash out, but there is no single entry to check.', at: 13.0 },
};
export default content;
