const BASE = 'https://api.cartesia.ai';
const VERSION = '2026-08-14';
export const TTS_MODEL = 'sonic-3.6';

// The emotions Tuck's pacing uses; anything else is dropped rather than sent.
const EMOTIONS = new Set(['affectionate', 'content', 'calm', 'peaceful', 'neutral']);

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function headers(extra: Record<string, string> = {}) {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) throw new Error('CARTESIA_API_KEY is not set');
  return { Authorization: `Bearer ${key}`, 'Cartesia-Version': VERSION, ...extra };
}

export class CartesiaError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fail(res: Response, what: string): Promise<never> {
  const body = await res.text().catch(() => '');
  throw new CartesiaError(res.status, `${what} failed (${res.status}): ${body.slice(0, 300)}`);
}

const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
};

/** File extension Cartesia's clone endpoint accepts for this MIME type, or null. */
export function cloneExtension(mimeType: string): string | null {
  return EXTENSIONS[mimeType.split(';')[0].trim()] ?? null;
}

export async function cloneVoice(clip: Uint8Array, mimeType: string, name: string): Promise<string> {
  const ext = cloneExtension(mimeType) ?? 'webm';
  const form = new FormData();
  form.append('clip', new Blob([new Uint8Array(clip)], { type: mimeType }), `clip.${ext}`);
  form.append('name', name);
  form.append('language', 'en');
  form.append('description', 'Recorded in Tuck by the speaker, with spoken consent.');
  const res = await fetch(`${BASE}/voices/clone`, { method: 'POST', headers: headers(), body: form });
  if (!res.ok) await fail(res, 'Voice clone');
  const voice = (await res.json()) as { id: string };
  return voice.id;
}

export interface SpeakOptions {
  speed?: number;
  volume?: number;
  emotion?: string;
}

/** Returns MP3 bytes. */
export async function speak(text: string, voiceId: string, opts: SpeakOptions = {}): Promise<ArrayBuffer> {
  const generationConfig: Record<string, number | string> = {
    speed: clamp(opts.speed ?? 1, 0.6, 1.5),
    volume: clamp(opts.volume ?? 1, 0.5, 2),
  };
  if (opts.emotion && EMOTIONS.has(opts.emotion)) generationConfig.emotion = opts.emotion;

  const res = await fetch(`${BASE}/tts/bytes`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      model_id: TTS_MODEL,
      transcript: text,
      voice: voiceId,
      output_format: { container: 'mp3', sample_rate: 44100, bit_rate: 128000 },
      language: 'en',
      generation_config: generationConfig,
    }),
  });
  if (!res.ok) await fail(res, 'Speech');
  return res.arrayBuffer();
}

export async function deleteVoice(voiceId: string): Promise<void> {
  const res = await fetch(`${BASE}/voices/${encodeURIComponent(voiceId)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) await fail(res, 'Delete voice');
}
