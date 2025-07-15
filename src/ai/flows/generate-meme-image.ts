'use server';

/**
 * @fileOverview An AI agent that generates a crypto-themed meme image.
 *
 * - generateMemeImage - A function that generates a background image for a crypto meme.
 * - GenerateMemeImageOutput - The return type for the generateMemeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMemeImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated crypto meme background image as a data URI."
    ),
});
export type GenerateMemeImageOutput = z.infer<typeof GenerateMemeImageOutputSchema>;

export async function generateMemeImage(): Promise<GenerateMemeImageOutput> {
  return generateMemeImageFlow();
}

const generateMemeImageFlow = ai.defineFlow(
  {
    name: 'generateMemeImageFlow',
    outputSchema: GenerateMemeImageOutputSchema,
  },
  async () => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: 'A background image for a cryptocurrency meme. Examples: Dogecoin, Bitcoin chart crashing, HODL guy, Pepe the frog in a suit. The image should be funny and visually interesting.',
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
