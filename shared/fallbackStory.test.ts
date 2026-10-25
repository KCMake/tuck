import { describe, expect, it } from 'vitest';
import { FALLBACK_VARIANTS, fallbackStory } from './fallbackStory';
import { SCENES } from './scenes';
import { checkStory } from './storyRules';
import type { TonightInput } from './types';

const input: TonightInput = {
  parentTitle: 'Mama',
  childName: 'Mia',
  childAge: 3,
  comfortToy: 'Bunny',
  todayMoment: 'we saw giraffes at the zoo',
  goodnightWords: 'I love you to the moon and back.',
};

describe('fallbackStory', () => {
  for (let variant = 0; variant < FALLBACK_VARIANTS; variant++) {
    it(`variant ${variant} uses every detail and passes the story checks`, () => {
      const story = fallbackStory(input, variant);
      const text = story.paragraphs.map((p) => p.text).join(' ');
      expect(text).toContain('Mia');
      expect(text).toContain('Bunny');
      expect(text).toContain('giraffes at the zoo');
      expect(text).not.toMatch(/undefined|\$\{/);
      expect(story.paragraphs.at(-1)!.text.endsWith('I love you to the moon and back.')).toBe(true);
      expect(story.source).toBe('fallback');
      expect(checkStory(story, input)).toEqual([]);
    });

    it(`variant ${variant} starts and ends in the bedroom, with a scene for every part`, () => {
      const scenes = fallbackStory(input, variant).paragraphs.map((p) => p.scene);
      expect(scenes.every((s) => s && (SCENES as readonly string[]).includes(s))).toBe(true);
      expect(scenes[0]).toBe('bedroom');
      expect(scenes.at(-1)).toBe('bedroom');
    });

    it(`variant ${variant} copes without a toy or a moment`, () => {
      const bare = { ...input, comfortToy: '', todayMoment: '', goodnightWords: 'Night night' };
      const story = fallbackStory(bare, variant);
      expect(story.paragraphs.at(-1)!.text.endsWith('Night night.')).toBe(true);
      expect(checkStory(story, bare)).toEqual([]);
    });
  }
});
