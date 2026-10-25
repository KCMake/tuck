import { memo, useRef, useState, type ReactNode } from 'react';
import type { SceneId } from '../../shared/types';

export type ToyKind = 'bear' | 'bunny';

/** A bunny if the story mentions one, otherwise a teddy bear. */
export function toyKind(storyText: string): ToyKind {
  return /\b(bunny|bunnies|rabbit)\b/i.test(storyText) ? 'bunny' : 'bear';
}

interface Props {
  id: SceneId;
  toy: ToyKind;
  /** Taps make things react. Turned off once the story starts winding down. */
  interactive: boolean;
  /** The toy, the owl and the flowers close up for the night. */
  asleep: boolean;
}

type BodyProps = Omit<Props, 'id'>;

const W = 1600;
const H = 900;

// Seeded so stars and fireflies stay put between renders.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

type Effect = 'glow' | 'hop' | 'wiggle' | 'close';

/** Something the child can tap. It plays a short reaction while the story is still awake. */
function Tap({ effect, interactive, children }: { effect: Effect; interactive: boolean; children: ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);
  return (
    <g
      className={`tap tap-${effect}${playing ? ' on' : ''}`}
      onPointerDown={() => {
        if (!interactive) return;
        window.clearTimeout(timer.current);
        setPlaying(false);
        requestAnimationFrame(() => setPlaying(true));
        timer.current = window.setTimeout(() => setPlaying(false), 1300);
      }}
    >
      {children}
    </g>
  );
}

function SharedDefs() {
  return (
    <defs>
      <radialGradient id="glow-warm">
        <stop offset="0%" stopColor="#ffe3a0" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#ffe3a0" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow-moon">
        <stop offset="45%" stopColor="#fff4c9" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#fff4c9" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow-firefly">
        <stop offset="0%" stopColor="#fff6a6" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#d8ff7a" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function Sky({ id, stops }: { id: string; stops: [string, string, string] }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="60%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${id})`} />
    </>
  );
}

function Stars({
  seed,
  count,
  x = 0,
  y = 0,
  w = W,
  h = 600,
  interactive,
}: {
  seed: number;
  count: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  interactive: boolean;
}) {
  const r = seeded(seed);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const cx = x + r() * w;
        const cy = y + r() * h;
        const size = 1.5 + r() * 3;
        const star = (
          <circle
            cx={cx}
            cy={cy}
            r={size}
            fill="#fff8dc"
            className="twinkle"
            style={{ animationDelay: `${(r() * 4).toFixed(2)}s` }}
          />
        );
        // Every fifth star is a big enough target for a small finger.
        if (i % 5 !== 0) return <g key={i}>{star}</g>;
        return (
          <Tap key={i} effect="glow" interactive={interactive}>
            <circle cx={cx} cy={cy} r={30} fill="transparent" />
            {star}
          </Tap>
        );
      })}
    </g>
  );
}

function Moon({ x, y, r, face, interactive }: { x: number; y: number; r: number; face?: boolean; interactive: boolean }) {
  return (
    <Tap effect="glow" interactive={interactive}>
      <circle cx={x} cy={y} r={r * 1.9} fill="url(#glow-moon)" />
      <circle cx={x} cy={y} r={r} fill="#f7e7a8" />
      {face ? (
        <>
          <g stroke="#8a6d3b" strokeWidth={r * 0.045} fill="none" strokeLinecap="round">
            <path d={`M${x - r * 0.42} ${y - r * 0.05} q ${r * 0.14} ${r * 0.12} ${r * 0.28} 0`} />
            <path d={`M${x + r * 0.14} ${y - r * 0.05} q ${r * 0.14} ${r * 0.12} ${r * 0.28} 0`} />
            <path d={`M${x - r * 0.18} ${y + r * 0.28} q ${r * 0.18} ${r * 0.16} ${r * 0.36} 0`} />
          </g>
          <circle cx={x - r * 0.5} cy={y + r * 0.2} r={r * 0.1} fill="#f2a7a0" opacity="0.5" />
          <circle cx={x + r * 0.5} cy={y + r * 0.2} r={r * 0.1} fill="#f2a7a0" opacity="0.5" />
        </>
      ) : (
        <>
          <circle cx={x - r * 0.35} cy={y - r * 0.3} r={r * 0.14} fill="#ead48a" opacity="0.7" />
          <circle cx={x + r * 0.4} cy={y + r * 0.35} r={r * 0.1} fill="#ead48a" opacity="0.7" />
        </>
      )}
    </Tap>
  );
}

function Cloud({ x, y, s = 1, fill = '#d8d3f0', opacity = 0.85 }: { x: number; y: number; s?: number; fill?: string; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={opacity}>
      <ellipse cx="0" cy="0" rx="120" ry="42" />
      <circle cx="-55" cy="-20" r="45" />
      <circle cx="10" cy="-45" r="62" />
      <circle cx="70" cy="-15" r="42" />
    </g>
  );
}

function Drifting({ seconds, delay = 0, children }: { seconds: number; delay?: number; children: ReactNode }) {
  return (
    <g className="drift" style={{ animationDuration: `${seconds}s`, animationDelay: `${-delay}s` }}>
      {children}
    </g>
  );
}

function Toy({
  x,
  y,
  s = 1,
  kind,
  asleep,
  interactive,
}: {
  x: number;
  y: number;
  s?: number;
  kind: ToyKind;
  asleep: boolean;
  interactive: boolean;
}) {
  const fur = kind === 'bunny' ? '#efe4ee' : '#c48b5a';
  const soft = kind === 'bunny' ? '#f6b9d0' : '#e6c19b';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Tap effect="hop" interactive={interactive}>
        <g className="bob">
          {kind === 'bunny' ? (
            <>
              <ellipse cx="-20" cy="-108" rx="15" ry="42" fill={fur} />
              <ellipse cx="20" cy="-108" rx="15" ry="42" fill={fur} />
              <ellipse cx="-20" cy="-106" rx="7" ry="30" fill={soft} />
              <ellipse cx="20" cy="-106" rx="7" ry="30" fill={soft} />
            </>
          ) : (
            <>
              <circle cx="-34" cy="-80" r="17" fill={fur} />
              <circle cx="34" cy="-80" r="17" fill={fur} />
              <circle cx="-34" cy="-80" r="8" fill={soft} />
              <circle cx="34" cy="-80" r="8" fill={soft} />
            </>
          )}
          <ellipse cx="0" cy="20" rx="48" ry="52" fill={fur} />
          <ellipse cx="0" cy="26" rx="28" ry="32" fill={soft} />
          <ellipse cx="-44" cy="10" rx="14" ry="26" fill={fur} transform="rotate(25 -44 10)" />
          <ellipse cx="44" cy="10" rx="14" ry="26" fill={fur} transform="rotate(-25 44 10)" />
          <ellipse cx="-24" cy="70" rx="18" ry="12" fill={fur} />
          <ellipse cx="24" cy="70" rx="18" ry="12" fill={fur} />
          <circle cx="0" cy="-50" r="44" fill={fur} />
          <ellipse cx="0" cy="-36" rx="16" ry="12" fill={soft} />
          <ellipse cx="0" cy="-41" rx="5" ry="3.5" fill="#5b2333" />
          {asleep ? (
            <g stroke="#2a1f1f" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M-22 -55 q7 6 14 0" />
              <path d="M8 -55 q7 6 14 0" />
            </g>
          ) : (
            <>
              <circle cx="-15" cy="-56" r="5" fill="#2a1f1f" />
              <circle cx="15" cy="-56" r="5" fill="#2a1f1f" />
            </>
          )}
          <circle cx="-26" cy="-38" r="7" fill="#ff8a8a" opacity="0.35" />
          <circle cx="26" cy="-38" r="7" fill="#ff8a8a" opacity="0.35" />
        </g>
      </Tap>
    </g>
  );
}

function Fireflies({
  seed,
  count,
  x,
  y,
  w,
  h,
  interactive,
}: {
  seed: number;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
  interactive: boolean;
}) {
  const r = seeded(seed);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(${x + r() * w} ${y + r() * h})`}>
          <Tap effect="glow" interactive={interactive}>
            <g
              className="firefly"
              style={{ animationDelay: `${-(r() * 6).toFixed(2)}s`, animationDuration: `${(5 + r() * 4).toFixed(2)}s` }}
            >
              <circle r="24" fill="url(#glow-firefly)" />
              <circle r="4" fill="#fff7b0" />
            </g>
          </Tap>
        </g>
      ))}
    </g>
  );
}

function Flower({ x, y, color, closed, interactive }: { x: number; y: number; color: string; closed: boolean; interactive: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 Q -6 60 0 120" stroke="#3f7a5a" strokeWidth="6" fill="none" />
      <ellipse cx="-14" cy="70" rx="16" ry="7" fill="#3f7a5a" transform="rotate(-30 -14 70)" />
      <Tap effect="close" interactive={interactive}>
        <g transform={closed ? 'scale(0.55)' : undefined}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-20" rx="13" ry="22" fill={color} transform={`rotate(${a})`} />
          ))}
          <circle r="12" fill="#ffd36e" />
        </g>
      </Tap>
    </g>
  );
}

function Owl({ x, y, asleep, interactive }: { x: number; y: number; asleep: boolean; interactive: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Tap effect="wiggle" interactive={interactive}>
        <path d="M-38 -40 L-30 -70 L-14 -48 Z M38 -40 L30 -70 L14 -48 Z" fill="#7a5a43" />
        <ellipse cx="0" cy="0" rx="46" ry="58" fill="#8a6a4f" />
        <ellipse cx="0" cy="14" rx="30" ry="38" fill="#c9a882" />
        {asleep ? (
          <g stroke="#2a1f1f" strokeWidth="3.5" fill="none" strokeLinecap="round">
            <path d="M-28 -22 q10 8 20 0" />
            <path d="M8 -22 q10 8 20 0" />
          </g>
        ) : (
          <>
            <circle cx="-18" cy="-22" r="15" fill="#fff7e0" />
            <circle cx="18" cy="-22" r="15" fill="#fff7e0" />
            <circle cx="-18" cy="-21" r="7" fill="#2a1f1f" />
            <circle cx="18" cy="-21" r="7" fill="#2a1f1f" />
          </>
        )}
        <path d="M-6 -8 L6 -8 L0 4 Z" fill="#f2a541" />
        <ellipse cx="-14" cy="58" rx="9" ry="5" fill="#f2a541" />
        <ellipse cx="14" cy="58" rx="9" ry="5" fill="#f2a541" />
      </Tap>
    </g>
  );
}

function Snail({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="creep">
        <path d="M-60 20 Q -62 0 -34 0 L 40 0 Q 62 0 62 20 Z" fill="#b7c99a" />
        <path d="M-50 2 L -58 -26 M -40 2 L -44 -28" stroke="#b7c99a" strokeWidth="5" strokeLinecap="round" />
        <circle cx="-58" cy="-28" r="5" fill="#b7c99a" />
        <circle cx="-44" cy="-30" r="5" fill="#b7c99a" />
        <circle cx="10" cy="-22" r="34" fill="#c9875d" />
        <path d="M10 -22 m 0 -22 a 22 22 0 1 1 -22 22 a 14 14 0 1 1 14 -14 a 7 7 0 1 1 -7 7" stroke="#a5683f" strokeWidth="5" fill="none" />
      </g>
    </g>
  );
}

function Pine({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
      <rect x="-10" y="-20" width="20" height="40" />
      <polygon points="0,-260 -70,-120 70,-120" />
      <polygon points="0,-200 -95,-40 95,-40" />
      <polygon points="0,-130 -120,0 120,0" />
    </g>
  );
}

function PineRow({ seed, y, color, count, scale }: { seed: number; y: number; color: string; count: number; scale: number }) {
  const r = seeded(seed);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <Pine key={i} x={(i * W) / (count - 1) + (r() - 0.5) * 60} y={y + r() * 30} s={scale * (0.8 + r() * 0.5)} color={color} />
      ))}
    </g>
  );
}

function Mushroom({ x, y, s = 1, interactive }: { x: number; y: number; s?: number; interactive: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Tap effect="glow" interactive={interactive}>
        <circle cx="0" cy="30" r="90" fill="url(#glow-warm)" opacity="0.5" />
        <rect x="-34" y="-10" width="68" height="84" rx="18" fill="#f1e6d0" />
        <circle cx="0" cy="22" r="13" fill="#ffd36e" />
        <path d="M-12 74 L-12 50 Q 0 40 12 50 L 12 74 Z" fill="#a7826a" />
        <path d="M-90 4 Q 0 -120 90 4 Z" fill="#d9667a" />
        <circle cx="-40" cy="-30" r="9" fill="#fff" opacity="0.85" />
        <circle cx="10" cy="-52" r="11" fill="#fff" opacity="0.85" />
        <circle cx="48" cy="-18" r="8" fill="#fff" opacity="0.85" />
      </Tap>
    </g>
  );
}

function Bedroom({ toy, interactive, asleep }: BodyProps) {
  return (
    <>
      <rect width={W} height={H} fill="#2b2650" />
      <Stars seed={3} count={30} h={650} interactive={false} />
      <rect y="690" width={W} height="210" fill="#3a2f55" />
      <ellipse cx="560" cy="805" rx="440" ry="62" fill="#4a3b6a" />

      {/* Window onto the night */}
      <rect x="1060" y="130" width="380" height="300" rx="18" fill="#e9d8b4" />
      <rect x="1078" y="148" width="344" height="264" rx="10" fill="#141838" />
      <Stars seed={7} count={14} x={1090} y={160} w={320} h={240} interactive={interactive} />
      <Moon x={1350} y={225} r={42} interactive={interactive} />
      <rect x="1246" y="148" width="8" height="264" fill="#e9d8b4" />
      <rect x="1078" y="276" width="344" height="8" fill="#e9d8b4" />
      <path d="M1040 110 Q 1090 280 1050 460 L 1010 460 L 1010 110 Z" fill="#8c79c9" opacity="0.9" />
      <path d="M1460 110 Q 1410 280 1450 460 L 1490 460 L 1490 110 Z" fill="#8c79c9" opacity="0.9" />

      {/* Bed */}
      <rect x="150" y="400" width="110" height="330" rx="30" fill="#8a6a9f" />
      <rect x="150" y="610" width="720" height="120" rx="20" fill="#6d528a" />
      <rect x="180" y="572" width="680" height="70" rx="30" fill="#e8e2f5" />
      <ellipse cx="330" cy="566" rx="90" ry="40" fill="#ffffff" />
      <path d="M420 560 Q 640 520 860 560 L 860 650 L 420 650 Z" fill="#7d8fd6" />
      {[480, 560, 640, 720, 800].map((cx, i) => (
        <circle key={cx} cx={cx} cy={590 + (i % 2) * 30} r="7" fill="#c9d2f5" opacity="0.7" />
      ))}
      <Toy x={600} y={490} s={0.85} kind={toy} asleep={asleep} interactive={interactive} />

      {/* Nightstand and lamp */}
      <rect x="890" y="600" width="140" height="130" rx="10" fill="#5d4677" />
      <Tap effect="glow" interactive={interactive}>
        <circle cx="960" cy="520" r="150" fill="url(#glow-warm)" opacity="0.55" />
        <rect x="952" y="540" width="16" height="60" fill="#cbb08a" />
        <path d="M910 540 L1010 540 L985 466 L935 466 Z" fill="#ffd9a0" />
      </Tap>
    </>
  );
}

function CloudsScene({ toy, interactive, asleep }: BodyProps) {
  return (
    <>
      <Sky id="clouds" stops={['#1d1f52', '#3a3070', '#6a4d86']} />
      <Stars seed={11} count={60} h={520} interactive={interactive} />
      <Drifting seconds={38}>
        <Cloud x={250} y={220} s={1.1} opacity={0.5} />
      </Drifting>
      <Drifting seconds={46} delay={12}>
        <Cloud x={1300} y={160} s={0.9} opacity={0.45} />
      </Drifting>
      <Drifting seconds={52} delay={20}>
        <Cloud x={1280} y={740} s={1.4} opacity={0.55} />
      </Drifting>
      <Drifting seconds={44} delay={6}>
        <Cloud x={280} y={770} s={1.6} opacity={0.6} />
      </Drifting>
      {/* The cloud boat */}
      <g transform="translate(800 540)">
        <g className="bob slow">
          <Toy x={0} y={-125} s={0.9} kind={toy} asleep={asleep} interactive={interactive} />
          <Cloud x={0} y={30} s={1.5} fill="#f1eefc" opacity={1} />
        </g>
      </g>
    </>
  );
}

function MoonScene({ toy, interactive, asleep }: BodyProps) {
  return (
    <>
      <Sky id="moon" stops={['#12123a', '#24205a', '#3b2d6e']} />
      <Stars seed={23} count={80} h={H} interactive={interactive} />
      <Moon x={1050} y={380} r={200} face interactive={interactive} />
      <Drifting seconds={50}>
        <Cloud x={1020} y={650} s={1.3} opacity={0.4} />
      </Drifting>
      <g transform="translate(470 580)">
        <g className="bob slow">
          <Toy x={0} y={-105} s={0.85} kind={toy} asleep={asleep} interactive={interactive} />
          <Cloud x={0} y={20} s={1.2} fill="#ebe7fb" opacity={1} />
        </g>
      </g>
    </>
  );
}

const FLOWERS: [number, number, string][] = [
  [980, 640, '#f7a8c4'],
  [1100, 690, '#f6d27a'],
  [1220, 630, '#b9a6f2'],
  [1340, 690, '#f7a8c4'],
  [1460, 650, '#9fd8e8'],
];

function GardenScene({ toy, interactive, asleep }: BodyProps) {
  return (
    <>
      <Sky id="garden" stops={['#1b2350', '#2c3466', '#3d4a72']} />
      <Stars seed={37} count={40} h={380} interactive={interactive} />
      <Moon x={1380} y={150} r={70} interactive={interactive} />
      <path d="M0 560 Q 400 470 800 540 T 1600 520 L1600 900 L0 900 Z" fill="#23443f" />
      <path d="M0 660 Q 500 600 1000 660 T 1600 650 L1600 900 L0 900 Z" fill="#2c5249" />
      <path d="M-20 270 Q 200 250 390 300" stroke="#4a3527" strokeWidth="22" fill="none" strokeLinecap="round" />
      <ellipse cx="380" cy="292" rx="34" ry="14" fill="#3f7a5a" transform="rotate(20 380 292)" />
      <ellipse cx="140" cy="250" rx="34" ry="14" fill="#3f7a5a" transform="rotate(-15 140 250)" />
      <Owl x={290} y={222} asleep={asleep} interactive={interactive} />
      {FLOWERS.map(([x, y, color]) => (
        <Flower key={x} x={x} y={y} color={color} closed={asleep} interactive={interactive} />
      ))}
      <Snail x={420} y={810} />
      <Fireflies seed={5} count={7} x={500} y={350} w={700} h={300} interactive={interactive} />
      <Toy x={720} y={710} s={0.9} kind={toy} asleep={asleep} interactive={interactive} />
    </>
  );
}

function PondScene({ toy, interactive, asleep }: BodyProps) {
  return (
    <>
      <Sky id="pond" stops={['#171c46', '#28285c', '#3a3a70']} />
      <Stars seed={41} count={50} h={360} interactive={interactive} />
      <Moon x={800} y={170} r={80} interactive={interactive} />
      <path d="M0 470 Q 300 400 600 450 T 1200 430 T 1600 450 L1600 900 L0 900 Z" fill="#1f3a40" />
      <Tap effect="glow" interactive={interactive}>
        <ellipse cx="800" cy="690" rx="720" ry="200" fill="#22305f" />
      </Tap>
      <ellipse cx="800" cy="600" rx="80" ry="16" fill="#f7e7a8" opacity="0.55" className="shimmer" />
      <ellipse cx="800" cy="632" rx="52" ry="8" fill="#f7e7a8" opacity="0.35" className="shimmer" />
      <ellipse cx="800" cy="656" rx="30" ry="5" fill="#f7e7a8" opacity="0.25" className="shimmer" />
      {[
        [90, 520],
        [130, 540],
        [1470, 530],
        [1510, 545],
      ].map(([x, y]) => (
        <g key={x}>
          <path d={`M${x} 900 Q ${x - 6} ${y + 120} ${x} ${y}`} stroke="#2f5a4a" strokeWidth="6" fill="none" />
          <ellipse cx={x} cy={y + 20} rx="9" ry="26" fill="#6b4a33" />
        </g>
      ))}
      <ellipse cx="560" cy="730" rx="100" ry="30" fill="#3f7a5a" />
      <ellipse cx="1080" cy="705" rx="72" ry="22" fill="#3f7a5a" />
      <ellipse cx="1260" cy="770" rx="60" ry="18" fill="#3f7a5a" />
      <Tap effect="glow" interactive={interactive}>
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="1080" cy="684" rx="10" ry="22" fill="#f7b6cf" transform={`rotate(${a} 1080 696)`} />
        ))}
        <circle cx="1080" cy="696" r="8" fill="#ffd36e" />
      </Tap>
      <g transform="translate(560 700)">
        <g className="bob slow">
          <Toy x={0} y={-30} s={0.72} kind={toy} asleep={asleep} interactive={interactive} />
        </g>
      </g>
      <Fireflies seed={9} count={5} x={200} y={420} w={1200} h={150} interactive={interactive} />
    </>
  );
}

function ForestScene({ toy, interactive, asleep }: BodyProps) {
  return (
    <>
      <Sky id="forest" stops={['#0f1a33', '#18294a', '#24395a']} />
      <Stars seed={53} count={45} h={330} interactive={interactive} />
      <PineRow seed={2} y={560} color="#15283f" count={13} scale={1} />
      <PineRow seed={4} y={690} color="#1a3350" count={9} scale={1.3} />
      <path d="M0 700 Q 800 640 1600 700 L1600 900 L0 900 Z" fill="#1e3b3c" />
      <path d="M690 900 Q 780 760 820 700 Q 860 760 970 900 Z" fill="#2c4a46" />
      <Mushroom x={330} y={720} interactive={interactive} />
      <Mushroom x={1250} y={740} s={0.8} interactive={interactive} />
      <Fireflies seed={17} count={12} x={150} y={300} w={1300} h={380} interactive={interactive} />
      <Toy x={810} y={700} s={0.85} kind={toy} asleep={asleep} interactive={interactive} />
    </>
  );
}

const BODIES: Record<SceneId, (props: BodyProps) => ReactNode> = {
  bedroom: Bedroom,
  clouds: CloudsScene,
  moon: MoonScene,
  garden: GardenScene,
  pond: PondScene,
  forest: ForestScene,
};

function SceneImpl({ id, ...body }: Props) {
  const Body = BODIES[id];
  return (
    <svg className="scene-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <SharedDefs />
      <Body {...body} />
    </svg>
  );
}

/** One full-screen storybook picture. Memoized: kid mode re-renders every frame for the mouth. */
export const Scene = memo(SceneImpl);
