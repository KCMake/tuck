import { useEffect, useMemo, useRef, useState } from 'react';
import { sceneFor } from '../../shared/scenes';
import type { AvatarParams, SceneId } from '../../shared/types';
import { createMouthMeter } from '../audio/amplitude';
import { startBrownNoise } from '../audio/brownNoise';
import type { PreparedStory } from '../lib/audioCache';
import ParentAvatar from './ParentAvatar';
import { Scene, toyKind } from './Scenes';

// Pauses between paragraphs grow as the story winds down.
const GAP_SECONDS = { start: 0.5, end: 1.4 };
// The screen has dimmed to a nightlight 60% of the way through. After that the cartoon
// gets sleepy and taps stop doing anything, so the story stops inviting play.
const DIM_BY = 0.6;
const SLEEPY_FROM = 0.6;
const HOLD_TO_EXIT_MS = 2500;
// Change the picture a moment before the paragraph's first word.
const SCENE_LEAD_SECONDS = 0.4;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Phase = 'waiting' | 'playing' | 'done';

interface Playback {
  ctx: AudioContext;
  raf: number;
  stopNoise?: () => void;
  wakeLock?: WakeLockSentinel;
}

interface Layer {
  key: number;
  id: SceneId;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
}

interface Props {
  prepared: PreparedStory;
  avatar: AvatarParams;
  parentTitle: string;
  onExit: () => void;
}

export default function KidMode({ prepared, avatar, parentTitle, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('waiting');
  const [frame, setFrame] = useState({ mouth: 0, progress: 0, paragraph: 0 });
  const [holding, setHolding] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const playback = useRef<Playback | null>(null);
  const holdTimer = useRef<number | null>(null);
  const nextKey = useRef(1);

  const paragraphs = prepared.story.paragraphs;
  const scenes = useMemo(() => paragraphs.map((p, i) => sceneFor(p, i, paragraphs.length)), [paragraphs]);
  const toy = useMemo(() => toyKind(paragraphs.map((p) => p.text).join(' ')), [paragraphs]);

  const sceneId: SceneId =
    (phase === 'done' ? scenes.at(-1) : phase === 'playing' ? scenes[frame.paragraph] : scenes[0]) ?? 'bedroom';

  // The new picture fades in over the old one; only the last two stay mounted.
  const [layers, setLayers] = useState<Layer[]>([{ key: 0, id: sceneId }]);
  useEffect(() => {
    setLayers((ls) => (ls.at(-1)?.id === sceneId ? ls : [...ls.slice(-1), { key: nextKey.current++, id: sceneId }]));
  }, [sceneId]);

  useEffect(() => stopPlayback, []);

  // Holding Escape also leaves (when the browser isn't using Escape to exit fullscreen).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.repeat) beginHold();
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) void start();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endHold();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

  function stopPlayback() {
    const p = playback.current;
    if (!p) return;
    cancelAnimationFrame(p.raf);
    p.stopNoise?.();
    p.wakeLock?.release().catch(() => undefined);
    p.ctx.close().catch(() => undefined);
    playback.current = null;
  }

  async function start() {
    if (phase !== 'waiting' || playback.current) return;
    setPhase('playing');

    // Created inside the tap, so the browser lets it make sound.
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.connect(ctx.destination);
    const meter = createMouthMeter(analyser);
    const p: Playback = { ctx, raf: 0 };
    playback.current = p;

    // If the display sleeps, the laptop can suspend and cut the story off. Keep it awake until exit.
    navigator.wakeLock
      ?.request('screen')
      .then((lock) => {
        if (playback.current === p) p.wakeLock = lock;
        else lock.release().catch(() => undefined);
      })
      .catch(() => undefined);

    // A clip that won't decode is skipped. Kid mode never shows an error.
    const decoded = await Promise.all(
      prepared.clips.map(async (clip, paragraph) => {
        try {
          return { buffer: await ctx.decodeAudioData(await clip.arrayBuffer()), paragraph };
        } catch {
          return null;
        }
      }),
    );
    if (playback.current !== p) return;
    const clips = decoded.filter((c): c is { buffer: AudioBuffer; paragraph: number } => c !== null);

    // Schedule the whole story on the audio clock so the pauses stay exact.
    const startAt = ctx.currentTime + 0.1;
    let at = startAt;
    const spoken: { from: number; to: number; paragraph: number }[] = [];
    clips.forEach(({ buffer, paragraph }, i) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      source.start(at);
      spoken.push({ from: at, to: at + buffer.duration, paragraph });
      const t = clips.length > 1 ? i / (clips.length - 1) : 1;
      at += buffer.duration + (i < clips.length - 1 ? GAP_SECONDS.start + (GAP_SECONDS.end - GAP_SECONDS.start) * t : 0);
    });
    const endAt = at;

    const tick = () => {
      const now = ctx.currentTime;
      const level = meter();
      if (now >= endAt) {
        setFrame((f) => ({ ...f, mouth: 0, progress: 1 }));
        setPhase('done');
        p.stopNoise = startBrownNoise(ctx, ctx.destination);
        return;
      }
      let paragraph = spoken[0]?.paragraph ?? 0;
      for (const s of spoken) if (now >= s.from - SCENE_LEAD_SECONDS) paragraph = s.paragraph;
      const speaking = spoken.some((s) => now >= s.from && now <= s.to);
      setFrame({ mouth: speaking ? level : 0, progress: clamp01((now - startAt) / (endAt - startAt)), paragraph });
      p.raf = requestAnimationFrame(tick);
    };
    p.raf = requestAnimationFrame(tick);
  }

  const interactive = phase === 'playing' && frame.progress < SLEEPY_FROM;

  // A tap anywhere sends up a puff of stars, until the story starts winding down.
  function sparkle(e: React.PointerEvent) {
    if (!interactive) return;
    const id = nextKey.current++;
    setSparkles((s) => [...s.slice(-5), { id, x: e.clientX, y: e.clientY }]);
    window.setTimeout(() => setSparkles((s) => s.filter((p) => p.id !== id)), 1500);
  }

  function beginHold() {
    if (holdTimer.current) return;
    setHolding(true);
    holdTimer.current = window.setTimeout(exit, HOLD_TO_EXIT_MS);
  }

  function endHold() {
    setHolding(false);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function exit() {
    endHold();
    stopPlayback();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    onExit();
  }

  const dim = phase === 'waiting' ? 0 : clamp01(frame.progress / DIM_BY);
  const sleepiness =
    phase === 'done' ? 1 : phase === 'waiting' ? 0 : clamp01((frame.progress - SLEEPY_FROM) / (1 - SLEEPY_FROM));
  const sceneAsleep = phase === 'done' || sleepiness > 0.5;

  return (
    <div
      className={`kid kid-${phase}`}
      style={{ '--dim': dim } as React.CSSProperties}
      onClick={() => void start()}
      onPointerDown={sparkle}
      role={phase === 'waiting' ? 'button' : undefined}
      aria-label={phase === 'waiting' ? `Tap to hear ${parentTitle}'s story: ${prepared.story.title}` : undefined}
    >
      <div className="scene-stack" aria-hidden>
        {layers.map((layer) => (
          <div key={layer.key} className="scene-layer">
            <Scene id={layer.id} toy={toy} interactive={interactive} asleep={sceneAsleep} />
          </div>
        ))}
      </div>
      <div className="nightlight" aria-hidden />
      <div className="kid-avatar">
        <ParentAvatar avatar={avatar} mouthOpen={frame.mouth} sleepiness={sleepiness} />
      </div>
      {phase === 'waiting' && <div className="tap-ring" aria-hidden />}
      {sparkles.map((s) => (
        <span key={s.id} className="sparkle" style={{ left: s.x, top: s.y }} aria-hidden>
          {[-70, -30, 0, 30, 70].map((dx) => (
            <i key={dx} style={{ '--dx': `${dx}px`, animationDelay: `${Math.abs(dx) / 400}s` } as React.CSSProperties} />
          ))}
        </span>
      ))}
      <button
        className={holding ? 'exit-corner holding' : 'exit-corner'}
        aria-label="Hold for three seconds to leave kid mode"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          e.stopPropagation();
          beginHold();
        }}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
      >
        Hold to exit
      </button>
    </div>
  );
}
