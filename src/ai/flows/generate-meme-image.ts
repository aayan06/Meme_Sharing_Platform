
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

export async function generateMemeImage(input: Pick<GenerateSafeJokeInput, 'category' | 'safeForWork' | 'joke'>): Promise<GenerateMemeImageOutput> {
  return generateMemeImageFlow(input);
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
    let prompt = '';

    const baseInstructions = `
      You are a Meme Background Generator AI. Your task is to generate a single, high-quality background image for a meme. The image should visually represent the provided joke.

      **CRITICAL RULES:**
      1.  **Generate, Don't Find**: You MUST generate a new image.
      2.  **NO TEXT**: The generated image MUST be completely clean and contain NO text, captions, subtitles, watermarks, or writing of any kind. It should be a blank template.
      3.  **Relevance is Key**: The image's content, characters, and emotion MUST directly relate to the topic and tone of the joke: "${input.joke}".
      4.  **High Quality**: The image must be clear and high-resolution.
      5.  **Single Image**: The output must be a single, complete image.
      6.  **Spelling and Grammar**: Ensure any implied text concepts are spelled correctly.
    `;

    if (input.category === 'crypto memes') {
      prompt = `
        ${baseInstructions}
        **Category**: Cryptocurrency Memes
        **Joke Context**: "${input.joke}"
        **Visual Theme**: The image MUST be related to cryptocurrency. Think rockets, charts (going up or down), coins like Bitcoin or Dogecoin, or characters like Pepe the Frog in a trading setup. The visuals should capture the volatile and high-energy spirit of crypto culture.
        ${input.safeForWork ? 'The image must be safe-for-work.' : 'The image can be edgy or satirical.'}
      `;
    } else if (input.category === 'edgy memes') {
      prompt = `
        ${baseInstructions}
        **Category**: Edgy Internet Memes & Dark Humor
        **Joke Context**: "${input.joke}"
        **Visual Theme**: The image MUST reflect dark humor or edgy, surreal situations. Generate an image inspired by popular dark meme formats (like Wojak variants, uncanny valley characters, or absurd scenarios) but without copying characters directly. The tone should be satirical, ironic, or grimly humorous.
        ${input.safeForWork ? 'The image must be safe-for-work.' : 'The image can be edgy, dark, or satirical.'}
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
      throw new Error('Image generation failed.');
    }
    
    return {imageDataUri: media.url};
  }
);
