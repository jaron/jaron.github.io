// The edit: which scene plays when. Times are authored in seconds (the film has no song to align to).
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import { beatSpans } from './core/figure';
import type { SceneSpan } from './core/controller';
import { sceneDuration, type SceneContent } from './core/types';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};
const figure = () => import('./core/figure') as Promise<{ default: SceneClass }>;

const contentFiles = import.meta.glob<SceneContent>('./data/content/*.ts', { eager: true, import: 'default' });
export const CONTENT: SceneContent[] = Object.keys(contentFiles).sort().map((k) => contentFiles[k]!);

import { COLD_OPEN as COLD } from './data/cold-open';
const COLD_OPEN = COLD.duration;

interface Built { entries: TimelineEntry[]; spans: SceneSpan[]; duration: number }

export function buildTimeline(): Built {
  const entries: TimelineEntry[] = [{ id: 'cold-open', load: scene('cold-open'), start: 0, end: COLD_OPEN }];
  const spans: SceneSpan[] = [{ id: 'cold-open', start: 0, end: COLD_OPEN }];
  let t = COLD_OPEN;
  for (const content of CONTENT) {
    const end = t + sceneDuration(content);
    entries.push({ id: content.id, load: figure, start: t, end, params: { content } });
    spans.push({ id: content.id, start: t, end, content, beats: beatSpans(content) });
    t = end;
  }
  return { entries, spans, duration: t };
}
