import type { SceneId, StoryParagraph } from './types';

export const SCENES = ['bedroom', 'clouds', 'moon', 'garden', 'pond', 'forest'] as const satisfies readonly SceneId[];

export const SCENE_LABEL: Record<SceneId, string> = {
  bedroom: 'Bedroom',
  clouds: 'Cloud sky',
  moon: 'The moon',
  garden: 'Night garden',
  pond: 'Moonlit pond',
  forest: 'Firefly forest',
};

const isScene = (s: unknown): s is SceneId => (SCENES as readonly unknown[]).includes(s);

/** The paragraph's scene, or a sensible one for stories saved before scenes existed. */
export function sceneFor(paragraph: StoryParagraph, index: number, total: number): SceneId {
  if (isScene(paragraph.scene)) return paragraph.scene;
  if (index === 0 || index === total - 1) return 'bedroom';
  return paragraph.phase === 'winddown' ? 'moon' : 'clouds';
}
