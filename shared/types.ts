export type HairStyle = 'short' | 'curly' | 'long' | 'bun' | 'bald';

export interface AvatarParams {
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  glasses: boolean;
  beard: boolean;
}

/** Saved in localStorage under `tuck.profile.v1`. */
export interface FamilyProfile {
  parentName: string;
  /** What the child calls the parent: "Mama", "Daddy", "Papa". */
  parentTitle: string;
  childName: string;
  childAge: number;
  voiceId: string | null;
  avatar: AvatarParams;
}

export interface TonightInput {
  parentTitle: string;
  childName: string;
  childAge: number;
  comfortToy: string;
  todayMoment: string;
  /** Spoken word for word at the very end of the story. */
  goodnightWords: string;
}

export type StoryPhase = 'hello' | 'adventure' | 'winddown' | 'goodnight';

/** The illustrated place kid mode shows while a paragraph plays. */
export type SceneId = 'bedroom' | 'clouds' | 'moon' | 'garden' | 'pond' | 'forest';

export interface StoryParagraph {
  phase: StoryPhase;
  text: string;
  /** Missing on stories saved before scenes existed; see sceneFor(). */
  scene?: SceneId;
}

export interface Story {
  title: string;
  paragraphs: StoryParagraph[];
  source: 'claude' | 'fallback';
}

/** Cartesia generation_config for one paragraph. */
export interface Pacing {
  speed: number;
  volume: number;
  emotion: string;
}
