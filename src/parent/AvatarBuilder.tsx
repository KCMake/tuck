import type { AvatarParams, HairStyle } from '../../shared/types';
import ParentAvatar from '../kid/ParentAvatar';

interface Swatch {
  hex: string;
  name: string;
}

const SKIN_TONES: Swatch[] = [
  { hex: '#f6d3b3', name: 'Very light' },
  { hex: '#eebb91', name: 'Light' },
  { hex: '#d9a066', name: 'Medium' },
  { hex: '#b97a4e', name: 'Tan' },
  { hex: '#8d5a3b', name: 'Brown' },
  { hex: '#5c3a26', name: 'Deep' },
];

const HAIR_COLORS: Swatch[] = [
  { hex: '#1f1a17', name: 'Black' },
  { hex: '#3b2a20', name: 'Dark brown' },
  { hex: '#7a4b2a', name: 'Brown' },
  { hex: '#b5452f', name: 'Auburn' },
  { hex: '#e3c16f', name: 'Blonde' },
  { hex: '#9a9a9a', name: 'Gray' },
];

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'curly', label: 'Curly' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'bald', label: 'Bald' },
];

interface Props {
  avatar: AvatarParams;
  onChange: (avatar: AvatarParams) => void;
  onDone: () => void;
}

export default function AvatarBuilder({ avatar, onChange, onDone }: Props) {
  const set = (patch: Partial<AvatarParams>) => onChange({ ...avatar, ...patch });

  return (
    <section className="card">
      <h2>Your cartoon</h2>
      <p className="lede">
        Your child sees this while they hear your voice. It's a friendly drawing of you, on purpose: never a photo.
      </p>
      <div className="builder">
        <div className="builder-preview">
          <ParentAvatar avatar={avatar} />
        </div>
        <div>
          <Swatches label="Skin" swatches={SKIN_TONES} value={avatar.skinTone} onPick={(skinTone) => set({ skinTone })} />
          <fieldset className="picker">
            <legend>Hair</legend>
            <div className="segmented">
              {HAIR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={style.id === avatar.hairStyle ? 'on' : undefined}
                  aria-pressed={style.id === avatar.hairStyle}
                  onClick={() => set({ hairStyle: style.id })}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </fieldset>
          {(avatar.hairStyle !== 'bald' || avatar.beard) && (
            <Swatches
              label="Hair color"
              swatches={HAIR_COLORS}
              value={avatar.hairColor}
              onPick={(hairColor) => set({ hairColor })}
            />
          )}
          <fieldset className="picker">
            <legend>Extras</legend>
            <label className="toggle">
              <input type="checkbox" checked={avatar.glasses} onChange={(e) => set({ glasses: e.target.checked })} />
              Glasses
            </label>
            <label className="toggle">
              <input type="checkbox" checked={avatar.beard} onChange={(e) => set({ beard: e.target.checked })} />
              Beard
            </label>
          </fieldset>
        </div>
      </div>
      <div className="row">
        <button className="btn primary" onClick={onDone}>
          Next: tonight's story
        </button>
      </div>
    </section>
  );
}

function Swatches({
  label,
  swatches,
  value,
  onPick,
}: {
  label: string;
  swatches: Swatch[];
  value: string;
  onPick: (hex: string) => void;
}) {
  return (
    <fieldset className="picker">
      <legend>{label}</legend>
      <div className="swatches">
        {swatches.map((s) => (
          <button
            key={s.hex}
            type="button"
            className={s.hex === value ? 'swatch on' : 'swatch'}
            style={{ background: s.hex }}
            aria-label={`${label}: ${s.name}`}
            aria-pressed={s.hex === value}
            title={s.name}
            onClick={() => onPick(s.hex)}
          />
        ))}
      </div>
    </fieldset>
  );
}
