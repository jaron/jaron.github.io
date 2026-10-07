import type { Era1996Renderer } from '../core/types';

// One renderer per kind of 1996 beat; scenes name theirs in content.era1996.kind.
const loaders: Record<string, () => Promise<{ default: new () => Era1996Renderer }>> = {
  form: () => import('./form'),
  backtrack: () => import('./backtrack'),
  formulae: () => import('./formulae'),
};

export async function createEra1996(kind: string): Promise<Era1996Renderer> {
  const load = loaders[kind];
  if (!load) throw new Error(`no era1996 renderer '${kind}'`);
  return new (await load()).default();
}
