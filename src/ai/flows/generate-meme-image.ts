
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
      You are a meme generation expert. Your task is to generate a high-quality meme image based on a provided joke.

      **CRITICAL RULES:**
      1.  **No Existing Text**: You MUST NOT use any background images that already contain text, captions, watermarks, subtitles, or signs. Only use clean, high-resolution images with NO existing text, so the new meme text is clearly readable. The image should be a blank template suitable for adding meme captions.
      2.  **Visual Matching**: The image's theme MUST visually match the tone and topic of the joke: "${input.joke}". For example, use a "bear market" chart for a joke about crashing coins.
      3.  **Clarity**: Avoid random, cluttered, or abstract backgrounds. The image must support the text, not overpower it.
      4.  **Single Image**: The output should be a single, complete image. Do not generate text separately.
    `;

    if (input.category === 'crypto memes') {
      prompt = `
        ${baseInstructions}
        **Category**: Cryptocurrency Memes
        **Joke**: "${input.joke}"
        **Template Pool**: Use a random, rotating selection of high-quality, crypto-themed templates. Examples include: "Buy the dip," "Rugpull," "HODL," Satoshi, Wojak, Pepe traders, Elon Musk, or NFT-related scenes.
        **Image Styles**: Vary the visual style. Consider chart memes, surreal edits, vaporwave aesthetics, or pixel art.
        ${input.safeForWork ? 'The meme must be safe-for-work and use only light humor.' : 'You are in Degen Mode. The meme can be edgy or satirical.'}
      `;
    } else if (input.category === 'edgy memes') {
      prompt = `
        ${baseInstructions}
        **Category**: Edgy Internet Memes
        **Joke**: "${input.joke}"
        **Template Pool**: Use popular, currently trending internet meme templates. Examples: Wojak variants (e.g., Soyjak, Trad-wife), Chad vs. Virgin, Gru's Plan, Distracted Boyfriend. DO NOT reuse images from the crypto category.
        ${input.safeForWork ? 'The meme must be safe-for-work. Use templates tagged as "sfw" or "family".' : 'You are in Degen Mode. The template can include profanity or sensitive topics.'}
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
