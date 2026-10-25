import { useEffect, useState } from 'react';
import type { FamilyProfile } from '../shared/types';
import KidMode from './kid/KidMode';
import { getHealth, type Health } from './lib/api';
import { loadPrepared, type PreparedStory } from './lib/audioCache';
import { loadProfile, saveProfile } from './lib/profile';
import AvatarBuilder from './parent/AvatarBuilder';
import Tonight from './parent/Tonight';
import VoiceSetup from './parent/VoiceSetup';

type Screen = 'voice' | 'cartoon' | 'tonight';

const STEPS: { id: Screen; label: string }[] = [
  { id: 'voice', label: '1 · Your voice' },
  { id: 'cartoon', label: '2 · Your cartoon' },
  { id: 'tonight', label: '3 · Tonight' },
];

export default function App() {
  const [profile, setProfile] = useState<FamilyProfile>(loadProfile);
  const [screen, setScreen] = useState<Screen>(() => (loadProfile().voiceId ? 'tonight' : 'voice'));
  const [health, setHealth] = useState<Health | null>(null);
  const [bedtime, setBedtime] = useState<PreparedStory | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ ok: false, cartesia: false, anthropic: false }));
  }, []);

  function updateProfile(patch: Partial<FamilyProfile>) {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  }

  function startBedtime() {
    // Fullscreen needs the click that got us here, so ask before anything async.
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    loadPrepared().then((prepared) => prepared && setBedtime(prepared));
  }

  if (bedtime) {
    return (
      <KidMode
        prepared={bedtime}
        avatar={profile.avatar}
        parentTitle={profile.parentTitle || 'your grown-up'}
        onExit={() => setBedtime(null)}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="moon" aria-hidden>
            ☾
          </span>
          Tuck
        </div>
        <nav className="steps" aria-label="Setup steps">
          {STEPS.map((s) => (
            <button
              key={s.id}
              className={screen === s.id ? 'step active' : 'step'}
              aria-current={screen === s.id ? 'step' : undefined}
              onClick={() => setScreen(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <HealthChip health={health} />
      </header>

      <main>
        {screen === 'voice' && (
          <VoiceSetup profile={profile} onChange={updateProfile} onDone={() => setScreen('cartoon')} />
        )}
        {screen === 'cartoon' && (
          <AvatarBuilder
            avatar={profile.avatar}
            onChange={(avatar) => updateProfile({ avatar })}
            onDone={() => setScreen('tonight')}
          />
        )}
        {screen === 'tonight' && (
          <Tonight profile={profile} onNeedSetup={() => setScreen('voice')} onStartBedtime={startBedtime} />
        )}
      </main>
    </div>
  );
}

function HealthChip({ health }: { health: Health | null }) {
  if (!health) return <span className="chip">Checking…</span>;
  if (!health.ok) return <span className="chip bad">Server offline</span>;
  return (
    <span className="chip">
      Voice <span className={health.cartesia ? 'ok' : 'bad'}>{health.cartesia ? '✓' : '✗'}</span>
      {' · '}
      Story <span className={health.anthropic ? 'ok' : 'bad'}>{health.anthropic ? '✓' : '✗'}</span>
    </span>
  );
}
