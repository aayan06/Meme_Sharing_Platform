
'use server';

/**
 * @fileOverview An AI agent that finds a relevant, existing crypto-themed meme image online.
 *
 * - generateMemeImage - A function that finds a background image for a crypto meme.
 * - GenerateMemeImageOutput - The return type for the generateMemeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {GenerateSafeJokeInput} from './generate-safe-joke';

const GenerateMemeImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The found crypto meme image as a data URI."
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
      You are a Meme Curator AI. Your task is to find a popular, high-quality, existing meme from the web that is a perfect visual match for the provided joke.

      **CRITICAL RULES:**
      1.  **Find, Don't Create**: You MUST find a real, well-known meme image. Do NOT generate a new image or add any text yourself.
      2.  **Relevance is Key**: The meme's content, characters, and emotion MUST directly relate to the topic and tone of the joke: "${input.joke}".
      3.  **High Quality**: The image must be clear and high-resolution. Avoid blurry, pixelated, or heavily watermarked images.
      4.  **Single Image**: The output must be a single, complete meme image.
    `;

    if (input.category === 'crypto memes') {
      prompt = `
        ${baseInstructions}
        **Category**: Cryptocurrency Memes
        **Joke Context**: "${input.joke}"
        **Meme Examples to Look For**: "Buy the dip," "Rugpull," "HODL," Satoshi, Wojak, Pepe traders, Elon Musk, or NFT-related scenes. Find a meme that visually represents the joke's punchline.
        ${input.safeForWork ? 'The meme must be safe-for-work.' : 'You are in Degen Mode. The meme can be edgy or satirical.'}
      `;
    } else if (input.category === 'edgy memes') {
      prompt = `
        ${baseInstructions}
        **Category**: Edgy Internet Memes
        **Joke Context**: "${input.joke}"
        **Meme Examples to Look For**: Look for popular, trending internet meme formats like Wojak variants (e.g., Soyjak, Trad-wife), Chad vs. Virgin, Gru's Plan, Distracted Boyfriend, etc.
        ${input.safeForWork ? 'The meme must be safe-for-work.' : 'You are in Degen Mode. The template can include profanity or sensitive topics.'}
      `;
    }

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['IMAGE'],
      },
    });

    if (!media) {
      throw new Error('Image generation failed.');
    }
    
    return {imageDataUri: media.url};
  }
);
