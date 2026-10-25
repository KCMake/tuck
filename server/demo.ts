import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Story } from '../shared/types';

// A known-good story kept on disk for live demos: it plays even if browser storage
// is cleared or the venue Wi-Fi drops. It's someone's voice, so git ignores it.
const DIR = path.resolve('demo-story');

export const MAX_DEMO_CLIPS = 12;

export interface DemoMeta {
  story: Story;
  voiceId: string;
  clipCount: number;
  /** Epoch milliseconds. */
  savedAt: number;
}

export async function saveDemo(story: Story, voiceId: string, clips: Uint8Array[]): Promise<void> {
  await rm(DIR, { recursive: true, force: true });
  await mkdir(DIR, { recursive: true });
  await Promise.all(clips.map((clip, i) => writeFile(clipPath(i + 1), clip)));
  const meta: DemoMeta = { story, voiceId, clipCount: clips.length, savedAt: Date.now() };
  await writeFile(path.join(DIR, 'story.json'), JSON.stringify(meta, null, 2));
}

export async function loadDemoMeta(): Promise<DemoMeta | null> {
  try {
    return JSON.parse(await readFile(path.join(DIR, 'story.json'), 'utf8')) as DemoMeta;
  } catch {
    return null;
  }
}

/** Path of clip `n` (1-based). */
export function clipPath(n: number): string {
  return path.join(DIR, `part-${n}.mp3`);
}

/** Removes the backup if it was recorded in `voiceId`. Returns whether it did. */
export async function deleteDemoForVoice(voiceId: string): Promise<boolean> {
  const meta = await loadDemoMeta();
  if (meta?.voiceId !== voiceId) return false;
  await rm(DIR, { recursive: true, force: true });
  return true;
}
