import { describe, expect, it } from 'vitest';
import { sceneFor } from './scenes';
import type { SceneId } from './types';

describe('sceneFor', () => {
  it('uses the scene the story chose', () => {
    expect(sceneFor({ phase: 'adventure', text: '', scene: 'pond' }, 2, 7)).toBe('pond');
  });

  it('gives older stories without scenes a bedroom start and end', () => {
    expect(sceneFor({ phase: 'hello', text: '' }, 0, 7)).toBe('bedroom');
    expect(sceneFor({ phase: 'goodnight', text: '' }, 6, 7)).toBe('bedroom');
    expect(sceneFor({ phase: 'adventure', text: '' }, 2, 7)).toBe('clouds');
    expect(sceneFor({ phase: 'winddown', text: '' }, 4, 7)).toBe('moon');
  });

  it('ignores a scene it does not know', () => {
    expect(sceneFor({ phase: 'adventure', text: '', scene: 'volcano' as SceneId }, 2, 7)).toBe('clouds');
  });
});
