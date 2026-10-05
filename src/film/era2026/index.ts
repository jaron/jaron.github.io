import type { Era2026Renderer, Era2026Spec, SceneContent } from '../core/types';
import LanguageRenderer from './language';
import TranscriptRenderer from './transcript';

// Scenes never import a renderer directly: the 2026 beat is a slot filled by `kind`.
// Raindrop (model-internals visualisation) will register here when it exists.
export function createEra2026(spec: Era2026Spec, content: SceneContent): Era2026Renderer {
  switch (spec.kind) {
    case 'transcript': return new TranscriptRenderer(content);
    case 'language': return new LanguageRenderer(content);
    case 'raindrop': throw new Error('raindrop renderer not available yet');
  }
}
