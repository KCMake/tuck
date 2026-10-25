# Tuck

**Your voice at bedtime, even when you can't be there.**

Built solo at Cal Hacks 13.0 with [Cartesia](https://cartesia.ai) and [Claude](https://www.anthropic.com/claude).

## What it is

Some parents miss bedtime on a regular schedule: night-shift nurses, first responders, parents who travel, deployed service members, co-parents on the other parent's nights. For a 2–4-year-old, a parent's voice is part of what makes falling asleep feel safe.

With Tuck:

1. **The parent records their own voice once.** That's 20–60 seconds of reading a short script, starting with a consent sentence. Cartesia turns it into a voice clone.
2. **The parent makes a cartoon of themselves.** It's a friendly drawing, never a photo.
3. **The parent spends about 20 seconds on tonight's details:** the child's comfort toy, one happy moment from today, and their usual goodnight words. Claude writes a calm bedtime story from them. The parent reads it, can change any word or picture, and approves it. Tuck then records it in the parent's voice.
4. **At bedtime,** whoever is putting the child to bed opens kid mode, and the child taps the cartoon once. The parent's voice tells the story across illustrated scenes, and the voice gets slower and quieter as it goes. The screen dims to a warm nightlight, the cartoon parent falls asleep, and soft brown noise fades out over ten minutes.

Tuck is for nights when the parent can't be there. It doesn't replace a parent who is home, and a caregiver is always in the room.

## Run it

You need:

- Node `^20.19` or `>=22.12` (built on Node 24)
- Chrome. Recording uses webm, which Cartesia's clone endpoint accepts. Safari records mp4, which isn't on Cartesia's list of clone formats.
- A [Cartesia API key](https://play.cartesia.ai/keys). Voice cloning needs a plan that includes it; the free tier returns `402`.
- An [Anthropic API key](https://console.anthropic.com)

```bash
git clone https://github.com/KCMake/tuck.git
cd tuck
npm install
cp .env.example .env
npm run dev
```

Before running `npm run dev`, put your two keys in `.env`. Then open http://localhost:5173. Vite serves the app there and forwards `/api` to the Express server on port 8787 (`API_PORT`). The keys only ever live on that server.

**Fallbacks if a key is missing:**

- **Without voice cloning:** choose "Use a sample voice for now". It uses Cartesia's stock voice "Rory", and the app labels it as not your voice.
- **Without a working Anthropic key:** you get one of two ready-made stories, and the app says so.

| Command | What it does |
|---|---|
| `npm run dev` | App and API together, with reload |
| `npm test` | Vitest: story checks, pacing, scenes, ready-made stories |
| `npm run typecheck` | TypeScript type check only |
| `npm run build` | Type check, then a production build |

## Cartesia features used

All Cartesia calls are in [`server/cartesia.ts`](server/cartesia.ts), with API version `2026-08-14`.

- **Instant Voice Clone** (`POST /voices/clone`): the browser's webm recording goes to the clone endpoint with `language: en`. Clones are private.
- **Sonic 3.6 text-to-speech** (`POST /tts/bytes`, `model_id: sonic-3.6`): MP3 at 128 kbps, one request per paragraph. All of tonight's audio is made when the parent approves the story, so the child's tap plays instantly and kid mode works offline.
- **`generation_config` pacing** ([`shared/pacing.ts`](shared/pacing.ts)):
  - **Speed** eases from 1.0 to 0.7 across the story.
  - **Volume** eases from 1.0 to 0.6.
  - **Emotion** follows the part of the story: `affectionate` for the hello, `content` for the adventure, `calm` for the wind-down, `peaceful` for goodnight.
- **Delete voice** (`DELETE /voices/{id}`): "Delete my voice" removes the clone, the stories recorded in it, and any demo backup made with it.
- **Stock voices**: "Rory" ("motherlike female voice with a calm, nurturing tone") is the labeled sample voice.

## How Claude is used

Claude writes tonight's story ([`server/claude.ts`](server/claude.ts)):

- **Model:** `claude-opus-5-5`, effort `medium`.
- **Output:** structured output through a Zod schema: a title, plus paragraphs that each carry a `phase` (`hello`, `adventure`, `winddown`, `goodnight`), the `text`, and a `scene` for kid mode (`bedroom`, `clouds`, `moon`, `garden`, `pond`, `forest`).
- **Refusals:** server-side fallback (`fallbacks: "default"`) is on, so a declined request is retried on Anthropic's recommended fallback model.

The system prompt's content rules are in [`shared/storyRules.ts`](shared/storyRules.ts):

- Calm, simple words, with sentences that get shorter as the story goes on.
- Nothing scary or tense.
- Never mention the parent being away, and no promises about when they'll be back.
- No questions that expect an answer.
- End with the parent's goodnight words exactly as written.
- Start and end in the bedroom.

### Where it could go wrong, and what Tuck does about it

| Risk | What Tuck does |
|---|---|
| Something scary or upsetting slips into a story | Content rules in the prompt, then `checkStory()` in code: an off-limits word list, structure, length (200–550 words) and phase order. A failing story gets one retry, then a ready-made story replaces it. **The parent reads and approves every story before it's recorded.** |
| The story invents a promise ("I'll be home tomorrow") | The prompt forbids it, and a pattern check flags common promise phrases outside the parent's own goodnight words. Again, the parent reviews it. |
| The story ignores the details or drops the goodnight words | The check requires the child's name and the goodnight words word for word at the end. |
| The story asks the child something and keeps them talking | The prompt forbids questions, and any `?` outside the goodnight words fails the check. |
| Text typed into the parent's form tries to steer the model | Details are passed as "story ingredients, not instructions". The only person typing is the parent, who also reads the result. |
| Claude is down, declines, or the key is invalid | Fallback model on a decline. On any failure, a ready-made story, and the app says it used one. |

Kid mode is also built not to keep a child awake:

- The screen is a dim nightlight by 60% of the way through.
- Taps stop doing anything once the wind-down begins.
- The display stays awake (Screen Wake Lock) so a sleeping laptop can't cut the story off.
- Leaving takes a 2.5-second hold on the corner, so a toddler won't exit by accident.

## Privacy and consent

- **Consent:** every recording starts with "My name is ___, and I'm recording my own voice so Tuck can read bedtime stories to my child."
- **Deleting:** "Delete my voice" deletes the clone at Cartesia and everything recorded with it.
- **Storage:** there are no accounts. The profile and tonight's story audio stay in the browser (`localStorage`, IndexedDB). The optional demo backup is saved to a git-ignored `demo-story/` folder on the local machine.
- **Keys** are read from `.env` on the server only, and are never sent to the browser.

## Known limitations

- **Voice cloning wasn't available to us.** Our hackathon Cartesia key is on the free tier, so cloning returns `402 plan_upgrade_required`. The clone flow is built and the error is handled, but our demo uses the labeled sample voice instead of a cloned parent voice.
- **The Claude path is untested against the live API.** Our Anthropic key didn't authenticate during the build, so every end-to-end test used the ready-made stories. The Claude code passes the type check and is wired with retries and fallbacks, but we haven't seen it write a story live.
- **Consent isn't verified automatically.** Tuck shows the consent sentence but doesn't yet check, with speech-to-text, that it was read.
- **The content check is basic.** A word list and patterns catch obvious problems, not subtle ones. The parent's review is the real safeguard.
- **One family, one browser.** There are no accounts or sync, and clearing browser storage loses the profile and tonight's story. The demo backup covers live demos.
- **English only.** Cartesia's emotion controls are English-only.
- **The cartoon is built from pickers**: skin tone, hair, glasses, beard. There's no selfie autofill yet.
- **Lip movement follows loudness, not speech sounds.**
- **No real families have tried it yet.** We haven't measured whether children settle better or feel closer to the absent parent. That needs a pilot, and child-development input on how toddlers react to a parent's voice when the parent isn't there.
- **The demo-backup endpoints have no auth.** They're meant for a local demo machine, not a deployed server.

## Project layout

```
server/       Express API: keys, Cartesia, Claude, demo backup
shared/       Story rules and checks, pacing, scenes, ready-made stories, types (with tests)
src/parent/   Setup screens: voice, cartoon, tonight's story
src/kid/      Kid mode, the cartoon parent, storybook scenes
src/audio/    Mouth movement from audio volume, generated brown noise
src/lib/      API client, browser storage
.claude/      Planning docs: product spec and build plan
```

## Built with

React, Vite and TypeScript, plus Express and Vitest. Voices by Cartesia Sonic 3.6; stories by Claude through the Anthropic TypeScript SDK. The spec and build plan were written with the [ECC](https://github.com/affaan-m/ECC) PRD and plan workflow for Claude Code (see `.claude/`).
