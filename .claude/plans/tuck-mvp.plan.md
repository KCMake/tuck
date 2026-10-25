# Plan: Tuck MVP, a parent's voice puts a kid to bed

**Source PRD**: `.claude/prds/tuck.prd.md`
**Selected Milestone**: 1, "A parent's voice puts a kid to bed". Milestone 2 ("Ready for judges") is scheduled at the bottom, since one person does both.
**Complexity**: Large (about 9 build hours, solo, Saturday 8 PM to Sunday 9 AM)

## Summary
A local web app that runs on the demo laptop. A Vite + React + TypeScript frontend talks to a small Express server, which holds the API keys. Cartesia clones the parent's voice and speaks each paragraph a little slower and quieter than the last. Claude writes the story under fixed content rules. An SVG cartoon of the parent moves its mouth with the audio volume, gets sleepy, and fades into a nightlight. All of tonight's audio is generated when the parent approves the story, so the kid's tap plays instantly and works offline.

## Verified API facts (checked 2026-10-24)
- **The Cartesia key works.** `POST https://api.cartesia.ai/tts/bytes` with headers `Authorization: Bearer $CARTESIA_API_KEY` and `Cartesia-Version: 2026-08-14`, and this body, returned `200 audio/wav`:
  `{"model_id":"sonic-3.6","transcript":"…","voice":"<voice id>","output_format":{"container":"wav","encoding":"pcm_s16le","sample_rate":44100},"language":"en","generation_config":{"speed":0.8,"emotion":"calm"}}`
  - MP3 output also works: `{"container":"mp3","sample_rate":44100,"bit_rate":128000}`. Use it to keep the cached audio small.
- **Cloning**: `POST /voices/clone` (multipart) with `clip` (16 MB max; webm, wav, mp3 and ogg are fine), `name` and `language=en`. The new voice's ID is in the response's `id` field.
  - 10 seconds is the minimum; up to 60 seconds helps on sonic-3.6.
  - The recording's tone and pacing carry over to the clone, so record in your bedtime voice.
- **`generation_config`**:
  - `speed` 0.6–1.5, which works on instant clones
  - `volume` 0.5–2.0
  - `emotion` (English only), from a fixed list that includes `affectionate`, `content`, `calm` and `peaceful`
- **Keys stay on the server**, per Cartesia's rules. `.env` is in `.gitignore`.
- **Not verified yet**:
  - the delete-voice endpoint (check the API reference before task 8)
  - Cartesia's speech-to-text endpoint, needed for optional task 9
- **The Anthropic key in `.env` returns 401** for both `x-api-key` and bearer auth. A valid `sk-ant-…` key is needed before task 3.
  - Models: `claude-sonnet-5-5` for stories, `claude-haiku-5-5` for turning a selfie into a cartoon.
  - Load the `claude-api` skill before writing the Claude calls.

## Patterns to Mirror
This is a new project: the folder was empty, so there's no existing code to copy. These are the conventions this plan sets:

| Category | Source | Pattern |
|---|---|---|
| Naming | this plan | PascalCase React components (`KidMode.tsx`), camelCase modules (`pacing.ts`), all server routes under `/api/*` |
| Errors | this plan | Routes return `{ error: string }` with a 4xx/5xx status and log `console.error('[route]', err)`. The parent UI shows one friendly line and a Retry button. Kid mode never shows an error: it falls back silently. |
| Logging | this plan | Server only, in the style `[tts] 3/7 ok 412ms` |
| Data | this plan | Family profile in `localStorage` under `tuck.profile.v1`; prepared audio in IndexedDB under `tuck-audio` |
| Tests | this plan | Vitest, with `*.test.ts` files next to the code, for pure logic only (pacing, story checks, fallback story) |

## Files to Change
| File | Action | Why |
|---|---|---|
| `package.json` | CREATE | Scripts: `dev` (Vite and the server together via `concurrently`), `build`, `test`, `typecheck` |
| `vite.config.ts` | CREATE | React plugin; forwards `/api` to `localhost:8787` |
| `tsconfig.json` | CREATE | Strict TypeScript across `src`, `server` and `shared` |
| `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css` | CREATE | App shell. Screens: Setup → Tonight → Kid mode. Dark, warm palette. |
| `.env.example` | CREATE | Key names without values, for judges |
| `server/index.ts` | CREATE | Express routes: `POST /api/voice`, `DELETE /api/voice/:id`, `POST /api/story`, `POST /api/tts`, `POST /api/avatar` |
| `server/cartesia.ts` | CREATE | `cloneVoice`, `speak`, `deleteVoice` |
| `server/claude.ts` | CREATE | `writeStory`, `avatarFromSelfie` |
| `shared/types.ts` | CREATE | `FamilyProfile`, `TonightInput`, `Story`, `StoryParagraph`, `AvatarParams` |
| `shared/storyRules.ts` (+ `.test.ts`) | CREATE | The content-rules prompt, and `checkStory()` for structure, length and sign-off |
| `shared/pacing.ts` (+ `.test.ts`) | CREATE | `pacingFor(paragraph, index, total)` returns `{ speed, volume, emotion }` |
| `shared/fallbackStory.ts` (+ `.test.ts`) | CREATE | Two template stories filled with tonight's details, for when Claude is unavailable |
| `src/parent/VoiceSetup.tsx` | CREATE | Recording script, countdown, browser recording, upload, "sounds like me?" playback |
| `src/parent/AvatarBuilder.tsx` | CREATE | Pick skin tone, hair, glasses and beard; optional selfie autofill |
| `src/parent/Tonight.tsx` | CREATE | Form → story preview → regenerate or edit → approve, then prepare the audio with a progress bar |
| `src/kid/KidMode.tsx` | CREATE | Fullscreen, tap to start, play paragraphs in order, fade to nightlight, background noise, hold to exit |
| `src/kid/ParentAvatar.tsx` | CREATE | SVG cartoon driven by `mouthOpen` (0–1), `sleepiness` (0–1), and automatic blinking and breathing |
| `src/audio/amplitude.ts` | CREATE | Web Audio volume analysis → how open the mouth is |
| `src/audio/brownNoise.ts` | CREATE | Generated soft noise loop that fades out over about 10 minutes |
| `src/lib/profile.ts`, `src/lib/audioCache.ts` | CREATE | Profile in `localStorage`; prepared audio clips in IndexedDB |
| `README.md` | CREATE | Milestone 2: setup, Cartesia features used, known limitations |

## Tasks

### Task 1: Scaffold (20 min)
- **Action**:
  - `git init`, then set up Vite + React + TypeScript and an Express server run with `tsx`.
  - `npm run dev` starts both.
  - Add a health route at `/api/health`.
  - Add `.env.example`.
- **Mirror**: the conventions table above.
- **Validate**: `npm run dev` serves the page, and `curl localhost:8787/api/health` returns `{"ok":true}`.

### Task 2: Voice clone with spoken consent (60 min, the first real risk, so do it early)
- **Action**:
  - `VoiceSetup` shows the recording script below and counts down 3-2-1.
  - It records for 30–60 seconds through the browser's MediaRecorder (webm) and sends the clip to `POST /api/voice`.
  - Demo in Chrome: it records webm. Safari records mp4, which isn't on Cartesia's list of clone formats.
  - The server forwards it to Cartesia's `/voices/clone`, which returns the voice ID.
  - The ID is saved to the profile, then the app plays a short sample in the new voice.
- **Mirror**: the Errors convention. Map a mic permission denial and a Cartesia 4xx to friendly messages.
- **Validate**: clone your own voice. The sample should sound like you. If it doesn't, re-record somewhere quieter before moving on.

**Recording script** (about 45 seconds read calmly; the first line is the consent sentence):
> "My name is ___, and I'm recording my own voice so Tuck can read bedtime stories to my child.
> Once upon a time, in a cozy little house at the edge of a quiet forest, a sleepy bunny curled up under a soft blue blanket. Outside, the moon was round and bright, and the stars blinked slowly, one by one. The wind hummed a gentle song through the trees. The bunny took a big, slow breath in… and a long, slow breath out. Everything was warm, and soft, and still. Goodnight, little one. I love you so much. Sweet dreams."

### Task 3: Story generation with content rules and a fallback (60 min)
- **Action**:
  - `POST /api/story` takes `TonightInput`: the child's name and age, the comfort toy, a moment from today, what the child calls the parent ("Mama", "Daddy", "Papa"), and the parent's goodnight words.
  - It calls `claude-sonnet-5-5` with the content rules below and asks for JSON output: `{ title, paragraphs: [{ phase: "hello" | "adventure" | "winddown" | "goodnight", text }] }`.
  - `checkStory()` verifies the result. If it fails, retry once, then fall back to `fallbackStory()`.
- **Mirror**: the Errors convention. The parent sees "Using a ready-made story tonight" instead of an error.
- **Validate**:
  - `npm test` covers `checkStory` on a valid story, a story missing the sign-off, one too long and one malformed, plus `fallbackStory` filling every field.
  - Generate 10 stories and read them against the rules (a PRD success metric).

**Content rules** (become the system prompt):
- Calm, warm, simple words for a 2–4-year-old. Sentences get shorter as the story goes on.
- Weave in the child's name, the comfort toy and today's moment, gently.
- Nothing scary or tense: no villains, danger, getting lost, monsters, loud noises, illness or injury.
- Don't mention the parent being away, sad or missing the child. Make no promises about when the parent will be home or what will happen tomorrow. The story can't know that; the parent's own goodnight words can say it.
- No questions that expect an answer, so the child isn't prompted to talk back.
- No brands, screens or sugary treats.
- Speak as the parent, using the name the child calls them ("Mama loves you").
- Structure: 1 "hello" paragraph, 2–3 "adventure", 2 "winddown", then a final "goodnight" paragraph that ends with the parent's goodnight words exactly as written.
- 300–450 words in total, which comes to about 3–4 minutes at bedtime pace.

### Task 4: Pacing, text-to-speech and preparing tonight's audio (60 min)
- **Action**:
  - `pacingFor()` drops speed from 1.0 to 0.7 and volume from 1.0 to 0.6 across the paragraphs.
  - Emotion follows the phase: hello `affectionate` → adventure `content` → winddown `calm` → goodnight `peaceful`.
  - `POST /api/tts` takes `{ text, voiceId, speed, volume, emotion }` and returns MP3.
  - When the parent approves the story, the app makes every paragraph's audio in turn, shows progress, and stores the clips in IndexedDB.
- **Mirror**: the Logging convention for each paragraph (`[tts] 3/7 ok 412ms`).
- **Validate**:
  - `npm test` checks that `pacingFor` starts at 1.0, ends at 0.7, only ever decreases and stays within Cartesia's ranges.
  - Preparing a 7-paragraph story finishes in under 30 seconds.

### Task 5: Kid mode playback and nightlight fade (60 min)
- **Action**:
  - Fullscreen, dark background, the cartoon parent centered and gently breathing.
  - A single tap anywhere starts playback. The tap also satisfies the browser's rule that audio can't start without a click.
  - Play the cached clips back to back through Web Audio.
  - Over roughly the first 60% of the story, a dimming layer fades the screen to a warm amber glow.
  - Over the last 40%, `sleepiness` rises from 0 to 1.
  - After the goodnight paragraph, start the brown noise, fading out over about 10 minutes.
  - Exit by holding Esc (or the top-left corner) for 3 seconds, so a toddler can't leave by accident.
- **Mirror**: the Errors convention. A missing clip is skipped silently, and kid mode never shows an error.
- **Validate**: run the full story with Wi-Fi off. Tap to first word is under 1 second, and the fade and sleepiness progress smoothly.

### Task 6: The cartoon parent (60 min)
- **Action**:
  - Build `ParentAvatar` as an SVG: round face, a choice of 6 skin tones, 5 hair styles with colors, optional glasses and beard, rosy cheeks.
  - The mouth opening follows `mouthOpen`, smoothed from the audio volume in `amplitude.ts`.
  - It blinks every 3–6 seconds, and its eyelids droop as `sleepiness` rises. At sleepiness 1 the eyes close and a small moon appears.
  - The story's paragraph timing drives `sleepiness`.
- **Mirror**: the Naming convention; props are documented in `shared/types.ts`.
- **Validate**: watch the mouth move with speech and stop during pauses. The cartoon visibly falls asleep at the end.

### Task 7: Avatar builder and optional selfie autofill (45 min)
- **Action**:
  - `AvatarBuilder` has pickers with a live preview.
  - Optional: upload a selfie to `POST /api/avatar`, where `claude-haiku-5-5` (which can read images) returns `AvatarParams` to fill in the pickers. The photo is never saved.
- **Mirror**: the Errors convention. If the selfie step fails, the parent just uses the pickers.
- **Validate**: a selfie fills in sensible choices, and the manual pickers work on their own.

### Task 8: Delete voice, error states and offline (45 min)
- **Action**:
  - "Delete my voice" calls `DELETE /api/voice/:id` (verify the Cartesia endpoint first) and then clears the profile and cached audio.
  - Add friendly error states across the parent screens.
  - Pre-bake one demo story in your voice into the cache, as a judging fallback.
- **Mirror**: the Errors convention.
- **Validate**: after deleting, Cartesia no longer lists the voice (`GET /voices`), and the app is back at Setup. With Wi-Fi off, the demo story still plays.

### Task 9 (optional): Check the consent sentence with speech-to-text (45 min)
- **Action**: run the recording through Cartesia's speech-to-text (verify the endpoint first). Only clone if the consent sentence is in the transcript.
- **Validate**: a recording without the consent sentence is rejected with a clear message.

## Validation
```bash
npm run typecheck
npm test
npm run build
npm run dev   # then the manual demo script: clone → avatar → tonight → kid mode with Wi-Fi off
```

## Tonight's schedule (all milestones)
| Time | Work |
|---|---|
| 8:00–8:20 PM | Task 1. Get a valid Anthropic key from the Anthropic booth or console.anthropic.com. Text 2–3 parents the open questions. |
| 8:20–9:20 | Task 2. Voice clone (the biggest unknown, so it goes first) |
| 9:20–10:20 | Task 3. Story |
| 10:20–11:20 | Task 4. Text-to-speech and preparing audio |
| 11:20 PM–12:20 AM | Task 5. Kid mode |
| 12:20–1:20 | Task 6. Cartoon parent |
| 1:20–1:50 | Devpost draft (the guide recommends a Saturday-night draft). Commit and push to GitHub. |
| 1:50–5:30 | Sleep. You'll be pitching this to judges in person. |
| 5:30–6:15 | Task 7. Avatar builder |
| 6:15–7:00 | Task 8. Delete, error states, offline |
| 7:00–7:45 | README (milestone 2), then `/code-review` and fix what it finds |
| 7:45–8:30 | Record a backup demo video. Rehearse the 2-minute pitch and cloning a judge live. |
| 8:30–8:45 | Final Devpost submission (deadline 9:00) |
| 10:30 | Judging. Be at your table. |

**Cut order if behind** (cut the first item first):
1. milestone 3
2. task 9
3. selfie autofill
4. brown noise
5. paragraph-by-paragraph emotion (keep only the speed)

Never cut:
- consent
- parent preview
- delete voice
- offline playback

## Milestone 2 checklist (ready for judges)
- [ ] README: what Tuck is, setup (`.env.example`, `npm run dev`), Cartesia features used (instant clone, sonic-3.6, speed, volume and emotion via `generation_config`), how Claude is used and where it could go wrong, known limitations
- [ ] Devpost: tracks to enter are Cartesia, Anthropic, Meta (Bringing People Closer Together with AI) and Best People-First Hack
- [ ] Pitch (2 minutes, demo first): a 15-second hook with a real parent's quote, the live demo (clone → kid mode), the responsible-design points (consent, preview, delete, no live improvising, screen fades), then what's next
- [ ] Judge moment: with their OK, clone a judge's voice and play a short story. Pre-baked story ready as a fallback.
- [ ] No keys in the repo (`git grep sk_car` returns nothing)

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| No working Anthropic key | Medium | The fallback story templates (task 3) keep the demo working. Get a key before 9:20 PM. |
| A clone recorded in a noisy venue sounds wrong | High | Record in a quiet corner or outside for 45–60 seconds, in a calm voice. Test in task 2 before building anything else on it. |
| The browser blocks audio until a click | High | Kid mode only starts audio from the tap |
| Mouth movement looks robotic | Medium | Smooth the volume reading and add a small minimum mouth opening while speech is playing |
| Cartesia credits run out | Low | Cached audio means each story is generated only once. Check usage on play.cartesia.ai. |
| The project folder gets deleted | Medium | It's in a temporary folder right now. Move it to a real folder before task 1. |

## ECC usage
- `/code-review` once at 7:00 AM.
- `/build-fix` if the build breaks.
- Write tests first only for the pure logic in `shared/`. Skip that for the UI; check it by hand in the browser.
- The GateGuard hook is on. Turn it off for speed (`ECC_GATEGUARD=off`) or leave it on.

## Acceptance
- [ ] Tasks 1–8 complete
- [ ] `npm run typecheck`, `npm test` and `npm run build` pass
- [ ] Demo script passes with Wi-Fi off
- [ ] Every PRD MVP item is demonstrable
- [ ] Conventions above followed throughout
