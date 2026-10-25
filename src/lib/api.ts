import type { Pacing, Story, TonightInput } from '../../shared/types';
import type { PreparedStory } from './audioCache';

const SERVER_DOWN = "Can't reach the Tuck server. Check that it's still running, then try again.";

// The server answers errors with { error }. Anything else (a proxy error page, an
// empty body) means the server itself is unreachable.
async function errorFrom(res: Response): Promise<Error> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return new Error(body.error);
  } catch {
    // Not one of ours.
  }
  return new Error(res.status >= 500 ? SERVER_DOWN : `Something went wrong (${res.status}). Try again.`);
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error(SERVER_DOWN);
  }
  if (!res.ok) throw await errorFrom(res);
  return res;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export interface Health {
  ok: boolean;
  cartesia: boolean;
  anthropic: boolean;
}

export async function getHealth(): Promise<Health> {
  return (await request('/api/health')).json();
}

export async function cloneVoice(clip: Blob, parentName: string): Promise<string> {
  const form = new FormData();
  form.append('clip', clip, 'clip.webm');
  form.append('parentName', parentName);
  const res = await request('/api/voice', { method: 'POST', body: form });
  return ((await res.json()) as { voiceId: string }).voiceId;
}

/** Deletes the voice at Cartesia, and the server's demo backup if it was recorded in it. */
export async function deleteVoice(voiceId: string): Promise<void> {
  await request(`/api/voice/${encodeURIComponent(voiceId)}`, { method: 'DELETE' });
}

/** `note` is set when the server fell back to a ready-made story. */
export async function writeStory(input: TonightInput): Promise<{ story: Story; note?: string }> {
  return (await request('/api/story', json(input))).json();
}

/** MP3 audio of `text` in the given voice. `label` only shows up in server logs. */
export async function speak(
  text: string,
  voiceId: string,
  pacing: Partial<Pacing> = {},
  label?: string,
): Promise<Blob> {
  return (await request('/api/tts', json({ text, voiceId, ...pacing, label }))).blob();
}

export async function saveDemoBackup(prepared: PreparedStory): Promise<void> {
  const form = new FormData();
  form.append('story', JSON.stringify(prepared.story));
  form.append('voiceId', prepared.voiceId);
  prepared.clips.forEach((clip, i) => form.append('clips', clip, `part-${i + 1}.mp3`));
  await request('/api/demo', { method: 'POST', body: form });
}

/** Title of the saved demo backup, or null if there isn't one. */
interface DemoMeta {
  story: Story;
  voiceId: string;
  clipCount: number;
}

export async function demoBackupTitle(): Promise<string | null> {
  try {
    const meta = (await (await request('/api/demo')).json()) as DemoMeta | null;
    return meta?.story.title ?? null;
  } catch {
    return null;
  }
}

export async function loadDemoBackup(): Promise<PreparedStory> {
  const meta = (await (await request('/api/demo')).json()) as DemoMeta | null;
  if (!meta) throw new Error('No demo backup saved yet.');
  const clips = await Promise.all(
    Array.from({ length: meta.clipCount }, async (_, i) => (await request(`/api/demo/clips/${i + 1}`)).blob()),
  );
  return { story: meta.story, voiceId: meta.voiceId, clips, preparedAt: Date.now() };
}
