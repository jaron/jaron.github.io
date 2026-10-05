// Records a REAL model run for a scene's 2026 beat and writes src/film/data/transcripts/<src>.json.
// Run it in your own logged-in terminal:  npm run capture:transcript -- s01-understanding [--model claude-sonnet-5-5]
// It uses the `claude` CLI in print mode with tools disabled and a neutral system prompt; the harness version,
// model and date are stored with the output. Nothing is edited: trim for display afterwards via `excerpt`.
import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'film');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const mi = args.indexOf('--model');
const model = mi >= 0 ? args[mi + 1]! : 'claude-sonnet-5-5';
if (!id) { console.error('usage: capture-transcript <scene-id> [--model <id>]'); process.exit(2); }

const dir = join(root, 'data', 'content');
let content: { id: string; era1996: { data: { sentence?: string } }; era2026: { kind: string; src: string } } | undefined;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
  const c = (await import(pathToFileURL(join(dir, f)).href)).default;
  if (c.id === id) content = c;
}
if (!content || content.era2026.kind !== 'transcript') { console.error(`no transcript scene '${id}'`); process.exit(2); }
const prompt = content.era1996.data.sentence;
if (!prompt) { console.error('scene has no era1996.data.sentence to use as the prompt'); process.exit(2); }

const system = 'You are a helpful assistant.';
const r = spawnSync('claude', ['-p', prompt, '--output-format', 'json', '--model', model, '--tools', '', '--no-session-persistence', '--system-prompt', system],
  { encoding: 'utf8', cwd: tmpdir(), maxBuffer: 32 * 1024 * 1024 });
if (r.status !== 0) { console.error(r.stdout || r.stderr); process.exit(1); }
const out = JSON.parse(r.stdout);
if (out.is_error) { console.error(out.result); process.exit(1); }
const version = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
const used = Object.keys(out.modelUsage ?? {})[0] ?? model;

const file = join(root, 'data', 'transcripts', `${content.era2026.src}.json`);
writeFileSync(file, JSON.stringify({
  fixture: false,
  model: used,
  date: new Date().toISOString().slice(0, 10),
  harness: `claude-code ${version}, print mode, tools disabled, system prompt: "${system}"`,
  prompt,
  turns: [{ type: 'text', text: out.result }],
}, null, 2) + '\n');
console.log(`wrote ${file}\nmodel ${used}; ${out.result.length} chars. Review it, then set "excerpt" / "highlight" if needed.`);
