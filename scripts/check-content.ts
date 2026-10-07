// Validates the film's content data (docs/spec.md section 13). Run: npm run check:content [-- --strict]
// Warnings are for work in progress; --strict (use before publishing) turns unverified chain nodes,
// fixture transcripts and unverifiable quotes into errors.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'film');
const strict = process.argv.includes('--strict');
const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => (strict ? errors : warnings).push(m);

let total = 0;
const BEATS = ['bridge', 'problem', 'era1996', 'chain', 'era2026'] as const;
const DEFAULTS = { bridge: 3.5, problem: 4.5, era1996: 11, chain: 9, era2026: 8.5 };

const norm = (s: string) => s.replace(/[*_`]/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
// marker's paginated markdown: pages are introduced by `{N}------` with N the 0-based PDF page index
const thesisPath = join(root, 'data', 'thesis-text', 'thesis.md');
const pages = new Map<number, string>();
if (existsSync(thesisPath)) {
  const parts = readFileSync(thesisPath, 'utf8').split(/^\{(\d+)\}-+\s*$/m);
  for (let i = 1; i < parts.length; i += 2) pages.set(Number(parts[i]) + 1, norm(parts[i + 1] ?? ''));
}
if (!pages.size) warn('data/thesis-text/thesis.md not found: thesis quotes cannot be verified yet');

type ChainNodeT = { year: number; name: string; gist: string; verified: boolean; source: { url: string } };
const chains = JSON.parse(readFileSync(join(root, 'data', 'chains.json'), 'utf8')) as Record<string, { intro?: string; nodes: ChainNodeT[] }>;

function verifyRefs(where: string, refs: { page: number | null; pdfPage: number; quote?: string }[]) {
  for (const r of refs) {
    if (r.page !== null && r.pdfPage - r.page !== 7) fail(`${where}: ref page ${r.page} / pdfPage ${r.pdfPage} breaks thesis page = PDF page - 7`);
    if (r.quote && pages.size) {
      const q = norm(r.quote);
      if (!pages.get(r.pdfPage)?.includes(q)) {
        const elsewhere = [...pages].find(([, t]) => t.includes(q))?.[0];
        fail(`${where}: quote not on PDF page ${r.pdfPage}: "${r.quote}"${elsewhere ? ` (found on PDF page ${elsewhere})` : ' (not found anywhere)'}`);
      }
    }
  }
}

// the cold open's quotes (supervisor, prompt, epigraph, 1993)
const cold = (await import(pathToFileURL(join(root, 'data', 'cold-open.ts')).href)).COLD_OPEN;
verifyRefs('data/cold-open.ts', cold.refs);
console.log(`  ${'cold-open'.padEnd(22)} ${cold.duration}s  ${cold.refs.length} quotes checked`);
total += cold.duration;

const dir = join(root, 'data', 'content');
const files = readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
const ids = new Set<string>();

for (const f of files) {
  const c = (await import(pathToFileURL(join(dir, f)).href)).default;
  const where = `content/${f}`;
  if (ids.has(c.id)) fail(`${where}: duplicate id ${c.id}`);
  ids.add(c.id);
  if (!c.id || !f.startsWith(c.id.split('-')[0])) warn(`${where}: file name should start with the scene id prefix`);

  const durs = { ...DEFAULTS, ...(c.beats ?? {}) };
  if (!c.problem) durs.problem = 0;   // a scene without a problem beat skips it
  for (const b of BEATS) if (!(durs[b] > 0) && !(b === 'problem' && !c.problem)) fail(`${where}: beat ${b} duration must be positive`);
  const dur = BEATS.reduce((s, b) => s + durs[b], 0);
  total += dur;

  // the finished 2026 screen (with its note) must stay long enough to read: note.at + its fade + 5 s of linger
  if (typeof c.note?.at !== 'number') fail(`${where}: note.at (seconds into the 2026 beat) is missing`);
  else if (durs.era2026 < c.note.at + 0.5 + 5 - 1e-6) fail(`${where}: the 2026 beat is ${durs.era2026}s but needs at least ${(c.note.at + 5.5).toFixed(1)}s (note at ${c.note.at}s + 0.5s fade + 5s linger)`);

  verifyRefs(where, [...(c.bridge?.refs ?? []), ...(c.problem?.refs ?? []), ...c.era1996.refs]);
  for (const f2 of (c.era1996.data.fields ?? []) as { from: string[] }[])
    for (const s of f2.from) if (!String(c.era1996.data.sentence).includes(s)) fail(`${where}: span "${s}" is not in the sentence`);

  if (!c.bridge?.text) fail(`${where}: missing bridge text (the lead-in that says why the scene matters)`);
  else if (c.bridge.emphasis && !c.bridge.text.includes(c.bridge.emphasis)) fail(`${where}: bridge emphasis is not in the bridge text`);
  const chainDef = chains[c.chain];
  const chain = chainDef?.nodes;
  if (!chain) fail(`${where}: unknown chain '${c.chain}'`);
  else {
    if (!chainDef!.intro) warn(`${where}: chain '${c.chain}' has no intro line`);
    if (chain.length < 3 || chain.length > 5) warn(`${where}: chain has ${chain.length} nodes (3-5 expected)`);
    for (const n of chain) {
      if (!n.verified) warn(`${where}: chain node ${n.year} ${n.name} is not verified against ${n.source.url}`);
      if (!/^https?:\/\//.test(n.source.url)) fail(`${where}: chain node ${n.name} has no source url`);
    }
    const years = chain.map((n) => n.year);
    if (years.some((y, i) => i && y < years[i - 1]!)) fail(`${where}: chain years are not in order`);
  }

  if (c.era2026.kind === 'transcript' || c.era2026.kind === 'language' || c.era2026.kind === 'meaning' || c.era2026.kind === 'correction' || c.era2026.kind === 'toolcall' || c.era2026.kind === 'range') {
    const tp = join(root, 'data', 'transcripts', `${c.era2026.src}.json`);
    if (!existsSync(tp)) fail(`${where}: transcript ${c.era2026.src}.json missing`);
    else {
      const t = JSON.parse(readFileSync(tp, 'utf8'));
      if (t.fixture) warn(`${where}: transcript ${c.era2026.src} is a layout fixture, not a recorded run`);
      else if (!t.model || !t.date) fail(`${where}: recorded transcript needs model and date`);
      const full = t.turns.map((x: { text: string }) => x.text).join('\n\n');
      const shown = (t.excerpt ? full.slice(t.excerpt.from, t.excerpt.to) : full).replace(/\*\*/g, '').replace(/^- /gm, '· ');
      for (const h of c.era2026.highlight ?? []) if (!shown.includes(h)) fail(`${where}: highlight "${h}" is not in the transcript text shown`);
      if (c.era2026.kind === 'meaning') {
        const m = c.era2026;
        if (!m.clusters.some((x: { name: string }) => x.name === m.question.near)) fail(`${where}: question.near '${m.question.near}' is not a cluster`);
        if (m.found.length > 3) fail(`${where}: at most 3 found labels are supported`);
        for (const line of m.reply) if (!shown.split('\n').includes(line)) fail(`${where}: reply line is not verbatim in the transcript: "${line}"`);
      }
      if (c.era2026.kind === 'range') {
        const rg = c.era2026;
        const text = t.turns.map((x: { text?: string }) => x.text ?? '').join('\n').replace(/\*\*/g, '');
        const raw = t.turns.map((x: { text?: string }) => x.text ?? '').join('\n');
        for (const l of rg.reply) if (!text.includes(l)) fail(`${where}: reply line is not verbatim in the recorded reply: "${l}"`);
        for (const r of rg.ranges) if (!raw.includes(r.evidence) && !text.includes(r.evidence)) fail(`${where}: range "${r.label}" evidence is not in the reply: "${r.evidence}"`);
        for (const h of rg.highlight ?? []) if (!rg.reply.join(' ').includes(h)) fail(`${where}: highlight "${h}" is not in the reply lines shown`);
        if (rg.prompt !== t.prompt) fail(`${where}: prompt in the content file differs from the one recorded`);
      }
      if (c.era2026.kind === 'toolcall') {
        const tc = c.era2026;
        const turns = t.turns as { type: string; text?: string; input?: { command?: string } }[];
        const calls = turns.filter((x) => x.type === 'tool_call').map((x) => x.input?.command ?? '').join('\n');
        const results = turns.filter((x) => x.type === 'tool_result').map((x) => x.text ?? '').join('\n').split('\n');
        const reply = turns.filter((x) => x.type === 'text').map((x) => x.text ?? '').join('\n').replace(/\*\*/g, '');
        if (!calls) fail(`${where}: transcript ${tc.src}.json has no tool call`);
        let from = 0;
        for (const l of tc.call) { const at = calls.indexOf(l, from); if (at < 0) fail(`${where}: call line is not verbatim, in order, in the recorded call: "${l}"`); else from = at + l.length; }
        for (const l of tc.result) if (!results.includes(l)) fail(`${where}: result line is not in the tool's output: "${l}"`);
        for (const l of tc.reply) if (!reply.includes(l)) fail(`${where}: reply line is not verbatim in the model's reply: "${l}"`);
        for (const h of tc.highlight ?? []) if (!tc.reply.join(' ').includes(h)) fail(`${where}: highlight "${h}" is not in the reply shown`);
        if (tc.prompt !== t.prompt) fail(`${where}: prompt in the content file differs from the one recorded`);
      }
      if (c.era2026.kind === 'correction') {
        const body = shown.split('\n');
        let from = 0;
        for (const l of c.era2026.lines) {
          const at = shown.indexOf(l.text, from);
          if (at < 0) fail(`${where}: correction line is not verbatim, in order, in the transcript: "${l.text}"`);
          else from = at + l.text.length;
        }
        void body;
      }
      if (c.era2026.kind === 'language') {
        const lang = c.era2026;
        const joined = lang.rows.flat().join('');
        const sentence = String(c.era1996.data.sentence ?? '').replace(/\s+/g, '');
        if (sentence && joined !== sentence) fail(`${where}: language pieces do not spell the 1996 sentence (\"${joined.slice(0, 40)}…\" vs \"${sentence.slice(0, 40)}…\")`);
        const rowOf: number[] = lang.rows.flatMap((r: string[], i: number) => r.map(() => i));
        for (const l of lang.links) {
          if (l.a < 0 || l.b < 0 || l.a >= rowOf.length || l.b >= rowOf.length) fail(`${where}: link ${l.a}-${l.b} is outside the pieces`);
          else if (rowOf[l.a] !== rowOf[l.b]) fail(`${where}: link ${l.a}-${l.b} crosses rows (arcs are drawn within a row)`);
        }
        for (const line of lang.reply) if (!shown.split('\n').includes(line)) fail(`${where}: reply line is not verbatim in the transcript: "${line}"`);
      }
    }
  }
  console.log(`  ${c.id.padEnd(22)} ${dur}s  chain:${c.chain}`);
}

console.log(`\n${files.length} figure scene(s), ${total}s of content so far (target film ~5:20: 41 cold open + 7 x 36.5 + 25 outro)`);
for (const w of warnings) console.log(`warn   ${w}`);
for (const e of errors) console.log(`ERROR  ${e}`);
if (errors.length) { console.log(`\n${errors.length} error(s)${strict ? ' (strict)' : ''}`); process.exit(1); }
console.log(strict ? '\nOK (strict)' : `\nOK (${warnings.length} warning(s); run with --strict before publishing)`);
