'use server';

/**
 * @fileOverview An AI agent that generates a crypto-themed meme image.
 *
 * - generateMemeImage - A function that generates a background image for a crypto meme.
 * - GenerateMemeImageOutput - The return type for the generateMemeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {GenerateSafeJokeInput} from './generate-safe-joke';

const GenerateMemeImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated crypto meme background image as a data URI."
    ),
});
export type GenerateMemeImageOutput = z.infer<typeof GenerateMemeImageOutputSchema>;

export async function generateMemeImage(input: Pick<GenerateSafeJokeInput, 'category' | 'safeForWork'>): Promise<GenerateMemeImageOutput> {
  return generateMemeImageFlow(input);
}

const generateMemeImageFlow = ai.defineFlow(
  {
    name: 'generateMemeImageFlow',
    inputSchema: z.object({
      category: z.string(),
      safeForWork: z.boolean(),
    }),
    outputSchema: GenerateMemeImageOutputSchema,
  },
  async (input) => {
    let prompt = '';
    if (input.category === 'crypto memes') {
      prompt = `Generate a background image for a cryptocurrency meme. Use a rotating, random pool of crypto-themed templates like "Buy the dip", "Rugpull", "HODL", Satoshi Wojak, Elon Musk memes, or NFT fails. Vary the styles: chart memes, deep-fried memes, surreal edits, vaporwave, pixelated, rage comics.
      ${input.safeForWork ? 'The meme must be safe-for-work and use only light humor.' : 'You are in Degen Mode. The meme can be edgy or satirical.'}`;
    } else if (input.category === 'edgy memes') {
      prompt = `Generate a background image for a popular, currently trending edgy internet meme. Use templates like Wojak variants, Chad vs Virgin, Gru's Plan, etc. Do not reuse images from the crypto category.
      ${input.safeForWork ? 'The meme must be safe-for-work. Use templates tagged as "sfw" or "family".' : 'You are in Degen Mode. Pull from an "edgy", "dark", or "nsfw-memes" template pool. The template can include profanity or sensitive topics.'}`;
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media) {
      throw new Error('Image generation failed.');
    }
    
    return {imageDataUri: media.url};
  }
);
