
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
      You are a meme generation expert. Your task is to generate a high-quality background image for a meme based on a provided joke.

      **CRITICAL RULES:**
      1.  **Image Content**: The generated image MUST be a clean, high-resolution background template. It must have NO pre-existing text, captions, or watermarks. The image should be a blank canvas for the joke.
      2.  **Visual Matching**: The background image's theme MUST visually match the tone and topic of the joke: "${input.joke}". For example, a joke about crashing prices should have a bear market chart background.
      3.  **Avoid Clutter**: DO NOT use random, cluttered, or abstract backgrounds. The image should support the text, not overpower it.
      4.  **Single Caption**: The final meme should only contain the single joke/caption provided. Do not add any other text.
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
