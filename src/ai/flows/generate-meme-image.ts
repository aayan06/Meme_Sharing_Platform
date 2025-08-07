
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
   textPlacement: z.object({
        top: z.object({
            x: z.number().describe("X coordinate for top text block (percentage)."),
            y: z.number().describe("Y coordinate for top text block (percentage)."),
            width: z.number().describe("Width of the top text block (percentage)."),
            height: z.number().describe("Height of the top text block (percentage)."),
        }),
        bottom: z.object({
            x: z.number().describe("X coordinate for bottom text block (percentage)."),
            y: z.number().describe("Y coordinate for bottom text block (percentage)."),
            width: z.number().describe("Width of the bottom text block (percentage)."),
            height: z.number().describe("Height of the bottom text block (percentage)."),
        }),
    }).describe("Coordinates for placing the text on the image to avoid key features.").optional(),
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
    let prompt = '';
    
    const baseInstructions = `
      You are an AI assistant that generates a single, high-quality background image for a classic meme based on this joke: "${input.joke}".
      
      **CRITICAL RULES FOR THE IMAGE:**
      1.  **NO TEXT AT ALL**: The image MUST be a clean background with ABSOLUTELY NO text, letters, captions, subtitles, signs, or watermarks. It is a blank template. Any image containing any form of text is a failure and is unacceptable, as the user will add their own text later.
      2.  **RELEVANCE**: The image content and emotion MUST directly relate to the joke's theme.
      3.  **HIGH QUALITY**: The image must be clear, high-resolution, and suitable for adding text on top.
      4.  **SPELLING & GRAMMAR**: Ensure any text you process internally is spelled correctly.
    `;

    if (input.category === 'crypto memes') {
      prompt = `
        ${baseInstructions}
        **Theme**: Cryptocurrency. Think charts, popular crypto symbols (like Doge, Pepe), or characters representing traders. The visuals should capture the high-energy, volatile, and often absurd spirit of crypto culture.
        ${input.safeForWork ? 'The image must be safe-for-work.' : ''}
      `;
    } else if (input.category === 'edgy memes') {
      prompt = `
        ${baseInstructions}
        **Theme**: Edgy & Dark Humor. The image should be surreal, grim, satirical, or darkly humorous to match the joke.
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
