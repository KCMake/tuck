import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { SCENES } from '../shared/scenes';
import { STORY_SYSTEM_PROMPT, storyRequest } from '../shared/storyRules';
import type { Story, TonightInput } from '../shared/types';

const MODEL = 'claude-opus-5-5';

const StorySchema = z.object({
  title: z.string(),
  paragraphs: z.array(
    z.object({
      phase: z.enum(['hello', 'adventure', 'winddown', 'goodnight']),
      text: z.string(),
      scene: z.enum(SCENES),
    }),
  ),
});

// Created on first use so the server still starts without a key.
let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

export const isAuthError = (err: unknown) => err instanceof Anthropic.AuthenticationError;

export async function writeStory(input: TonightInput): Promise<Story> {
  const response = await anthropic().beta.messages.parse(
    {
      model: MODEL,
      max_tokens: 16000,
      // If Claude declines, Anthropic re-runs the request on its recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: STORY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: storyRequest(input) }],
      output_config: { effort: 'medium', format: betaZodOutputFormat(StorySchema) },
    },
    { timeout: 60_000 },
  );
  if (response.stop_reason === 'refusal') {
    throw new Error(`Story request declined (${response.stop_details?.category ?? 'no category'})`);
  }
  if (!response.parsed_output) {
    throw new Error(`No story in the response (stop_reason ${response.stop_reason})`);
  }
  return { ...response.parsed_output, source: 'claude' };
}
