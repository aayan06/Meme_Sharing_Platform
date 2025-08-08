
'use server';

/**
 * @fileOverview An AI agent that generates a background image for a meme based on a joke.
 *
 * - generateMemeImage - A function that generates a background image for a meme.
 * - GenerateMemeImageOutput - The return type for the generateMemeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {GenerateSafeJokeInput} from './generate-safe-joke';

const GenerateMemeImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated meme background image as a data URI."
    ),
});
export type GenerateMemeImageOutput = z.infer<typeof GenerateMemeImageOutputSchema>;

export async function generateMemeImage(input: Pick<GenerateSafeJokeInput, 'category' | 'safeForWork' | 'joke'>): Promise<GenerateMemeImageOutput | null> {
  // Meme generation is only for specific categories
  if (input.category !== 'crypto memes' && input.category !== 'edgy memes') {
    return null;
  }

  try {
    return await generateMemeImageFlow(input);
  } catch (error) {
    console.error("Meme image generation flow failed:", error);
    return null;
  }
}

const generateMemeImageFlow = ai.defineFlow(
  {
    name: 'generateMemeImageFlow',
    inputSchema: z.object({
      category: z.string(),
      safeForWork: z.boolean(),
      joke: z.string(),
    }),
    outputSchema: GenerateMemeImageOutputSchema,
  },
  async (input) => {
    
    const baseInstructions = `
      **Critical rule: You must generate an image ONLY. The image MUST NOT contain any text, letters, or numbers.**
      The user will add text later. Your job is to create a background image.
    `;

    let prompt = '';
    if (input.category === 'crypto memes') {
      prompt = `
        ${baseInstructions}
        **Theme**: Generate a background image suitable for a cryptocurrency meme. Visuals can include charts, crypto symbols like Doge or Pepe, or characters representing traders, capturing the high-energy, volatile spirit of crypto culture.
        ${input.safeForWork ? 'The image must be safe-for-work.' : ''}
      `;
    } else if (input.category === 'edgy memes') {
      prompt = `
        ${baseInstructions}
        **Theme**: Generate a background image for an Edgy & Dark Humor meme. The image should be surreal, grim, satirical, or darkly humorous.
        ${input.safeForWork ? 'The image must be safe-for-work.' : 'The image can be visually dark or unsettling to match the edgy theme.'}
      `;
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media) {
      throw new Error('Image generation failed: No media object returned.');
    }
    
    return {imageDataUri: media.url};
  }
);
