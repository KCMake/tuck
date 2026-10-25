import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { fallbackStory } from '../shared/fallbackStory';
import { checkStory, normalizeTonightInput } from '../shared/storyRules';
import type { Story } from '../shared/types';
import { SAMPLE_VOICE_ID } from '../shared/voices';
import { CartesiaError, cloneExtension, cloneVoice, deleteVoice, speak } from './cartesia';
import { isAuthError, writeStory } from './claude';
import { MAX_DEMO_CLIPS, clipPath, deleteDemoForVoice, loadDemoMeta, saveDemo } from './demo';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Cartesia's clone limit is 16 MB.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    cartesia: Boolean(process.env.CARTESIA_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

app.post('/api/voice', upload.single('clip'), async (req, res) => {
  const clip = req.file;
  const parentName = String(req.body?.parentName ?? '').trim().slice(0, 40) || 'Parent';
  if (!clip || clip.size < 10_000) {
    res.status(400).json({ error: 'That recording is too short. Read for at least 20 seconds.' });
    return;
  }
  if (!cloneExtension(clip.mimetype)) {
    res.status(415).json({ error: "That recording format won't work. Open Tuck in Chrome and record again." });
    return;
  }
  const started = Date.now();
  try {
    const voiceId = await cloneVoice(clip.buffer, clip.mimetype, `Tuck – ${parentName}`);
    console.log(`[voice] cloned ${voiceId} from ${Math.round(clip.size / 1024)} KB in ${Date.now() - started}ms`);
    res.json({ voiceId });
  } catch (err) {
    console.error('[voice]', err);
    if (err instanceof CartesiaError && err.status === 402) {
      res.status(402).json({
        error: "Voice cloning isn't turned on for this Cartesia account yet (it needs a paid plan). Use the sample voice for now.",
      });
      return;
    }
    res.status(502).json({ error: "We couldn't make your voice from that recording. Try again somewhere quieter." });
  }
});

app.delete('/api/voice/:id', async (req, res) => {
  if (req.params.id === SAMPLE_VOICE_ID) {
    res.json({ ok: true });
    return;
  }
  try {
    await deleteVoice(req.params.id);
    // Deleting a voice also deletes what was recorded in it.
    const demoRemoved = await deleteDemoForVoice(req.params.id);
    console.log(`[voice] deleted ${req.params.id}${demoRemoved ? ' and its demo backup' : ''}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[voice]', err);
    res.status(502).json({ error: "Couldn't delete your voice just now. Try again." });
  }
});

app.post('/api/story', async (req, res) => {
  const input = normalizeTonightInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Add your child's name, what they call you, and your goodnight words." });
    return;
  }
  // Two tries at a story that passes every check, then a ready-made one.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      const story = await writeStory(input);
      const problems = checkStory(story, input);
      if (problems.length === 0) {
        console.log(`[story] attempt ${attempt} ok ${Date.now() - started}ms`);
        res.json({ story });
        return;
      }
      console.warn(`[story] attempt ${attempt} failed checks: ${problems.join('; ')}`);
    } catch (err) {
      if (isAuthError(err)) {
        console.error('[story] Anthropic rejected the API key (401); using a ready-made story');
        break;
      }
      console.error(`[story] attempt ${attempt}`, err);
    }
  }
  res.json({ story: fallbackStory(input), note: 'Using a ready-made story tonight.' });
});

app.post('/api/tts', async (req, res) => {
  const { text, voiceId, speed, volume, emotion, label } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > 2000 || typeof voiceId !== 'string') {
    res.status(400).json({ error: 'Need some text (up to 2000 characters) and a voice.' });
    return;
  }
  const started = Date.now();
  try {
    const audio = await speak(text, voiceId, {
      speed: typeof speed === 'number' ? speed : undefined,
      volume: typeof volume === 'number' ? volume : undefined,
      emotion: typeof emotion === 'string' ? emotion : undefined,
    });
    console.log(`[tts]${typeof label === 'string' ? ` ${label}` : ''} ok ${Date.now() - started}ms`);
    res.type('audio/mpeg').send(Buffer.from(audio));
  } catch (err) {
    console.error('[tts]', err);
    res.status(502).json({ error: "Couldn't make the audio just now. Try again." });
  }
});

app.post('/api/demo', upload.array('clips', MAX_DEMO_CLIPS), async (req, res) => {
  const clips = (req.files as Express.Multer.File[] | undefined) ?? [];
  let story: Story | null = null;
  try {
    story = JSON.parse(String(req.body?.story ?? 'null'));
  } catch {
    // Reported below.
  }
  const voiceId = String(req.body?.voiceId ?? '');
  if (!story?.paragraphs?.length || story.paragraphs.length !== clips.length || !voiceId) {
    res.status(400).json({ error: "That story couldn't be saved as a backup. Record it again first." });
    return;
  }
  try {
    await saveDemo(story, voiceId, clips.map((c) => c.buffer));
    console.log(`[demo] saved "${story.title}" (${clips.length} parts)`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[demo]', err);
    res.status(500).json({ error: "Couldn't save the demo backup." });
  }
});

// null when there's no backup: the app checks on every visit to Tonight, and a 404 would litter the console.
app.get('/api/demo', async (_req, res) => {
  res.json(await loadDemoMeta());
});

app.get('/api/demo/clips/:n', async (req, res) => {
  const meta = await loadDemoMeta();
  const n = Number(req.params.n);
  if (!meta || !Number.isInteger(n) || n < 1 || n > meta.clipCount) {
    res.status(404).json({ error: 'No such part.' });
    return;
  }
  res.type('audio/mpeg').sendFile(clipPath(n));
});

const handleErrors: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[server]', err);
  const tooBig = err?.code === 'LIMIT_FILE_SIZE';
  res
    .status(tooBig ? 413 : 500)
    .json({ error: tooBig ? 'That recording is too long. Keep it under a minute.' : 'Something went wrong.' });
};
app.use(handleErrors);

// Not PORT: launchers set PORT for the web server, and Vite forwards /api here.
const port = Number(process.env.API_PORT ?? 8787);
app.listen(port, () => console.log(`[server] listening on http://localhost:${port}`));
