import type { Pacing, StoryPhase } from './types';

// Cartesia allows speed 0.6–1.5 and volume 0.5–2.0; both ease down across the story.
export const SPEED = { start: 1.0, end: 0.7 } as const;
export const VOLUME = { start: 1.0, end: 0.6 } as const;

const EMOTION: Record<StoryPhase, string> = {
  hello: 'affectionate',
  adventure: 'content',
  winddown: 'calm',
  goodnight: 'peaceful',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** How the voice should sound for paragraph `index` of `total`. */
export function pacingFor(phase: StoryPhase, index: number, total: number): Pacing {
  const t = total > 1 ? index / (total - 1) : 1;
  return {
    speed: round2(SPEED.start + (SPEED.end - SPEED.start) * t),
    volume: round2(VOLUME.start + (VOLUME.end - VOLUME.start) * t),
    emotion: EMOTION[phase],
  };
}
