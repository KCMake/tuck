import { useEffect, useState } from 'react';
import { pacingFor } from '../../shared/pacing';
import { SCENES, SCENE_LABEL, sceneFor } from '../../shared/scenes';
import { wordCount } from '../../shared/storyRules';
import type { FamilyProfile, SceneId, Story, StoryParagraph, StoryPhase, TonightInput } from '../../shared/types';
import { SAMPLE_VOICE_ID } from '../../shared/voices';
import { demoBackupTitle, loadDemoBackup, saveDemoBackup, speak, writeStory } from '../lib/api';
import { loadPrepared, savePrepared, type PreparedStory } from '../lib/audioCache';

const DETAILS_KEY = 'tuck.tonight.v1';

type Details = Pick<TonightInput, 'comfortToy' | 'todayMoment' | 'goodnightWords'>;
const EMPTY_DETAILS: Details = { comfortToy: '', todayMoment: '', goodnightWords: '' };

function loadDetails(): Details {
  try {
    return { ...EMPTY_DETAILS, ...JSON.parse(localStorage.getItem(DETAILS_KEY) ?? '{}') };
  } catch {
    return EMPTY_DETAILS;
  }
}

function saveDetails(details: Details) {
  try {
    localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  } catch {
    // Same as profile.ts: storage can be blocked; the form still works.
  }
}

const PHASE_LABEL: Record<StoryPhase, string> = {
  hello: 'Hello',
  adventure: 'Adventure',
  winddown: 'Winding down',
  goodnight: 'Goodnight',
};

// Slow bedtime reading pace, for the "about N minutes" estimate.
const WORDS_PER_MINUTE = 110;

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.');

type Phase = 'form' | 'writing' | 'preview' | 'preparing' | 'ready';

interface Props {
  profile: FamilyProfile;
  onNeedSetup: () => void;
  onStartBedtime: () => void;
}

export default function Tonight({ profile, onNeedSetup, onStartBedtime }: Props) {
  const [details, setDetails] = useState<Details>(loadDetails);
  const [phase, setPhase] = useState<Phase>('form');
  const [story, setStory] = useState<Story | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [prepared, setPrepared] = useState<PreparedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoTitle, setDemoTitle] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);

  // A story prepared earlier is ready to go, even offline.
  useEffect(() => {
    loadPrepared().then((p) => {
      if (p) {
        setPrepared(p);
        setPhase('ready');
      }
    });
    demoBackupTitle().then(setDemoTitle);
  }, []);

  function update(patch: Partial<Details>) {
    setDetails((prev) => {
      const next = { ...prev, ...patch };
      saveDetails(next);
      return next;
    });
  }

  const missingFamily = !profile.childName.trim() || !profile.parentTitle.trim();
  const missingVoice = !profile.voiceId;
  const canWrite = details.goodnightWords.trim().length > 0;

  async function write() {
    setError(null);
    setNote(null);
    setPhase('writing');
    try {
      const result = await writeStory({
        parentTitle: profile.parentTitle,
        childName: profile.childName,
        childAge: profile.childAge,
        ...details,
      });
      setStory(result.story);
      setNote(result.note ?? null);
      setPhase('preview');
    } catch (e) {
      setError(errorText(e));
      setPhase('form');
    }
  }

  function editPart(index: number, patch: Partial<StoryParagraph>) {
    setStory((s) => s && { ...s, paragraphs: s.paragraphs.map((p, i) => (i === index ? { ...p, ...patch } : p)) });
  }

  async function approve() {
    if (!story || !profile.voiceId) return;
    if (story.paragraphs.some((p) => !p.text.trim())) {
      setError('Every part of the story needs some words.');
      return;
    }
    const voiceId = profile.voiceId;
    setError(null);
    setProgress(0);
    setPhase('preparing');
    try {
      const total = story.paragraphs.length;
      const clips: Blob[] = [];
      for (const [i, p] of story.paragraphs.entries()) {
        clips.push(await speak(p.text.trim(), voiceId, pacingFor(p.phase, i, total), `${i + 1}/${total}`));
        setProgress(i + 1);
      }
      const ready: PreparedStory = { story, voiceId, clips, preparedAt: Date.now() };
      await savePrepared(ready);
      setPrepared(ready);
      setPhase('ready');
    } catch (e) {
      setError(errorText(e));
      setPhase('preview');
    }
  }

  async function saveBackup() {
    if (!prepared) return;
    setError(null);
    setDemoStatus('Saving…');
    try {
      await saveDemoBackup(prepared);
      setDemoTitle(prepared.story.title);
      setDemoStatus('Saved. If anything goes wrong at the demo, load it from the Tonight screen.');
    } catch (e) {
      setDemoStatus(null);
      setError(errorText(e));
    }
  }

  async function loadBackup() {
    setError(null);
    try {
      const backup = await loadDemoBackup();
      await savePrepared(backup);
      setPrepared(backup);
      setPhase('ready');
    } catch (e) {
      setError(errorText(e));
    }
  }

  const errorLine = error && (
    <p className="error" role="alert">
      {error}
    </p>
  );

  const loadBackupButton = demoTitle && (
    <button className="btn secondary" onClick={loadBackup}>
      Load demo backup: “{demoTitle}”
    </button>
  );

  if ((missingFamily || missingVoice) && !(phase === 'ready' && prepared)) {
    return (
      <section className="card">
        <h2>Tonight's story</h2>
        <p className="lede">
          {missingVoice
            ? 'First, set up the voice Tuck reads in.'
            : "First, add your child's name and what they call you."}
        </p>
        <div className="row">
          <button className="btn primary" onClick={onNeedSetup}>
            Go to step 1
          </button>
          {loadBackupButton}
        </div>
        {errorLine}
      </section>
    );
  }

  if (phase === 'ready' && prepared) {
    const words = wordCount(prepared.story.paragraphs.map((p) => p.text).join(' '));
    return (
      <section className="card">
        <h2>Tonight's story is ready</h2>
        <p className="lede">
          “{prepared.story.title}”, about {Math.max(1, Math.round(words / WORDS_PER_MINUTE))} minutes, in{' '}
          {prepared.voiceId === SAMPLE_VOICE_ID ? 'the sample voice' : 'your voice'}. It plays without internet.
        </p>
        <p className="muted">
          Hand the laptop to whoever is doing bedtime. {profile.childName.trim() || 'Your child'} just taps your
          cartoon to begin.
        </p>
        <div className="row">
          <button className="btn primary" onClick={onStartBedtime}>
            Start bedtime
          </button>
          <button className="btn secondary" onClick={() => setPhase('form')}>
            Write a new story
          </button>
          <button className="btn secondary" onClick={saveBackup}>
            Save as demo backup
          </button>
        </div>
        {demoStatus && (
          <p className="muted" role="status">
            {demoStatus}
          </p>
        )}
        {errorLine}
      </section>
    );
  }

  if (phase === 'writing') {
    return (
      <section className="card">
        <h2>Tonight's story</h2>
        <p role="status">Writing a calm story about {profile.childName}'s day… this takes about twenty seconds.</p>
      </section>
    );
  }

  if (phase === 'preparing' && story) {
    const total = story.paragraphs.length;
    return (
      <section className="card">
        <h2>Recording tonight's story</h2>
        <p role="status">
          Recording part {Math.min(progress + 1, total)} of {total}…
        </p>
        <div className="progress" aria-hidden>
          <div style={{ width: `${(progress / total) * 100}%` }} />
        </div>
      </section>
    );
  }

  if (phase === 'preview' && story) {
    return (
      <section className="card">
        <div className="title-row">
          <h2>{story.title}</h2>
          <span className="chip">{story.source === 'claude' ? 'Written by Claude' : 'Ready-made story'}</span>
        </div>
        {note && <p className="notice">{note}</p>}
        <p className="lede">Read it through. Change any words you like before Tuck records it.</p>
        {profile.voiceId === SAMPLE_VOICE_ID && (
          <p className="notice">It will be read in the sample voice until you record your own.</p>
        )}
        {story.paragraphs.map((p, i) => (
          <div key={i} className="field story-part">
            <div className="part-head">
              <span id={`part-${i}`}>{PHASE_LABEL[p.phase]}</span>
              <select
                aria-label={`Picture for part ${i + 1}`}
                value={sceneFor(p, i, story.paragraphs.length)}
                onChange={(e) => editPart(i, { scene: e.target.value as SceneId })}
              >
                {SCENES.map((s) => (
                  <option key={s} value={s}>
                    {SCENE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              aria-labelledby={`part-${i}`}
              value={p.text}
              rows={Math.ceil(p.text.length / 75) + 1}
              onChange={(e) => editPart(i, { text: e.target.value })}
            />
          </div>
        ))}
        <div className="row">
          <button className="btn primary" onClick={approve}>
            Approve and record
          </button>
          <button className="btn secondary" onClick={write}>
            Write a different one
          </button>
          <button className="btn secondary" onClick={() => setPhase('form')}>
            Change details
          </button>
        </div>
        {errorLine}
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Tonight's story</h2>
      <p className="lede">
        A few words about today. Tuck writes a calm story from them, and you read it before bedtime.
      </p>
      <div className="fields">
        <label className="field">
          {profile.childName}'s comfort toy
          <input
            value={details.comfortToy}
            onChange={(e) => update({ comfortToy: e.target.value })}
            placeholder="Bunny"
          />
        </label>
        <label className="field">
          Your goodnight words
          <input
            value={details.goodnightWords}
            onChange={(e) => update({ goodnightWords: e.target.value })}
            placeholder="I love you to the moon and back."
          />
        </label>
      </div>
      <label className="field wide">
        One happy moment from today
        <textarea
          rows={2}
          value={details.todayMoment}
          onChange={(e) => update({ todayMoment: e.target.value })}
          placeholder="We saw the giraffes at the zoo"
        />
      </label>
      <p className="muted">Tuck ends every story with your goodnight words, exactly as you write them.</p>
      <div className="row">
        <button className="btn primary" disabled={!canWrite} onClick={write}>
          Write tonight's story
        </button>
        {prepared && (
          <button className="btn secondary" onClick={() => setPhase('ready')}>
            Back to tonight's ready story
          </button>
        )}
        {loadBackupButton}
      </div>
      {errorLine}
    </section>
  );
}
