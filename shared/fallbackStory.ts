import type { SceneId, Story, StoryParagraph, TonightInput } from './types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "We saw giraffes" reads as "...today: we saw giraffes"; leave "I" and acronyms alone.
const midSentence = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

interface Fill {
  child: string;
  title: string;
  toy: string;
  moment: string;
  goodnight: string;
}

type Template = {
  title: string;
  paragraphs: [StoryParagraph['phase'], SceneId, (f: Fill) => string][];
};

const TEMPLATES: Template[] = [
  {
    title: 'The Cloud Boat',
    paragraphs: [
      ['hello', 'bedroom', (f) => `Hi, ${f.child}. It's ${f.title}. I'm right here with you, and ${f.toy} is right here too, all snuggled up and ready. Let's get cozy for a story, nice and slow.`],
      ['adventure', 'clouds', (f) => `Tonight, you and ${f.toy} climb into a little boat made of soft white cloud. It floats up, up, up, as gentle as a feather on the breeze. The sky is the color of blueberries, and the stars blink hello, one by one.`],
      ['adventure', 'moon', (f) => `The cloud boat drifts past the big round moon. The moon smiles a silver smile and whispers, goodnight, ${f.child}. Far below, the houses glow like tiny lanterns. ${f.moment}`],
      ['adventure', 'forest', (f) => `The boat floats down over a quiet forest, and a family of fireflies rises up to say hello, glowing soft and yellow. They hum a little song that sounds like a lullaby. You and ${f.toy} hum along, very softly, mmm, mmm, mmm.`],
      ['winddown', 'clouds', (f) => `The boat rocks slowly, side to side, side to side. ${cap(f.toy)} gives a big, sleepy yawn. You breathe in, slow and deep… and out, long and soft. In, slow and deep… and out, long and soft.`],
      ['winddown', 'moon', () => `The stars dim down, one by one. The cloud is warm and soft, just like your blanket. Your arms feel heavy. Your legs feel heavy. Your eyes feel heavy too. Everything is quiet, and soft, and still.`],
      ['goodnight', 'bedroom', (f) => `The cloud boat carries you gently home and tucks you into your very own bed. ${cap(f.title)} loves you so much, ${f.child}. ${f.goodnight}`],
    ],
  },
  {
    title: 'The Quiet Garden',
    paragraphs: [
      ['hello', 'bedroom', (f) => `Hello, ${f.child}. It's ${f.title}. Snuggle in close with ${f.toy}, and get nice and comfy. It's time for a quiet little story, just for you.`],
      ['adventure', 'garden', (f) => `Behind a little gate, there is a little garden, and tonight it is just for you and ${f.toy}. The flowers are closing their petals, one by one, like tiny sleepy hands folding up for the night.`],
      ['adventure', 'garden', () => `A slow, friendly snail slides by and says hello. A soft little owl blinks from a branch, once, twice. The grass is cool and gentle under your feet, and the air smells like rain and roses.`],
      ['adventure', 'pond', (f) => `You and ${f.toy} sit by a tiny pond. The water is so still that the moon can see itself, round and bright. ${f.moment}`],
      ['winddown', 'garden', () => `You lie down on a blanket of soft green moss. Above you, the moon glows like a nightlight. Breathe in, slow… and breathe out, slower. Breathe in, slow… and breathe out, slower still.`],
      ['winddown', 'garden', (f) => `The owl tucks its head under its wing. The snail curls up in its shell. ${cap(f.toy)} closes their eyes. The garden is sleeping now, and you are getting sleepy too, warm and safe and sleepy.`],
      ['goodnight', 'bedroom', (f) => `Goodnight, garden. Goodnight, owl. Goodnight, moon. Now it's time to close your eyes. ${cap(f.title)} loves you so much, ${f.child}. ${f.goodnight}`],
    ],
  },
];

/** A ready-made story for when Claude is unavailable or its stories fail the checks. */
export function fallbackStory(input: TonightInput, variant = new Date().getDate()): Story {
  const template = TEMPLATES[Math.abs(variant) % TEMPLATES.length];
  const goodnight = /[.!?…]$/.test(input.goodnightWords) ? input.goodnightWords : `${input.goodnightWords}.`;
  const fill: Fill = {
    child: input.childName,
    title: input.parentTitle,
    toy: input.comfortToy || 'Little Bear',
    moment: input.todayMoment
      ? `You remember a happy part of today: ${midSentence(input.todayMoment.replace(/[.!]+$/, ''))}.`
      : 'You remember all the happy parts of today.',
    goodnight,
  };
  return {
    title: template.title,
    paragraphs: template.paragraphs.map(([phase, scene, text]) => ({ phase, scene, text: text(fill) })),
    source: 'fallback',
  };
}

export const FALLBACK_VARIANTS = TEMPLATES.length;
