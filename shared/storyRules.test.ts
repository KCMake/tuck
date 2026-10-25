import { describe, expect, it } from 'vitest';
import { fallbackStory } from './fallbackStory';
import { checkStory, normalizeTonightInput } from './storyRules';
import type { Story, TonightInput } from './types';

const input: TonightInput = {
  parentTitle: 'Mama',
  childName: 'Mia',
  childAge: 3,
  comfortToy: 'Bunny',
  todayMoment: 'we saw giraffes at the zoo',
  goodnightWords: 'I love you to the moon and back.',
};

function storyWith(change: (story: Story) => void): Story {
  const story = fallbackStory(input, 0);
  change(story);
  return story;
}

describe('checkStory', () => {
  it('passes a well-formed story', () => {
    expect(checkStory(fallbackStory(input, 0), input)).toEqual([]);
  });

  it('flags a story that drops the goodnight words', () => {
    const story = storyWith((s) => {
      s.paragraphs.at(-1)!.text = 'Goodnight, Mia. Sleep tight.';
    });
    expect(checkStory(story, input)).toContain("doesn't end with the goodnight words");
  });

  it('flags a story that is too long', () => {
    const story = storyWith((s) => {
      s.paragraphs[1].text = 'soft '.repeat(400);
    });
    expect(checkStory(story, input).some((p) => p.includes('words'))).toBe(true);
  });

  it('flags phases out of order', () => {
    const story = storyWith((s) => {
      s.paragraphs[1].phase = 'winddown';
      s.paragraphs[2].phase = 'adventure';
    });
    expect(checkStory(story, input)).toContain('phases out of order');
  });

  it('flags off-limits words', () => {
    const story = storyWith((s) => {
      s.paragraphs[2].text += ' A monster waves from the trees.';
    });
    expect(checkStory(story, input)).toContain('off-limits word "monster"');
  });

  it('flags promises, unless the parent wrote them', () => {
    const promised = storyWith((s) => {
      s.paragraphs[2].text += " I'll be home soon.";
    });
    expect(checkStory(promised, input).some((p) => p.startsWith('makes a promise'))).toBe(true);

    const own = { ...input, goodnightWords: "I'll be home when you wake up." };
    expect(checkStory(fallbackStory(own, 0), own)).toEqual([]);
  });

  it('flags questions to the child', () => {
    const story = storyWith((s) => {
      s.paragraphs[1].text += ' Can you see the moon?';
    });
    expect(checkStory(story, input)).toContain('asks the child a question');
  });

  it('flags a malformed story', () => {
    expect(checkStory({ title: '', paragraphs: [], source: 'claude' }, input).length).toBeGreaterThan(0);
  });
});

describe('normalizeTonightInput', () => {
  it('trims whitespace and caps lengths', () => {
    const result = normalizeTonightInput({ ...input, childName: '  Mia  ', todayMoment: 'x'.repeat(1000) });
    expect(result?.childName).toBe('Mia');
    expect(result?.todayMoment.length).toBe(280);
  });

  it('rejects a request without the child, parent or goodnight words', () => {
    expect(normalizeTonightInput({ ...input, childName: ' ' })).toBeNull();
    expect(normalizeTonightInput({ ...input, parentTitle: undefined })).toBeNull();
    expect(normalizeTonightInput({ ...input, goodnightWords: '' })).toBeNull();
    expect(normalizeTonightInput(null)).toBeNull();
  });
});
