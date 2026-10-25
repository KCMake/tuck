import { useEffect, useRef, useState } from 'react';
import type { FamilyProfile } from '../../shared/types';
import { SAMPLE_VOICE_ID } from '../../shared/voices';
import { cloneVoice, deleteVoice, speak } from '../lib/api';
import { clearPrepared } from '../lib/audioCache';

const MIN_SECONDS = 20;
const MAX_SECONDS = 60;

type Phase = 'idle' | 'countdown' | 'recording' | 'review' | 'uploading' | 'sample';

interface Props {
  profile: FamilyProfile;
  onChange: (patch: Partial<FamilyProfile>) => void;
  onDone: () => void;
}

function recordingScript(parentName: string): string[] {
  return [
    `My name is ${parentName || '___'}, and I'm recording my own voice so Tuck can read bedtime stories to my child.`,
    'Once upon a time, in a cozy little house at the edge of a quiet forest, a sleepy bunny curled up under a soft blue blanket.',
    'Outside, the moon was round and bright, and the stars blinked slowly, one by one.',
    'The wind hummed a gentle song through the trees.',
    'The bunny took a big, slow breath in… and a long, slow breath out.',
    'Everything was warm, and soft, and still.',
    'Goodnight, little one. I love you so much. Sweet dreams.',
  ];
}

function formatSeconds(s: number) {
  const whole = Math.floor(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function VoiceSetup({ profile, onChange, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sampleRef = useRef<HTMLAudioElement | null>(null);

  const script = recordingScript(profile.parentName.trim());
  const canRecord = profile.parentName.trim().length > 0;
  const usingSample = profile.voiceId === SAMPLE_VOICE_ID;

  // 3-2-1, then start recording.
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      beginRecording();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Recording timer; stops by itself at MAX_SECONDS.
  useEffect(() => {
    if (phase !== 'recording') return;
    const started = Date.now();
    const t = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      setElapsed(s);
      if (s >= MAX_SECONDS) stopRecording();
    }, 200);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => () => (clipUrl ? URL.revokeObjectURL(clipUrl) : undefined), [clipUrl]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      sampleRef.current?.pause();
    },
    [],
  );

  async function startCountdown() {
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('audio/webm')) {
      setError("This browser can't record in a format Cartesia accepts. Open Tuck in Chrome.");
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError('Tuck needs your microphone. Allow it from the address bar, then try again.');
      return;
    }
    setCount(3);
    setPhase('countdown');
  }

  function beginRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setClip(blob);
      setClipUrl(URL.createObjectURL(blob));
      setPhase('review');
    };
    recorderRef.current = recorder;
    recorder.start(250);
    setElapsed(0);
    setPhase('recording');
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function playSample(voiceId: string) {
    try {
      const audio = await speak(
        `Hi ${profile.childName.trim() || 'sweetheart'}. It's ${profile.parentTitle.trim() || 'me'}. Let's get cozy for a story.`,
        voiceId,
        { speed: 0.9, emotion: 'affectionate' },
        'sample',
      );
      const url = URL.createObjectURL(audio);
      sampleRef.current?.pause();
      const el = new Audio(url);
      el.onended = () => URL.revokeObjectURL(url);
      sampleRef.current = el;
      await el.play();
    } catch {
      setError('Your voice is ready, but the sample didn\'t play. Try "Play again".');
    }
  }

  async function submitRecording() {
    if (!clip) return;
    setError(null);
    setPhase('uploading');
    try {
      const previous = profile.voiceId;
      const voiceId = await cloneVoice(clip, profile.parentName.trim());
      onChange({ voiceId });
      // Recording again replaces the old clone rather than leaving it in the account,
      // and tonight's story was recorded in the old voice, so it goes too.
      if (previous && previous !== SAMPLE_VOICE_ID) deleteVoice(previous).catch(() => undefined);
      if (previous) await clearPrepared();
      setDeletedNotice(null);
      setPhase('sample');
      await playSample(voiceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setPhase('review');
    }
  }

  function useSampleVoice() {
    onChange({ voiceId: SAMPLE_VOICE_ID });
    setClip(null);
    setClipUrl(null);
    setError(null);
    setDeletedNotice(null);
    setPhase('sample');
    void playSample(SAMPLE_VOICE_ID);
  }

  async function removeVoice() {
    if (!profile.voiceId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteVoice(profile.voiceId);
      await clearPrepared();
      onChange({ voiceId: null });
      setConfirmDelete(false);
      setDeletedNotice(
        usingSample ? 'Stopped using the sample voice.' : 'Your voice is deleted, along with every story recorded in it.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete your voice. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  function recordAgain() {
    sampleRef.current?.pause();
    setClip(null);
    setClipUrl(null);
    setError(null);
    setPhase('idle');
  }

  const busy = phase === 'countdown' || phase === 'recording' || phase === 'uploading';

  return (
    <>
      <section className="card">
        <h2>About your family</h2>
        <p className="lede">Tuck uses these to make tonight's story feel like yours.</p>
        <div className="fields">
          <label className="field">
            Your first name
            <input
              value={profile.parentName}
              disabled={busy}
              onChange={(e) => onChange({ parentName: e.target.value })}
              placeholder="Alex"
            />
          </label>
          <label className="field">
            What your child calls you
            <input
              value={profile.parentTitle}
              disabled={busy}
              onChange={(e) => onChange({ parentTitle: e.target.value })}
              placeholder="Mama, Daddy, Papa…"
            />
          </label>
          <label className="field">
            Your child's name
            <input
              value={profile.childName}
              disabled={busy}
              onChange={(e) => onChange({ childName: e.target.value })}
              placeholder="Mia"
            />
          </label>
          <label className="field">
            Their age
            <select
              value={profile.childAge}
              disabled={busy}
              onChange={(e) => onChange({ childAge: Number(e.target.value) })}
            >
              {[2, 3, 4, 5].map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Record your voice</h2>
        <p className="lede">
          Read the script below out loud. The first line is your consent: Tuck only makes a voice from someone reading
          it themselves.
        </p>

        {profile.voiceId && phase === 'idle' && (
          <div className="notice">
            {usingSample
              ? "You're using a sample voice, not yours. Record to replace it."
              : 'Your voice is ready. Recording again replaces it.'}
            {confirmDelete ? (
              <div role="group" aria-label="Confirm">
                <p>
                  {usingSample
                    ? "Stop using the sample voice? Tonight's recorded story goes too."
                    : 'Delete your voice? Tuck removes it from Cartesia, along with every story recorded in it. You can record again any time.'}
                </p>
                <div className="row">
                  <button className="btn danger" disabled={deleting} onClick={removeVoice}>
                    {deleting ? 'Deleting…' : usingSample ? 'Yes, stop using it' : 'Yes, delete my voice'}
                  </button>
                  <button className="btn secondary" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <div className="row">
                <button className="btn primary" onClick={onDone}>
                  Next: your cartoon
                </button>
                <button className="btn secondary" onClick={() => playSample(profile.voiceId!)}>
                  Play sample
                </button>
                <button className="btn danger" onClick={() => setConfirmDelete(true)}>
                  {usingSample ? 'Stop using the sample voice' : 'Delete my voice'}
                </button>
              </div>
            )}
          </div>
        )}

        {deletedNotice && !profile.voiceId && phase === 'idle' && (
          <p className="notice" role="status">
            {deletedNotice}
          </p>
        )}

        {(phase === 'idle' || phase === 'recording') && (
          <>
            {phase === 'idle' && (
              <ul className="tips">
                <li>Find a quiet spot, away from music and chatter.</li>
                <li>Read slowly, in the voice you use at bedtime. Tuck copies your tone.</li>
                <li>Keep going for at least {MIN_SECONDS} seconds. Up to a minute is even better.</li>
              </ul>
            )}
            {phase === 'recording' && (
              <div className="recbar" role="status">
                <span className="recdot" aria-hidden />
                Recording {formatSeconds(elapsed)} / {formatSeconds(MAX_SECONDS)}
              </div>
            )}
            <div className={phase === 'recording' ? 'script live' : 'script'}>
              {script.map((line, i) => (
                <p key={i} className={i === 0 ? 'consent' : undefined}>
                  {line}
                </p>
              ))}
            </div>
            <div className="row">
              {phase === 'idle' ? (
                <>
                  <button className="btn primary" disabled={!canRecord} onClick={startCountdown}>
                    {profile.voiceId && !usingSample ? 'Record again' : 'Start recording'}
                  </button>
                  {!profile.voiceId && (
                    <button className="btn secondary" onClick={useSampleVoice}>
                      Use a sample voice for now
                    </button>
                  )}
                </>
              ) : (
                <button className="btn primary" disabled={elapsed < MIN_SECONDS} onClick={stopRecording}>
                  {elapsed < MIN_SECONDS ? `Keep reading… ${Math.ceil(MIN_SECONDS - elapsed)}s` : 'Stop'}
                </button>
              )}
              {!canRecord && phase === 'idle' && <span className="muted">Add your first name first.</span>}
            </div>
          </>
        )}

        {phase === 'countdown' && (
          <div className="countdown" aria-live="assertive">
            {count || 'Go'}
          </div>
        )}

        {phase === 'review' && clipUrl && (
          <>
            <p>Have a listen. Use it if it's clear and quiet.</p>
            <audio controls src={clipUrl} />
            <div className="row">
              <button className="btn primary" onClick={submitRecording}>
                Use this recording
              </button>
              <button className="btn secondary" onClick={recordAgain}>
                Record again
              </button>
              {error && (
                <button className="btn secondary" onClick={useSampleVoice}>
                  Use the sample voice for now
                </button>
              )}
            </div>
          </>
        )}

        {phase === 'uploading' && <p role="status">Making your voice… this takes about ten seconds.</p>}

        {phase === 'sample' && profile.voiceId && (
          <>
            <p>
              {usingSample
                ? "This is a sample voice. Your own will replace it once you've recorded."
                : 'Does this sound like you?'}
            </p>
            <div className="row">
              <button className="btn primary" onClick={onDone}>
                {usingSample ? 'Next: your cartoon' : 'Yes, next: your cartoon'}
              </button>
              <button className="btn secondary" onClick={() => playSample(profile.voiceId!)}>
                Play again
              </button>
              <button className="btn secondary" onClick={recordAgain}>
                {usingSample ? 'Record my voice' : 'Record again'}
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
