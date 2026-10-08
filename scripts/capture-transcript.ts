// Records a REAL model run for a scene's 2026 beat and writes src/film/data/transcripts/<src>.json.
// Run it in your own logged-in terminal:  npm run capture:transcript -- s01-understanding [--model claude-sonnet-5-5]
// It uses the `claude` CLI in print mode with tools disabled and a neutral system prompt; the harness version,
// model and date are stored with the output. Nothing is edited: trim for display afterwards via `excerpt`.
// Scenes whose 2026 kind is 'toolcall' are recorded with one tool instead: Bash restricted to python3, run in a
// temporary directory. The model's calls and the tool's results are kept as turns (stream-json), in order.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
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
let content: { id: string; era1996: { data: { sentence?: string } }; era2026: { kind: string; src: string; prompt?: string } } | undefined;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
  const c = (await import(pathToFileURL(join(dir, f)).href)).default;
  if (c.id === id) content = c;
}
if (!content || !['transcript', 'language', 'meaning', 'toolcall', 'range'].includes(content.era2026.kind)) { console.error(`no scene '${id}' with a recorded reply`); process.exit(2); }
const tool = content.era2026.kind === 'toolcall';
const prompt = content.era2026.prompt ?? content.era1996.data.sentence;
if (!prompt) { console.error('scene has no era2026.prompt or era1996.data.sentence to use as the prompt'); process.exit(2); }

const version = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
const file = join(root, 'data', 'transcripts', `${content.era2026.src}.json`);

if (tool) {
  const system = 'You are a helpful assistant. You can run Python 3 through the Bash tool when a calculation needs it.';
  const r = spawnSync('claude', ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--model', model, '--tools', 'Bash', '--allowedTools', 'Bash(python3:*)', '--no-session-persistence', '--system-prompt', system],
    { encoding: 'utf8', cwd: mkdtempSync(join(tmpdir(), 'qps-capture-')), maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
  type Block = { type: string; text?: string; name?: string; input?: Record<string, unknown>; content?: unknown; is_error?: boolean };
  const turns: Record<string, unknown>[] = [];
  let used = model;
  for (const line of r.stdout.split('\n').filter(Boolean)) {
    const ev = JSON.parse(line) as { type: string; message?: { model?: string; content?: Block[] | string } };
    if (ev.type === 'assistant') used = ev.message?.model ?? used;
    if ((ev.type === 'assistant' || ev.type === 'user') && Array.isArray(ev.message?.content)) {
      for (const b of ev.message!.content as Block[]) {
        if (b.type === 'text' && ev.type === 'assistant' && b.text?.trim()) turns.push({ type: 'text', text: b.text });
        if (b.type === 'tool_use') turns.push({ type: 'tool_call', name: b.name, input: b.input });
        if (b.type === 'tool_result') turns.push({ type: 'tool_result', text: typeof b.content === 'string' ? b.content : JSON.stringify(b.content), error: b.is_error ?? false });
      }
    }
  }
  if (!turns.some((t) => t.type === 'tool_call')) { console.error('the model made no tool call; nothing written. Try again or change the prompt.'); process.exit(1); }
  writeFileSync(file, JSON.stringify({
    fixture: false,
    model: used,
    date: new Date().toISOString().slice(0, 10),
    harness: `claude-code ${version}, print mode, one tool (Bash restricted to python3), system prompt: "${system}"`,
    prompt,
    turns,
  }, null, 2) + '\n');
  console.log(`wrote ${file}\nmodel ${used}; ${turns.length} turns (${turns.filter((t) => t.type === 'tool_call').length} tool call(s)). Review it, then pick display lines in the content file.`);
  process.exit(0);
}

const system = 'You are a helpful assistant.';
const r = spawnSync('claude', ['-p', prompt, '--output-format', 'json', '--model', model, '--tools', '', '--no-session-persistence', '--system-prompt', system],
  { encoding: 'utf8', cwd: tmpdir(), maxBuffer: 32 * 1024 * 1024 });
if (r.status !== 0) { console.error(r.stdout || r.stderr); process.exit(1); }
const out = JSON.parse(r.stdout);
if (out.is_error) { console.error(out.result); process.exit(1); }
const used = Object.keys(out.modelUsage ?? {})[0] ?? model;

writeFileSync(file, JSON.stringify({
  fixture: false,
  model: used,
  date: new Date().toISOString().slice(0, 10),
  harness: `claude-code ${version}, print mode, tools disabled, system prompt: "${system}"`,
  prompt,
  turns: [{ type: 'text', text: out.result }],
}, null, 2) + '\n');
console.log(`wrote ${file}\nmodel ${used}; ${out.result.length} chars. Review it, then set "excerpt" / "highlight" if needed.`);
