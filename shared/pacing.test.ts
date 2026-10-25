import { describe, expect, it } from 'vitest';
import { pacingFor } from './pacing';
import type { StoryPhase } from './types';

const PHASES: StoryPhase[] = ['hello', 'adventure', 'adventure', 'adventure', 'winddown', 'winddown', 'goodnight'];
const paced = PHASES.map((phase, i) => pacingFor(phase, i, PHASES.length));

describe('pacingFor', () => {
  it('starts at normal speed and volume and ends slow and quiet', () => {
    expect(paced[0]).toMatchObject({ speed: 1, volume: 1 });
    expect(paced.at(-1)).toMatchObject({ speed: 0.7, volume: 0.6 });
  });

  it('never speeds up or gets louder', () => {
    for (let i = 1; i < paced.length; i++) {
      expect(paced[i].speed).toBeLessThanOrEqual(paced[i - 1].speed);
      expect(paced[i].volume).toBeLessThanOrEqual(paced[i - 1].volume);
    }
  });

  it("stays inside Cartesia's allowed ranges", () => {
    for (const p of paced) {
      expect(p.speed).toBeGreaterThanOrEqual(0.6);
      expect(p.speed).toBeLessThanOrEqual(1.5);
      expect(p.volume).toBeGreaterThanOrEqual(0.5);
      expect(p.volume).toBeLessThanOrEqual(2);
    }
  });

  it('picks the emotion from the phase', () => {
    expect(paced.map((p) => p.emotion)).toEqual([
      'affectionate',
      'content',
      'content',
      'content',
      'calm',
      'calm',
      'peaceful',
    ]);
  });

  it('treats a one-paragraph story as the end of the story', () => {
    expect(pacingFor('goodnight', 0, 1)).toMatchObject({ speed: 0.7, volume: 0.6 });
  });
});
