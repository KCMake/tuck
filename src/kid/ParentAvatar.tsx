import { useEffect, useState } from 'react';
import type { AvatarParams } from '../../shared/types';

interface Props {
  avatar: AvatarParams;
  /** 0 closed … 1 wide open, from the audio volume. */
  mouthOpen?: number;
  /** 0 awake … 1 asleep. Eyelids droop, then the moon comes out. */
  sleepiness?: number;
}

const INK = '#2a1f1f';
const MOUTH = '#5b2333';
const PAJAMAS = '#6f7fcf';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function useBlink(active: boolean): boolean {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setBlink(true);
          timer = window.setTimeout(() => {
            setBlink(false);
            schedule();
          }, 140);
        },
        3000 + Math.random() * 3000,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [active]);
  return active && blink;
}

function Eye({ cx, closed }: { cx: number; closed: number }) {
  if (closed > 0.85) {
    return (
      <path d={`M${cx - 8} 96 Q${cx} 102 ${cx + 8} 96`} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    );
  }
  const ry = 7.5 * (1 - closed);
  return (
    <g>
      <ellipse cx={cx} cy={96 + (7.5 - ry) * 0.5} rx="6.5" ry={Math.max(ry, 1)} fill={INK} />
      {ry > 3 && <circle cx={cx + 2} cy={93 + (7.5 - ry) * 0.6} r="1.8" fill="#fff" opacity="0.9" />}
    </g>
  );
}

function HairFront({ avatar }: { avatar: AvatarParams }) {
  const fill = avatar.hairColor;
  switch (avatar.hairStyle) {
    case 'short':
      return <path d="M44 92 C42 44 80 30 104 32 C134 34 160 52 156 92 C148 70 128 58 100 60 C76 60 56 70 44 92 Z" fill={fill} />;
    case 'long':
      return <path d="M44 104 C38 46 80 30 104 32 C136 34 164 54 156 104 C150 74 132 60 100 60 C72 60 52 74 44 104 Z" fill={fill} />;
    case 'bun':
      return (
        <g fill={fill}>
          <circle cx="100" cy="30" r="18" />
          <path d="M46 88 C46 46 80 36 102 36 C130 36 156 50 154 88 C146 68 128 60 100 60 C76 60 56 68 46 88 Z" />
        </g>
      );
    case 'curly':
      return (
        <g fill={fill}>
          {[
            [50, 82, 14],
            [58, 62, 16],
            [76, 46, 17],
            [100, 40, 18],
            [124, 46, 17],
            [142, 62, 16],
            [150, 82, 14],
          ].map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      );
    case 'bald':
      return <ellipse cx="82" cy="56" rx="14" ry="6" fill="#fff" opacity="0.15" />;
  }
}

/** The cartoon parent: a friendly, clearly-not-real drawing driven by the audio. */
export default function ParentAvatar({ avatar, mouthOpen = 0, sleepiness = 0 }: Props) {
  const sleepy = clamp01(sleepiness);
  const blink = useBlink(sleepy < 0.9);
  const lids = Math.max(blink ? 1 : 0, Math.pow(sleepy, 1.6));
  const open = clamp01(mouthOpen);
  const moon = clamp01((sleepy - 0.85) / 0.15);
  const browColor = avatar.hairStyle === 'bald' ? '#3b2a20' : avatar.hairColor;

  return (
    <svg viewBox="0 0 200 220" role="img" aria-label="Cartoon of the parent">
      <g className="breathe">
        {avatar.hairStyle === 'long' && (
          <path d="M38 92 C38 40 162 40 162 92 L166 168 C150 178 50 178 34 168 Z" fill={avatar.hairColor} />
        )}
        <path d="M30 220 C30 172 62 156 100 156 C138 156 170 172 170 220 Z" fill={PAJAMAS} />
        <path d="M86 157 L100 176 L114 157" fill="none" stroke="#5a69b5" strokeWidth="4" strokeLinejoin="round" />
        <rect x="88" y="136" width="24" height="26" rx="8" fill={avatar.skinTone} />
        <circle cx="44" cy="100" r="11" fill={avatar.skinTone} />
        <circle cx="156" cy="100" r="11" fill={avatar.skinTone} />
        <ellipse cx="100" cy="96" rx="56" ry="58" fill={avatar.skinTone} />
        <HairFront avatar={avatar} />

        <path d="M70 78 Q80 73 90 78" stroke={browColor} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M110 78 Q120 73 130 78" stroke={browColor} strokeWidth="4" fill="none" strokeLinecap="round" />
        <Eye cx={80} closed={lids} />
        <Eye cx={120} closed={lids} />
        {avatar.glasses && (
          <g stroke="#2b2b2b" strokeWidth="3" fill="rgba(255,255,255,0.08)">
            <circle cx="80" cy="96" r="14" />
            <circle cx="120" cy="96" r="14" />
            <path d="M94 96 Q100 92 106 96" fill="none" />
          </g>
        )}
        <circle cx="66" cy="116" r="9" fill="#ff8a8a" opacity="0.3" />
        <circle cx="134" cy="116" r="9" fill="#ff8a8a" opacity="0.3" />
        <path d="M100 100 Q95 110 102 112" stroke="rgba(0,0,0,0.25)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {avatar.beard && (
          <path
            d="M50 104 C52 150 76 160 100 160 C124 160 148 150 150 104 C144 128 126 140 100 140 C74 140 56 128 50 104 Z"
            fill={avatar.hairColor}
          />
        )}

        {open > 0.04 ? (
          <g>
            <ellipse cx="100" cy="129" rx={9 + open * 3} ry={2 + open * 9} fill={MOUTH} />
            {open > 0.4 && <ellipse cx="100" cy={131 + open * 4} rx="5" ry={open * 3} fill="#e0707a" />}
          </g>
        ) : sleepy > 0.9 ? (
          <path d="M93 129 Q100 133 107 129" stroke={MOUTH} strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M86 126 Q100 138 114 126" stroke={MOUTH} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
      </g>

      {moon > 0 && (
        <g opacity={moon} className="zzz">
          <path d="M172 14 A16 16 0 1 0 190 40 A12 12 0 1 1 172 14 Z" fill="#f6dc9a" />
          <text x="150" y="62" fontSize="14" fill="#f6dc9a" fontWeight="700">
            z
          </text>
          <text x="160" y="76" fontSize="10" fill="#f6dc9a" fontWeight="700">
            z
          </text>
        </g>
      )}
    </svg>
  );
}
